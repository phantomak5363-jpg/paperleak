from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User, Paper, PaperStatus, AuditLog, SecurityAlert, AlertSeverity, AlertStatus, UserRole, Notification
from app.schemas.schemas import AdminDashboardStats, SecurityAlertOut, AuditLogOut, NotificationOut
from app.api.deps import require_roles, get_current_user

router = APIRouter(prefix="/admin", tags=["Admin Dashboard & System Monitoring"])

@router.get("/stats", response_model=AdminDashboardStats)
def get_admin_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    total_users = db.query(User).count()
    total_papers = db.query(Paper).count()

    submitted = db.query(Paper).filter(Paper.current_status == PaperStatus.SUBMITTED).count()
    under_review = db.query(Paper).filter(Paper.current_status == PaperStatus.UNDER_REVIEW).count()
    approved = db.query(Paper).filter(Paper.current_status == PaperStatus.APPROVED).count()
    rejected = db.query(Paper).filter(Paper.current_status == PaperStatus.REJECTED).count()
    scheduled = db.query(Paper).filter(Paper.current_status == PaperStatus.SCHEDULED).count()
    released = db.query(Paper).filter(Paper.current_status == PaperStatus.RELEASED).count()
    printed = db.query(Paper).filter(Paper.current_status == PaperStatus.PRINTED).count()

    total_logs = db.query(AuditLog).count()
    open_alerts = db.query(SecurityAlert).filter(SecurityAlert.status == AlertStatus.OPEN).count()
    critical_alerts = db.query(SecurityAlert).filter(
        SecurityAlert.severity == AlertSeverity.CRITICAL, SecurityAlert.status == AlertStatus.OPEN
    ).count()

    recent_alerts = db.query(SecurityAlert).order_by(SecurityAlert.created_at.desc()).limit(5).all()
    recent_logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(8).all()

    return AdminDashboardStats(
        total_users=total_users,
        total_papers=total_papers,
        submitted_papers=submitted,
        under_review_papers=under_review,
        approved_papers=approved,
        rejected_papers=rejected,
        scheduled_papers=scheduled,
        released_papers=released,
        printed_papers=printed,
        total_audit_events=total_logs,
        open_alerts_count=open_alerts,
        critical_alerts_count=critical_alerts,
        recent_alerts=[SecurityAlertOut.model_validate(a) for a in recent_alerts],
        recent_logs=[AuditLogOut.model_validate(l) for l in recent_logs]
    )

@router.get("/notifications", response_model=List[NotificationOut])
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(20).all()
