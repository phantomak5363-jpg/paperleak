from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import uuid
from sqlalchemy.orm import Session
from app.db.models import AuditLog, SecurityAlert, AlertSeverity, AlertStatus, User, Paper

def calculate_activity_risk(
    action: str,
    result_status: str,
    user_role: Optional[str],
    denial_reason: Optional[str] = None,
    current_time: Optional[datetime] = None,
    recent_events_count: int = 0
) -> (float, List[str]):
    """
    Rule-based scoring function that evaluates event risk based on security rules.
    Returns: (risk_score, list_of_trigger_flags)
    """
    if current_time is None:
        current_time = datetime.now(timezone.utc)
        
    score = 0.0
    reasons = []

    # Rule 1: Unauthorized / Denied paper access before release
    if result_status in ["DENIED", "FAILURE"]:
        score += 35.0
        reasons.append(f"Event failed/denied: {denial_reason or 'Unauthorized access attempt'}")
        if "Release time not reached" in (denial_reason or "") or "pre-release" in (denial_reason or "").lower():
            score += 40.0
            reasons.append("Critical: Attempted paper access prior to scheduled exam release time")

    # Rule 2: Failed login attempt
    if action == "LOGIN_FAILED":
        score += 25.0
        reasons.append("Failed authentication credential check")

    # Rule 3: Access during unusual off-working hours (11 PM - 5 AM local/UTC)
    hour = current_time.hour
    if hour >= 23 or hour < 5:
        score += 20.0
        reasons.append(f"Off-hours access detected at {current_time.strftime('%H:%M %Z')}")

    # Rule 4: Rapid repeat request rate
    if recent_events_count > 10:
        score += 25.0
        reasons.append(f"High activity frequency: {recent_events_count} requests in recent window")

    # Rule 5: Sensitive operations (Download / Print attempts)
    if action in ["PAPER_DOWNLOAD_ATTEMPT", "PAPER_PRINT_ATTEMPT"]:
        if result_status == "DENIED":
            score += 30.0
            reasons.append(f"Denied sensitive operation: {action}")

    # Cap score at 100
    final_score = min(100.0, score)
    return final_score, reasons

def log_audit_event(
    db: Session,
    action: str,
    result_status: str,
    user_id: Optional[int] = None,
    username: Optional[str] = None,
    user_role: Optional[str] = None,
    paper_id: Optional[int] = None,
    ip_address: str = "127.0.0.1",
    device_info: str = "Client Browser",
    denial_reason: Optional[str] = None,
    extra_metadata: Optional[Dict[str, Any]] = None
) -> AuditLog:
    """
    Records an immutable audit event and checks if a Security Alert should be triggered.
    """
    now = datetime.now(timezone.utc)
    
    # Calculate recent events by this user / IP in last 5 mins to detect bursts
    recent_count = db.query(AuditLog).filter(
        AuditLog.timestamp >= now - timedelta(minutes=5),
        (AuditLog.user_id == user_id) | (AuditLog.ip_address == ip_address)
    ).count()

    risk_score, trigger_reasons = calculate_activity_risk(
        action=action,
        result_status=result_status,
        user_role=user_role,
        denial_reason=denial_reason,
        current_time=now,
        recent_events_count=recent_count
    )

    audit_entry = AuditLog(
        user_id=user_id,
        username=username,
        user_role=user_role,
        action=action,
        paper_id=paper_id,
        result_status=result_status,
        ip_address=ip_address,
        device_info=device_info,
        risk_score=risk_score,
        denial_reason=denial_reason,
        extra_metadata=extra_metadata,
        timestamp=now
    )

    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)

    # Trigger security alert if risk score is high (>= 50)
    if risk_score >= 50.0:
        severity = AlertSeverity.CRITICAL if risk_score >= 80.0 else AlertSeverity.HIGH if risk_score >= 65.0 else AlertSeverity.MEDIUM
        
        # Check if active open alert already exists for user/paper to prevent alert spam
        existing_alert = db.query(SecurityAlert).filter(
            SecurityAlert.target_user_id == user_id,
            SecurityAlert.target_paper_id == paper_id,
            SecurityAlert.status == AlertStatus.OPEN
        ).first()

        if not existing_alert:
            alert_code = f"ALT-{uuid.uuid4().hex[:8].upper()}"
            alert = SecurityAlert(
                alert_code=alert_code,
                title=f"Suspicious Activity Detected: {action} ({result_status})",
                severity=severity,
                status=AlertStatus.OPEN,
                target_user_id=user_id,
                target_paper_id=paper_id,
                anomaly_score=risk_score,
                trigger_reasons=trigger_reasons,
                created_at=now
            )
            db.add(alert)
            db.commit()

    return audit_entry
