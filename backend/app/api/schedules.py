from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Paper, PaperSchedule, PaperStatus, UserRole, User, Notification
from app.schemas.schemas import PaperScheduleCreate, PaperScheduleOut
from app.api.deps import require_roles
from app.services.state_machine import is_valid_transition
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/schedules", tags=["Examination Controller Scheduling"])

@router.post("", response_model=PaperScheduleOut)
def schedule_paper(
    sched_in: PaperScheduleCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.EXAM_CONTROLLER, UserRole.ADMIN]))
):
    paper = db.query(Paper).filter(Paper.id == sched_in.paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    if paper.current_status != PaperStatus.APPROVED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot schedule paper in status '{paper.current_status.value}'. Paper must be APPROVED by Moderator first."
        )

    # Validate state transition
    valid, msg = is_valid_transition(paper.current_status, PaperStatus.SCHEDULED, current_user.role)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)

    # Convert naive datetime to timezone-aware UTC if needed
    release_time = sched_in.scheduled_release_time
    if release_time.tzinfo is None:
        release_time = release_time.replace(tzinfo=timezone.utc)

    # Check if schedule existing or new
    existing_sched = db.query(PaperSchedule).filter(PaperSchedule.paper_id == paper.id).first()
    if existing_sched:
        existing_sched.exam_date = sched_in.exam_date
        existing_sched.scheduled_release_time = release_time
        existing_sched.access_window_minutes = sched_in.access_window_minutes
        existing_sched.scheduled_by_id = current_user.id
        sched = existing_sched
    else:
        sched = PaperSchedule(
            paper_id=paper.id,
            scheduled_by_id=current_user.id,
            exam_date=sched_in.exam_date,
            scheduled_release_time=release_time,
            access_window_minutes=sched_in.access_window_minutes,
            is_released=False
        )
        db.add(sched)

    paper.current_status = PaperStatus.SCHEDULED
    db.commit()
    db.refresh(sched)

    ip_address = request.client.host if request.client else "127.0.0.1"
    log_audit_event(
        db=db,
        action="PAPER_SCHEDULED",
        result_status="SUCCESS",
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role),
        paper_id=paper.id,
        ip_address=ip_address,
        extra_metadata={"scheduled_release_time": release_time.isoformat()}
    )

    return sched

@router.post("/{paper_id}/release", response_model=PaperScheduleOut)
def release_paper_now(
    paper_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.EXAM_CONTROLLER, UserRole.ADMIN]))
):
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    now = datetime.now(timezone.utc)
    
    if not paper.schedule:
        sched = PaperSchedule(
            paper_id=paper.id,
            scheduled_by_id=current_user.id,
            exam_date=now.strftime("%Y-%m-%d"),
            scheduled_release_time=now,
            access_window_minutes=180,
            is_released=True,
            released_at=now
        )
        db.add(sched)
        paper.schedule = sched
    else:
        paper.schedule.is_released = True
        paper.schedule.released_at = now

    paper.current_status = PaperStatus.RELEASED
    db.commit()
    db.refresh(paper.schedule)

    # Send notification to Printing Staff
    printing_staff = db.query(User).filter(User.role == UserRole.PRINTING_STAFF).all()
    for ps in printing_staff:
        db.add(Notification(
            user_id=ps.id,
            title=f"Paper Released: {paper.paper_code}",
            message=f"Question paper '{paper.title}' is now officially RELEASED for authorized printing.",
            type="SCHEDULED"
        ))
    db.commit()

    ip_address = request.client.host if request.client else "127.0.0.1"
    log_audit_event(
        db=db,
        action="PAPER_RELEASED",
        result_status="SUCCESS",
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role),
        paper_id=paper.id,
        ip_address=ip_address
    )

    return paper.schedule
