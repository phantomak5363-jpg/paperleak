from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import SecurityAlert, AlertStatus, UserRole, User
from app.schemas.schemas import SecurityAlertOut, AlertStatusUpdate
from app.api.deps import require_roles

router = APIRouter(prefix="/security-alerts", tags=["Security Monitoring & Alerts"])

@router.get("", response_model=List[SecurityAlertOut])
def get_security_alerts(
    status_filter: Optional[AlertStatus] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    query = db.query(SecurityAlert)
    if status_filter:
        query = query.filter(SecurityAlert.status == status_filter)

    alerts = query.order_by(SecurityAlert.created_at.desc()).limit(limit).all()
    return alerts

@router.put("/{alert_id}/status", response_model=SecurityAlertOut)
def update_alert_status(
    alert_id: int,
    status_in: AlertStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    alert = db.query(SecurityAlert).filter(SecurityAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Security alert not found")

    alert.status = status_in.status
    db.commit()
    db.refresh(alert)
    return alert
