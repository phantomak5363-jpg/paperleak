from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr, ConfigDict
from app.db.models import UserRole, PaperStatus, AlertSeverity, AlertStatus

# Auth & User Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str
    role: UserRole
    full_name: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    role: UserRole
    department: Optional[str] = None

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: UserRole
    department: Optional[str] = None
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

    model_config = ConfigDict(from_attributes=True)

# Question Schemas
class QuestionCreate(BaseModel):
    exam_name: str
    paper_code: Optional[str] = None
    content: str
    marks: int
    subject: str
    department: str

class QuestionOut(BaseModel):
    id: int
    exam_name: str
    paper_code: Optional[str] = None
    content: str
    marks: int
    subject: str
    department: str
    created_by_id: int
    status: str
    created_at: datetime
    creator_name: Optional[str] = None
    decrypted_content: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# Paper Schemas
class PaperCreate(BaseModel):
    paper_code: str
    title: str
    subject: str
    department: str
    content: str  # Kept for backward compatibility, but now usually unused
    
class PaperGenerate(BaseModel):
    paper_code: str
    title: str
    subject: str
    department: str
    total_marks_target: Optional[int] = 100

class PaperUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    department: Optional[str] = None
    content: Optional[str] = None

class PaperOut(BaseModel):
    id: int
    paper_code: str
    title: str
    subject: str
    department: str
    created_by_id: int
    current_status: PaperStatus
    content_hash: str
    created_at: datetime
    updated_at: datetime
    creator_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class PaperDetailOut(PaperOut):
    decrypted_content: Optional[str] = None
    rejection_reason: Optional[str] = None
    denial_reason: Optional[str] = None
    scheduled_release_time: Optional[datetime] = None

# Review Schemas
class PaperReviewCreate(BaseModel):
    paper_id: int
    decision: str  # APPROVED or REJECTED
    rejection_reason: Optional[str] = None
    comments: Optional[str] = None

class PaperReviewOut(BaseModel):
    id: int
    paper_id: int
    reviewer_id: int
    decision: str
    rejection_reason: Optional[str] = None
    comments: Optional[str] = None
    reviewed_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Schedule Schemas
class PaperScheduleCreate(BaseModel):
    paper_id: int
    exam_date: str
    scheduled_release_time: datetime
    access_window_minutes: int = 180

class PaperScheduleOut(BaseModel):
    id: int
    paper_id: int
    scheduled_by_id: int
    exam_date: str
    scheduled_release_time: datetime
    access_window_minutes: int
    is_released: bool
    released_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Print/Access Request Schema
class PrintPaperRequest(BaseModel):
    paper_id: int
    verification_code: Optional[str] = None

# Audit Log Schema
class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    paper_id: Optional[int] = None
    result_status: str
    ip_address: Optional[str] = None
    device_info: Optional[str] = None
    risk_score: float
    denial_reason: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

# Security Alert Schema
class SecurityAlertOut(BaseModel):
    id: int
    alert_code: str
    title: str
    severity: AlertSeverity
    status: AlertStatus
    target_user_id: Optional[int] = None
    target_paper_id: Optional[int] = None
    anomaly_score: float
    trigger_reasons: List[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AlertStatusUpdate(BaseModel):
    status: AlertStatus

# Notification Schema
class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Dashboard Stats Schema
class AdminDashboardStats(BaseModel):
    total_users: int
    total_papers: int
    submitted_papers: int
    under_review_papers: int
    approved_papers: int
    rejected_papers: int
    scheduled_papers: int
    released_papers: int
    printed_papers: int
    total_audit_events: int
    open_alerts_count: int
    critical_alerts_count: int
    recent_alerts: List[SecurityAlertOut]
    recent_logs: List[AuditLogOut]
