import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Enum, Float, JSON
)
from sqlalchemy.orm import relationship
from app.db.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    PAPER_SETTER = "PAPER_SETTER"
    MODERATOR = "MODERATOR"
    EXAM_CONTROLLER = "EXAM_CONTROLLER"
    PRINTING_STAFF = "PRINTING_STAFF"

class PaperStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    REJECTED = "REJECTED"
    APPROVED = "APPROVED"
    SCHEDULED = "SCHEDULED"
    RELEASED = "RELEASED"
    PRINTED = "PRINTED"

class QuestionStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class AlertSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class AlertStatus(str, enum.Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.PAPER_SETTER)
    full_name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    papers_created = relationship("Paper", back_populates="creator", foreign_keys="Paper.created_by_id", cascade="all, delete-orphan")
    questions_created = relationship("Question", back_populates="creator", cascade="all, delete-orphan")
    reviews = relationship("PaperReview", back_populates="reviewer", cascade="all, delete-orphan")
    schedules = relationship("PaperSchedule", back_populates="scheduled_by", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    exam_name = Column(String(200), nullable=False, default="General Exam")
    paper_code = Column(String(50), nullable=True, default="")
    content = Column(Text, nullable=False)
    marks = Column(Integer, nullable=False)
    subject = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(QuestionStatus), nullable=False, default=QuestionStatus.SUBMITTED)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    creator = relationship("User", back_populates="questions_created")

class Paper(Base):
    __tablename__ = "papers"

    id = Column(Integer, primary_key=True, index=True)
    paper_code = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    subject = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    current_status = Column(Enum(PaperStatus), nullable=False, default=PaperStatus.DRAFT)
    encrypted_content = Column(Text, nullable=False)
    content_hash = Column(String(64), nullable=False) # SHA-256 integrity checksum
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    creator = relationship("User", back_populates="papers_created", foreign_keys=[created_by_id])
    versions = relationship("PaperVersion", back_populates="paper", cascade="all, delete-orphan")
    reviews = relationship("PaperReview", back_populates="paper", cascade="all, delete-orphan")
    schedule = relationship("PaperSchedule", back_populates="paper", uselist=False, cascade="all, delete-orphan")
    access_logs = relationship("PaperAccessLog", back_populates="paper", cascade="all, delete-orphan")

class PaperVersion(Base):
    __tablename__ = "paper_versions"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    encrypted_content = Column(Text, nullable=False)
    changes_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    paper = relationship("Paper", back_populates="versions")

class PaperReview(Base):
    __tablename__ = "paper_reviews"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    decision = Column(String(20), nullable=False) # APPROVED or REJECTED
    rejection_reason = Column(Text, nullable=True)
    comments = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    paper = relationship("Paper", back_populates="reviews")
    reviewer = relationship("User", back_populates="reviews")

class PaperSchedule(Base):
    __tablename__ = "paper_schedules"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id"), nullable=False, unique=True)
    scheduled_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    exam_date = Column(String(20), nullable=False) # e.g. YYYY-MM-DD
    scheduled_release_time = Column(DateTime, nullable=False)
    access_window_minutes = Column(Integer, default=180) # 3 hours default
    is_released = Column(Boolean, default=False)
    released_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    paper = relationship("Paper", back_populates="schedule")
    scheduled_by = relationship("User", back_populates="schedules")

class PaperAccessLog(Base):
    __tablename__ = "paper_access_logs"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action_type = Column(String(50), nullable=False) # VIEW, DOWNLOAD, PRINT, ATTEMPT_UNAUTHORIZED
    is_granted = Column(Boolean, nullable=False)
    denial_reason = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)
    device_info = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    paper = relationship("Paper", back_populates="access_logs")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String(50), nullable=True)
    user_role = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False)
    paper_id = Column(Integer, ForeignKey("papers.id"), nullable=True)
    result_status = Column(String(20), nullable=False) # SUCCESS, DENIED, FAILURE
    ip_address = Column(String(45), nullable=True)
    device_info = Column(String(255), nullable=True)
    risk_score = Column(Float, default=0.0)
    denial_reason = Column(Text, nullable=True)
    extra_metadata = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    user = relationship("User", back_populates="audit_logs")

class SecurityAlert(Base):
    __tablename__ = "security_alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_code = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    severity = Column(Enum(AlertSeverity), nullable=False, default=AlertSeverity.MEDIUM)
    status = Column(Enum(AlertStatus), nullable=False, default=AlertStatus.OPEN)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    target_paper_id = Column(Integer, ForeignKey("papers.id"), nullable=True)
    anomaly_score = Column(Float, nullable=False)
    trigger_reasons = Column(JSON, nullable=False) # List of detection flags
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), nullable=False) # REJECTION, APPROVAL, SCHEDULED, ALERT
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="notifications")

class MLExperiment(Base):
    __tablename__ = "ml_experiments"

    id = Column(Integer, primary_key=True, index=True)
    experiment_name = Column(String(100), nullable=False)
    model_name = Column(String(100), nullable=False)
    accuracy = Column(Float, nullable=False)
    precision = Column(Float, nullable=False)
    recall = Column(Float, nullable=False)
    f1_score = Column(Float, nullable=False)
    fpr = Column(Float, nullable=False)
    fnr = Column(Float, nullable=False)
    confusion_matrix_json = Column(JSON, nullable=False)
    metrics_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class RequestStatus(str, enum.Enum):
    PENDING  = "PENDING"
    APPROVED = "APPROVED"
    DENIED   = "DENIED"

class PermissionRequest(Base):
    __tablename__ = "permission_requests"

    id           = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    paper_id     = Column(Integer, ForeignKey("papers.id"), nullable=False)
    reason       = Column(Text, nullable=True)
    status       = Column(Enum(RequestStatus), nullable=False, default=RequestStatus.PENDING)
    admin_note   = Column(Text, nullable=True)
    created_at   = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at  = Column(DateTime, nullable=True)

    requester = relationship("User",  foreign_keys=[requester_id])
    paper     = relationship("Paper", foreign_keys=[paper_id])
