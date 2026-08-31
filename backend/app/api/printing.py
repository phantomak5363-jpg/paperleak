from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Paper, PaperStatus, UserRole, User, PaperAccessLog
from app.schemas.schemas import PrintPaperRequest, PaperDetailOut
from app.core.security import decrypt_paper_content
from app.api.deps import require_roles
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/printing", tags=["Authorized Printing Portal"])

@router.post("/verify-and-access", response_model=PaperDetailOut)
def verify_and_access_for_printing(
    req_in: PrintPaperRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.PRINTING_STAFF, UserRole.ADMIN]))
):
    ip_address = request.client.host if request.client else "127.0.0.1"
    device_info = request.headers.get("user-agent", "Printing Terminal")

    paper = db.query(Paper).filter(Paper.id == req_in.paper_id).first()
    if not paper:
        log_audit_event(
            db=db, action="PAPER_PRINT_ATTEMPT", result_status="DENIED",
            user_id=current_user.id, username=current_user.username,
            user_role=current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role),
            paper_id=req_in.paper_id, ip_address=ip_address, device_info=device_info,
            denial_reason="Paper ID not found in database"
        )
        raise HTTPException(status_code=404, detail="Paper not found")

    now = datetime.now(timezone.utc)

    # Gate 1: Must have a schedule
    if not paper.schedule:
        denial_reason = "Paper has not been scheduled for an examination release."
        log_access_and_audit(db, paper.id, current_user, "PRINT", False, denial_reason, ip_address, device_info)
        raise HTTPException(status_code=403, detail=denial_reason)

    # Gate 2: Time-release gatekeeper — check schedule time regardless of status
    # (Admin may have already set is_released=True, but the fundamental time check still applies)
    sched_time = paper.schedule.scheduled_release_time
    if sched_time.tzinfo is None:
        sched_time = sched_time.replace(tzinfo=timezone.utc)

    # Gate 3: Status check — accept RELEASED, PRINTED, or SCHEDULED when time has passed
    allowed_statuses = [PaperStatus.RELEASED, PaperStatus.PRINTED, PaperStatus.SCHEDULED]
    if paper.current_status not in allowed_statuses:
        denial_reason = f"Paper status is '{paper.current_status.value}' — not authorized for printing. Paper must be RELEASED."
        log_access_and_audit(db, paper.id, current_user, "PRINT", False, denial_reason, ip_address, device_info)
        raise HTTPException(status_code=403, detail=denial_reason)

    # Gate 4: Time gatekeeper — block if release time not yet reached (unless paper is already marked RELEASED by admin)
    is_already_released = paper.schedule.is_released or paper.current_status in [PaperStatus.RELEASED, PaperStatus.PRINTED]
    if now < sched_time and not is_already_released:
        denial_reason = f"Security Violation: Release time has not been reached yet! Scheduled: {sched_time.isoformat()}, Current: {now.isoformat()}"
        log_access_and_audit(db, paper.id, current_user, "PRINT", False, denial_reason, ip_address, device_info)
        raise HTTPException(status_code=403, detail=denial_reason)

    # Gate 5: AES decryption — update status to PRINTED
    paper.current_status = PaperStatus.PRINTED
    paper.updated_at = now
    if not paper.schedule.is_released:
        paper.schedule.is_released = True
        paper.schedule.released_at = now
    db.commit()

    # Log successful authorized print access
    log_access_and_audit(db, paper.id, current_user, "PRINT", True, None, ip_address, device_info)

    detail = PaperDetailOut.model_validate(paper)
    detail.creator_name = paper.creator.full_name if paper.creator else "Unknown"
    detail.decrypted_content = decrypt_paper_content(paper.encrypted_content)
    detail.scheduled_release_time = sched_time
    return detail

def log_access_and_audit(db: Session, paper_id: int, user: User, action_type: str, is_granted: bool, denial_reason: str, ip: str, device: str):
    pal = PaperAccessLog(
        paper_id=paper_id,
        user_id=user.id,
        action_type=action_type,
        is_granted=is_granted,
        denial_reason=denial_reason,
        ip_address=ip,
        device_info=device,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(pal)
    db.commit()

    log_audit_event(
        db=db,
        action="PAPER_PRINT_ATTEMPT" if not is_granted else "PAPER_PRINT_SUCCESS",
        result_status="SUCCESS" if is_granted else "DENIED",
        user_id=user.id,
        username=user.username,
        user_role=user.role.value if hasattr(user.role, 'value') else str(user.role),
        paper_id=paper_id,
        ip_address=ip,
        device_info=device,
        denial_reason=denial_reason
    )
