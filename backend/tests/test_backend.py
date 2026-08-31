import sys
import os
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.db.database import Base, engine, SessionLocal
from app.core.security import encrypt_paper_content, decrypt_paper_content, compute_sha256_hash, get_password_hash
from app.db.models import User, UserRole, Paper, PaperStatus, PaperSchedule

# Ensure tables exist on app's database engine
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_encryption_decryption_integrity():
    original_text = "Q1. Explain machine learning anomaly detection for paper leak prevention. (10 marks)"
    encrypted = encrypt_paper_content(original_text)
    assert encrypted != original_text
    decrypted = decrypt_paper_content(encrypted)
    assert decrypted == original_text
    
    hash1 = compute_sha256_hash(original_text)
    hash2 = compute_sha256_hash(original_text)
    assert hash1 == hash2

def test_user_seed_and_auth():
    db = SessionLocal()
    # Check if admin_test exists or create
    user = db.query(User).filter(User.username == "admin_test").first()
    if not user:
        user = User(
            username="admin_test",
            email="admin_test@secureexam.edu",
            hashed_password=get_password_hash("password123"),
            role=UserRole.ADMIN,
            full_name="System Administrator",
            is_active=True
        )
        db.add(user)
        db.commit()

    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin_test", "password": "password123"}
    )
    assert response.status_code == 200
    json_data = response.json()
    assert "access_token" in json_data
    assert json_data["role"] == "ADMIN"
    db.close()

def test_paper_state_machine_and_release_time_restriction():
    db = SessionLocal()
    
    # Create Setter & Printing Staff if not exists
    setter = db.query(User).filter(User.username == "setter_test").first()
    if not setter:
        setter = User(username="setter_test", email="s@test.com", hashed_password=get_password_hash("pass"), role=UserRole.PAPER_SETTER, full_name="Setter T", is_active=True)
        db.add(setter)

    printer = db.query(User).filter(User.username == "printer_test").first()
    if not printer:
        printer = User(username="printer_test", email="p@test.com", hashed_password=get_password_hash("pass"), role=UserRole.PRINTING_STAFF, full_name="Printer T", is_active=True)
        db.add(printer)
    db.commit()

    # Create paper in SCHEDULED status in future (2 hours from now)
    p = db.query(Paper).filter(Paper.paper_code == "CS-2026-TEST").first()
    future_time = datetime.now(timezone.utc) + timedelta(hours=2)
    
    if not p:
        p = Paper(
            paper_code="CS-2026-TEST",
            title="Computer Science Exam",
            subject="Cybersecurity",
            department="Computer Science",
            created_by_id=setter.id,
            current_status=PaperStatus.SCHEDULED,
            encrypted_content=encrypt_paper_content("Secret Questions"),
            content_hash=compute_sha256_hash("Secret Questions")
        )
        db.add(p)
        db.commit()

        sched = PaperSchedule(
            paper_id=p.id,
            scheduled_by_id=setter.id,
            exam_date="2026-08-28",
            scheduled_release_time=future_time,
            is_released=False
        )
        db.add(sched)
        db.commit()
    else:
        p.schedule.scheduled_release_time = future_time
        p.current_status = PaperStatus.SCHEDULED
        db.commit()

    # Printer login
    printer_token = client.post("/api/v1/auth/login", data={"username": "printer_test", "password": "pass"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {printer_token}"}

    # Attempt access BEFORE release time -> MUST fail with 403
    res_early = client.post("/api/v1/printing/verify-and-access", json={"paper_id": p.id}, headers=headers)
    assert res_early.status_code == 403
    assert "Release time has not been reached" in res_early.json()["detail"]

    # Fast-forward scheduled release time to past
    p.schedule.scheduled_release_time = datetime.now(timezone.utc) - timedelta(minutes=5)
    db.commit()

    # Attempt access AFTER release time -> MUST succeed
    res_time = client.post("/api/v1/printing/verify-and-access", json={"paper_id": p.id}, headers=headers)
    assert res_time.status_code == 200
    assert res_time.json()["decrypted_content"] == "Secret Questions"
    assert res_time.json()["current_status"] == "PRINTED"
    db.close()
