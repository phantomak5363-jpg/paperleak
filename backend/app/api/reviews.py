from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Paper, PaperReview, PaperStatus, UserRole, User, Notification
from app.schemas.schemas import PaperReviewCreate, PaperReviewOut
from app.api.deps import require_roles
from app.services.state_machine import is_valid_transition
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/reviews", tags=["Moderator Reviews"])

@router.post("", response_model=PaperReviewOut)
def review_paper(
    review_in: PaperReviewCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MODERATOR, UserRole.ADMIN]))
):
    paper = db.query(Paper).filter(Paper.id == review_in.paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    decision = review_in.decision.upper()
    if decision not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Decision must be APPROVED or REJECTED")

    target_status = PaperStatus.APPROVED if decision == "APPROVED" else PaperStatus.REJECTED

    if decision == "REJECTED" and not review_in.rejection_reason:
        raise HTTPException(status_code=400, detail="Rejection reason is mandatory when rejecting a question paper.")

    # Auto-transition SUBMITTED → UNDER_REVIEW before final decision
    if paper.current_status == PaperStatus.SUBMITTED:
        paper.current_status = PaperStatus.UNDER_REVIEW
        db.commit()

    # Validate state transition
    valid, msg = is_valid_transition(paper.current_status, target_status, current_user.role)
    if not valid:
        log_audit_event(
            db=db,
            action="ILLEGAL_STATE_TRANSITION_ATTEMPT",
            result_status="DENIED",
            user_id=current_user.id,
            username=current_user.username,
            user_role=current_user.role.value,
            paper_id=paper.id,
            denial_reason=msg
        )
        raise HTTPException(status_code=400, detail=msg)

    # Record review
    review = PaperReview(
        paper_id=paper.id,
        reviewer_id=current_user.id,
        decision=decision,
        rejection_reason=review_in.rejection_reason if decision == "REJECTED" else None,
        comments=review_in.comments
    )
    db.add(review)

    # Update paper status
    paper.current_status = target_status
    db.commit()
    db.refresh(paper)

    # Notify paper setter if rejected or approved
    notification = Notification(
        user_id=paper.created_by_id,
        title=f"Paper Review Update: {paper.paper_code}",
        message=f"Your paper '{paper.title}' was {decision} by Moderator {current_user.full_name}." + 
                (f" Reason: {review_in.rejection_reason}" if decision == "REJECTED" else " It is now ready for Examination Controller scheduling."),
        type="REJECTION" if decision == "REJECTED" else "APPROVAL"
    )
    db.add(notification)
    db.commit()

    ip_address = request.client.host if request.client else "127.0.0.1"
    log_audit_event(
        db=db,
        action=f"PAPER_{decision}",
        result_status="SUCCESS",
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role.value,
        paper_id=paper.id,
        ip_address=ip_address,
        denial_reason=review_in.rejection_reason if decision == "REJECTED" else None
    )

    return review
