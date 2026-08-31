import os
import sys
from datetime import datetime, timezone, timedelta
import random

# Add current directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.db.database import engine, Base, SessionLocal
from app.db.models import (
    User, UserRole, Paper, PaperStatus, PaperVersion, PaperReview, PaperSchedule,
    PaperAccessLog, AuditLog, SecurityAlert, AlertSeverity, AlertStatus, Notification
)
from app.core.security import get_password_hash, encrypt_paper_content, compute_sha256_hash

def seed_database():
    print("Initializing Database Schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear existing data if any
    db.query(Notification).delete()
    db.query(SecurityAlert).delete()
    db.query(AuditLog).delete()
    db.query(PaperAccessLog).delete()
    db.query(PaperSchedule).delete()
    db.query(PaperReview).delete()
    db.query(PaperVersion).delete()
    db.query(Paper).delete()
    db.query(User).delete()
    db.commit()

    print("Creating Demo Users for All 5 Roles...")
    users_data = [
        {"username": "admin", "email": "admin@secureexam.edu", "password": "adminpassword123", "role": UserRole.ADMIN, "full_name": "Chief Security Administrator", "dept": "IT Security"},
        {"username": "paper_setter", "email": "setter@secureexam.edu", "password": "setterpassword123", "role": UserRole.PAPER_SETTER, "full_name": "Dr. Alan Turing", "dept": "Computer Science"},
        {"username": "setter2", "email": "setter2@secureexam.edu", "password": "setterpassword123", "role": UserRole.PAPER_SETTER, "full_name": "Dr. Claude Shannon", "dept": "Electrical Engineering"},
        {"username": "moderator", "email": "moderator@secureexam.edu", "password": "moderatorpassword123", "role": UserRole.MODERATOR, "full_name": "Prof. Grace Hopper", "dept": "Academic Review Board"},
        {"username": "controller", "email": "controller@secureexam.edu", "password": "controllerpassword123", "role": UserRole.EXAM_CONTROLLER, "full_name": "Dr. John von Neumann", "dept": "Controller of Examinations"},
        {"username": "printing_staff", "email": "printing@secureexam.edu", "password": "printingpassword123", "role": UserRole.PRINTING_STAFF, "full_name": "Staff Officer Marcus", "dept": "Secure Printing Press"},
    ]

    created_users = {}
    for u in users_data:
        user = User(
            username=u["username"],
            email=u["email"],
            hashed_password=get_password_hash(u["password"]),
            role=u["role"],
            full_name=u["full_name"],
            department=u["dept"],
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        created_users[u["username"]] = user

    print("Seeding Question Papers across State Machine Stages...")
    now = datetime.now(timezone.utc)

    # 1. Submitted Paper
    p1_content = """# Cryptography & Network Security - Final Exam 2026
Duration: 3 Hours | Max Marks: 100

Section A: Short Answer Questions (5 x 4 = 20 Marks)
Q1. Define AES-256 GCM authenticated encryption and explain Galois Counter Mode.
Q2. What is zero-knowledge proof (ZKP) in credential verification?
Q3. Explain the difference between symmetric cipher and public key infrastructure.
Q4. Describe replay attack prevention using cryptographic nonces and timestamps.
Q5. What is the role of key derivation functions (KDF) like PBKDF2 and Argon2?

Section B: Comprehensive Problems (4 x 20 = 80 Marks)
Q6. Explain RSA key pair generation with p=61, q=53. Compute public exponent e and private key d.
Q7. Analyze side-channel attacks against hardware cryptographic accelerators and describe masking countermeasures.
"""
    p1 = Paper(
        paper_code="CS-501-2026",
        title="Advanced Cryptography & Network Security",
        subject="Cryptography",
        department="Computer Science",
        created_by_id=created_users["paper_setter"].id,
        current_status=PaperStatus.SUBMITTED,
        encrypted_content=encrypt_paper_content(p1_content),
        content_hash=compute_sha256_hash(p1_content)
    )

    # 2. Approved & Scheduled Paper (Scheduled 30 mins in future)
    p2_content = """# Artificial Intelligence & Anomaly Detection - Mid Semester 2026
Duration: 2.5 Hours | Max Marks: 75

Q1. Formulate Isolation Forest algorithm for unsupervised outlier identification in high-dimensional audit logs.
Q2. Compare Random Forest vs Logistic Regression precision-recall trade-offs when dealing with severe class imbalance (1% anomalies).
Q3. Design an evasive adversary mitigation strategy for behavioral biometric verification systems.
"""
    p2 = Paper(
        paper_code="AI-602-2026",
        title="AI Anomaly Detection & Behavioral Analytics",
        subject="Artificial Intelligence",
        department="Computer Science",
        created_by_id=created_users["paper_setter"].id,
        current_status=PaperStatus.SCHEDULED,
        encrypted_content=encrypt_paper_content(p2_content),
        content_hash=compute_sha256_hash(p2_content)
    )

    # 3. Released Paper (Scheduled 10 mins ago, now active for printing)
    p3_content = """# Distributed Systems & Cloud Security - Final 2026
Duration: 3 Hours | Max Marks: 100

Q1. Explain Raft consensus algorithm leader election under network partitions.
Q2. How does Byzantine Fault Tolerance (BFT) guarantee safety under up to f malicious nodes out of 3f+1 total replicas?
"""
    p3 = Paper(
        paper_code="CS-703-2026",
        title="Distributed Systems & Cloud Infrastructure",
        subject="Distributed Systems",
        department="Computer Science",
        created_by_id=created_users["setter2"].id,
        current_status=PaperStatus.RELEASED,
        encrypted_content=encrypt_paper_content(p3_content),
        content_hash=compute_sha256_hash(p3_content)
    )

    # 4. Rejected Paper (Needs revision by Paper Setter)
    p4_content = """# Basic Programming Principles - Quiz 1
Q1. Write a Hello World program in C.
"""
    p4 = Paper(
        paper_code="CS-101-2026",
        title="Introductory Programming Principles",
        subject="Computer Science",
        department="Computer Science",
        created_by_id=created_users["paper_setter"].id,
        current_status=PaperStatus.REJECTED,
        encrypted_content=encrypt_paper_content(p4_content),
        content_hash=compute_sha256_hash(p4_content)
    )

    db.add_all([p1, p2, p3, p4])
    db.commit()

    # Add Review for Rejected Paper
    rev4 = PaperReview(
        paper_id=p4.id,
        reviewer_id=created_users["moderator"].id,
        decision="REJECTED",
        rejection_reason="Question paper depth is insufficient for end-semester assessment. Needs higher Bloom's taxonomy difficulty level.",
        comments="Please add algorithmic complexity problems and dynamic memory allocation questions."
    )
    db.add(rev4)

    # Add Schedule for p2 (Future) and p3 (Active)
    sched_p2 = PaperSchedule(
        paper_id=p2.id,
        scheduled_by_id=created_users["controller"].id,
        exam_date="2026-08-28",
        scheduled_release_time=now + timedelta(minutes=45),
        access_window_minutes=180,
        is_released=False
    )
    sched_p3 = PaperSchedule(
        paper_id=p3.id,
        scheduled_by_id=created_users["controller"].id,
        exam_date="2026-08-28",
        scheduled_release_time=now - timedelta(minutes=15),
        access_window_minutes=180,
        is_released=True,
        released_at=now - timedelta(minutes=15)
    )
    db.add_all([sched_p2, sched_p3])
    db.commit()

    print("Seeding Audit Logs & Security Alerts...")
    # Normal logs
    normal_logs = [
        AuditLog(user_id=created_users["paper_setter"].id, username="paper_setter", user_role="PAPER_SETTER", action="LOGIN_SUCCESS", result_status="SUCCESS", risk_score=0.0, timestamp=now - timedelta(hours=5)),
        AuditLog(user_id=created_users["paper_setter"].id, username="paper_setter", user_role="PAPER_SETTER", action="PAPER_UPLOADED", paper_id=p1.id, result_status="SUCCESS", risk_score=0.0, timestamp=now - timedelta(hours=4)),
        AuditLog(user_id=created_users["moderator"].id, username="moderator", user_role="MODERATOR", action="PAPER_APPROVED", paper_id=p2.id, result_status="SUCCESS", risk_score=0.0, timestamp=now - timedelta(hours=3)),
        AuditLog(user_id=created_users["controller"].id, username="controller", user_role="EXAM_CONTROLLER", action="PAPER_SCHEDULED", paper_id=p2.id, result_status="SUCCESS", risk_score=0.0, timestamp=now - timedelta(hours=2)),
    ]

    # Suspicious / Anomalous logs (simulating an unauthorized pre-release access attempt at 2:13 AM)
    suspicious_time = now - timedelta(hours=1, minutes=20)
    anomalous_logs = [
        AuditLog(
            user_id=created_users["printing_staff"].id,
            username="printing_staff",
            user_role="AUTHORIZED_PRINTING_STAFF",
            action="PAPER_ACCESS_ATTEMPT",
            paper_id=p2.id,
            result_status="DENIED",
            ip_address="192.168.1.104",
            device_info="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
            risk_score=95.0,
            denial_reason="Security Violation: Release time has not been reached yet! Scheduled: 45 minutes in future.",
            timestamp=suspicious_time
        ),
        AuditLog(
            user_id=created_users["printing_staff"].id,
            username="printing_staff",
            user_role="AUTHORIZED_PRINTING_STAFF",
            action="PAPER_PRINT_ATTEMPT",
            paper_id=p2.id,
            result_status="DENIED",
            ip_address="192.168.1.104",
            device_info="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
            risk_score=95.0,
            denial_reason="Unauthorized print attempt before paper status is RELEASED",
            timestamp=suspicious_time + timedelta(seconds=12)
        ),
    ]

    db.add_all(normal_logs + anomalous_logs)
    db.commit()

    # Security Alert
    alert = SecurityAlert(
        alert_code="ALT-98F1A2C3",
        title="Suspicious Activity Detected: Pre-Release Paper Access Attempt",
        severity=AlertSeverity.CRITICAL,
        status=AlertStatus.OPEN,
        target_user_id=created_users["printing_staff"].id,
        target_paper_id=p2.id,
        anomaly_score=95.0,
        trigger_reasons=[
            "Critical: Attempted paper access prior to scheduled exam release time",
            "Event failed/denied: Release time has not been reached yet!",
            "Off-hours access attempt detected during restricted time window"
        ],
        created_at=suspicious_time
    )
    db.add(alert)

    # Notification for setter
    notif = Notification(
        user_id=created_users["paper_setter"].id,
        title="Paper Review Update: CS-101-2026",
        message="Your paper 'Introductory Programming Principles' was REJECTED by Moderator Prof. Grace Hopper. Reason: Question paper depth is insufficient for end-semester assessment.",
        type="REJECTION",
        is_read=False
    )
    db.add(notif)
    db.commit()

    print("Seed Complete! Demo credentials ready:")
    print(" - Admin: admin / adminpassword123")
    print(" - Paper Setter: paper_setter / setterpassword123")
    print(" - Moderator: moderator / moderatorpassword123")
    print(" - Exam Controller: controller / controllerpassword123")
    print(" - Printing Staff: printing_staff / printingpassword123")

if __name__ == "__main__":
    seed_database()
