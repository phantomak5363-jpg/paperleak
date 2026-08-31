from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import AuditLog, UserRole, User
from app.schemas.schemas import AuditLogOut
from app.api.deps import require_roles

router = APIRouter(prefix="/audit-logs", tags=["Audit Logging"])

@router.get("", response_model=List[AuditLogOut])
def get_audit_logs(
    user_id: Optional[int] = None,
    username: Optional[str] = None,
    role: Optional[str] = None,
    paper_id: Optional[int] = None,
    action: Optional[str] = None,
    result_status: Optional[str] = None,
    min_risk_score: Optional[float] = None,
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.EXAM_CONTROLLER]))
):
    query = db.query(AuditLog)

    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if username:
        query = query.filter(AuditLog.username.ilike(f"%{username}%"))
    if role:
        query = query.filter(AuditLog.user_role == role)
    if paper_id:
        query = query.filter(AuditLog.paper_id == paper_id)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if result_status:
        query = query.filter(AuditLog.result_status == result_status)
    if min_risk_score is not None:
        query = query.filter(AuditLog.risk_score >= min_risk_score)

    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return logs
