from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.db.models import (
    PermissionRequest, RequestStatus, Paper, Notification,
    UserRole, User
)
from app.api.deps import get_current_user, require_roles
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/permission-requests", tags=["Permission Requests"])

# ── Schemas ──────────────────────────────────────────────────────────────────
class PermissionRequestCreate(BaseModel):
    paper_id: int
    reason: Optional[str] = None

class PermissionRequestResolve(BaseModel):
    decision: str        # "APPROVED" or "DENIED"
    admin_note: Optional[str] = None

class PermissionRequestOut(BaseModel):
    id: int
    paper_id: int
    paper_title: Optional[str] = None
    paper_code: Optional[str] = None
    requester_id: int
    requester_name: Optional[str] = None
    requester_role: Optional[str] = None
    reason: Optional[str] = None
    status: str
    admin_note: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ── Exam Controller: submit a request ────────────────────────────────────────
@router.post("", response_model=PermissionRequestOut)
def create_request(
    body: PermissionRequestCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.EXAM_CONTROLLER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only Exam Controllers can request paper access.")

    paper = db.query(Paper).filter(Paper.id == body.paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")

    # Check for an existing PENDING request for the same paper by same user
    existing = db.query(PermissionRequest).filter(
        PermissionRequest.requester_id == current_user.id,
        PermissionRequest.paper_id == body.paper_id,
        PermissionRequest.status == RequestStatus.PENDING
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending request for this paper.")

    pr = PermissionRequest(
        requester_id=current_user.id,
        paper_id=body.paper_id,
        reason=body.reason,
        status=RequestStatus.PENDING
    )
    db.add(pr)
    db.commit()
    db.refresh(pr)

    # Notify all admins
    admins = db.query(User).filter(User.role == UserRole.ADMIN, User.is_active == True).all()
    for admin in admins:
        db.add(Notification(
            user_id=admin.id,
            title="📋 Paper Access Request",
            message=f"{current_user.full_name} (Exam Controller) has requested access to paper '{paper.title}' ({paper.paper_code}). Reason: {body.reason or 'Not specified'}",
            type="ACCESS_REQUEST"
        ))
    db.commit()

    ip = request.client.host if request.client else "127.0.0.1"
    log_audit_event(db=db, action="PERMISSION_REQUEST_SUBMITTED", result_status="SUCCESS",
        user_id=current_user.id, username=current_user.username,
        user_role=current_user.role.value, paper_id=body.paper_id, ip_address=ip,
        extra_metadata={"request_id": pr.id})

    out = PermissionRequestOut.model_validate(pr)
    out.paper_title = paper.title
    out.paper_code = paper.paper_code
    out.requester_name = current_user.full_name
    out.requester_role = current_user.role.value
    return out

# ── Exam Controller: list own requests ───────────────────────────────────────
@router.get("/mine", response_model=List[PermissionRequestOut])
def my_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reqs = db.query(PermissionRequest).filter(
        PermissionRequest.requester_id == current_user.id
    ).order_by(PermissionRequest.created_at.desc()).all()
    result = []
    for r in reqs:
        out = PermissionRequestOut.model_validate(r)
        out.paper_title = r.paper.title if r.paper else None
        out.paper_code = r.paper.paper_code if r.paper else None
        out.requester_name = r.requester.full_name if r.requester else None
        out.requester_role = r.requester.role.value if r.requester else None
        result.append(out)
    return result

# ── Admin: list all pending requests ─────────────────────────────────────────
@router.get("", response_model=List[PermissionRequestOut])
def list_all_requests(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    query = db.query(PermissionRequest)
    if status_filter:
        query = query.filter(PermissionRequest.status == status_filter)
    reqs = query.order_by(PermissionRequest.created_at.desc()).all()
    result = []
    for r in reqs:
        out = PermissionRequestOut.model_validate(r)
        out.paper_title = r.paper.title if r.paper else None
        out.paper_code = r.paper.paper_code if r.paper else None
        out.requester_name = r.requester.full_name if r.requester else None
        out.requester_role = r.requester.role.value if r.requester else None
        result.append(out)
    return result

# ── Admin: approve or deny a request ─────────────────────────────────────────
@router.patch("/{request_id}", response_model=PermissionRequestOut)
def resolve_request(
    request_id: int,
    body: PermissionRequestResolve,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    decision = body.decision.upper()
    if decision not in ["APPROVED", "DENIED"]:
        raise HTTPException(status_code=400, detail="Decision must be APPROVED or DENIED.")

    pr = db.query(PermissionRequest).filter(PermissionRequest.id == request_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Permission request not found.")
    if pr.status != RequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="This request has already been resolved.")

    pr.status = RequestStatus.APPROVED if decision == "APPROVED" else RequestStatus.DENIED
    pr.admin_note = body.admin_note
    pr.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pr)

    # Notify the requester
    paper = pr.paper
    emoji = "✅" if decision == "APPROVED" else "❌"
    db.add(Notification(
        user_id=pr.requester_id,
        title=f"{emoji} Paper Access {decision.title()}",
        message=f"Your request to access '{paper.title}' has been {decision.lower()} by Admin {current_user.full_name}." + (f" Note: {body.admin_note}" if body.admin_note else ""),
        type="ACCESS_REQUEST"
    ))
    db.commit()

    ip = request.client.host if request.client else "127.0.0.1"
    log_audit_event(db=db, action=f"PERMISSION_REQUEST_{decision}", result_status="SUCCESS",
        user_id=current_user.id, username=current_user.username,
        user_role=current_user.role.value, paper_id=pr.paper_id, ip_address=ip,
        extra_metadata={"request_id": pr.id, "requester_id": pr.requester_id})

    out = PermissionRequestOut.model_validate(pr)
    out.paper_title = paper.title if paper else None
    out.paper_code = paper.paper_code if paper else None
    out.requester_name = pr.requester.full_name if pr.requester else None
    out.requester_role = pr.requester.role.value if pr.requester else None
    return out
