from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Paper, PaperVersion, PaperStatus, UserRole, User, PaperReview, PaperSchedule, Question, QuestionStatus
from app.schemas.schemas import PaperCreate, PaperUpdate, PaperOut, PaperDetailOut, PaperGenerate
import random
from app.core.security import encrypt_paper_content, decrypt_paper_content, compute_sha256_hash
from app.api.deps import get_current_user
from app.services.state_machine import is_valid_transition
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/papers", tags=["Question Papers"])

@router.post("", response_model=PaperOut)
def create_paper(
    paper_in: PaperCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.PAPER_SETTER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only Paper Setters can upload question papers.")

    existing = db.query(Paper).filter(Paper.paper_code == paper_in.paper_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Paper code already exists.")

    encrypted_content = encrypt_paper_content(paper_in.content)
    content_hash = compute_sha256_hash(paper_in.content)

    new_paper = Paper(
        paper_code=paper_in.paper_code,
        title=paper_in.title,
        subject=paper_in.subject,
        department=paper_in.department,
        created_by_id=current_user.id,
        current_status=PaperStatus.SUBMITTED, # Default to SUBMITTED upon preparation
        encrypted_content=encrypted_content,
        content_hash=content_hash
    )
    db.add(new_paper)
    db.commit()
    db.refresh(new_paper)

    # Save initial version
    v1 = PaperVersion(
        paper_id=new_paper.id,
        version_number=1,
        encrypted_content=encrypted_content,
        changes_summary="Initial paper upload and encrypt."
    )
    db.add(v1)
    db.commit()

    ip_address = request.client.host if request.client else "127.0.0.1"
    log_audit_event(
        db=db,
        action="PAPER_UPLOADED",
        result_status="SUCCESS",
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role.value,
        paper_id=new_paper.id,
        ip_address=ip_address
    )

    out = PaperOut.model_validate(new_paper)
    out.creator_name = current_user.full_name
    return out

@router.post("/generate", response_model=PaperOut)
def generate_paper_from_questions(
    paper_in: PaperGenerate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.EXAM_CONTROLLER]:
        raise HTTPException(status_code=403, detail="Only Admins or Exam Controllers can generate a paper from the question bank.")

    existing = db.query(Paper).filter(Paper.paper_code == paper_in.paper_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Paper code already exists.")

    # Fetch all submitted questions for this subject (we can filter by SUBMITTED/APPROVED based on QuestionStatus if needed)
    questions = db.query(Question).filter(Question.subject == paper_in.subject).all()
    if not questions:
        raise HTTPException(status_code=400, detail="No questions found for this subject in the question bank.")

    # In a real implementation, you might select a subset of questions that sum to `total_marks_target`.
    # For now, we use all questions found.
    selected_questions = [decrypt_paper_content(q.content) for q in questions]

    # Generate 4 Sets (A, B, C, D) by shuffling
    compiled_content = f"--- EXAM PAPER: {paper_in.title} ---\n\n"
    sets = ['A', 'B', 'C', 'D']
    
    for s in sets:
        shuffled = selected_questions[:]
        random.shuffle(shuffled)
        compiled_content += f"==================== SET {s} ====================\n\n"
        for i, q in enumerate(shuffled, 1):
            compiled_content += f"Q{i}. {q}\n\n"
    
    encrypted_content = encrypt_paper_content(compiled_content)
    content_hash = compute_sha256_hash(compiled_content)

    new_paper = Paper(
        paper_code=paper_in.paper_code,
        title=paper_in.title,
        subject=paper_in.subject,
        department=paper_in.department,
        created_by_id=current_user.id,
        current_status=PaperStatus.SUBMITTED, # Goes to moderation next
        encrypted_content=encrypted_content,
        content_hash=content_hash
    )
    db.add(new_paper)
    db.commit()
    db.refresh(new_paper)

    v1 = PaperVersion(
        paper_id=new_paper.id,
        version_number=1,
        encrypted_content=encrypted_content,
        changes_summary="Generated automatically from question bank (Sets A, B, C, D)."
    )
    db.add(v1)
    db.commit()

    ip_address = request.client.host if request.client else "127.0.0.1"
    log_audit_event(
        db=db,
        action="PAPER_GENERATED",
        result_status="SUCCESS",
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role.value,
        paper_id=new_paper.id,
        ip_address=ip_address,
        extra_metadata={"sets_generated": len(sets), "questions_used": len(selected_questions)}
    )

    out = PaperOut.model_validate(new_paper)
    out.creator_name = current_user.full_name
    return out

@router.post("/{paper_id}/reshuffle", response_model=PaperOut)
def reshuffle_paper(
    paper_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.MODERATOR:
        raise HTTPException(status_code=403, detail="Only Moderators can reshuffle papers.")

    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    if paper.current_status not in [PaperStatus.SUBMITTED, PaperStatus.UNDER_REVIEW]:
        raise HTTPException(status_code=400, detail="Paper can only be reshuffled while under review.")

    questions = db.query(Question).filter(Question.subject == paper.subject).all()
    if not questions:
        raise HTTPException(status_code=400, detail="No questions found to reshuffle.")

    selected_questions = [decrypt_paper_content(q.content) for q in questions]

    compiled_content = f"--- EXAM PAPER: {paper.title} ---\n\n"
    sets = ['A', 'B', 'C', 'D']
    for s in sets:
        shuffled = selected_questions[:]
        random.shuffle(shuffled)
        compiled_content += f"==================== SET {s} ====================\n\n"
        for i, q in enumerate(shuffled, 1):
            compiled_content += f"Q{i}. {q}\n\n"
    
    encrypted_content = encrypt_paper_content(compiled_content)
    content_hash = compute_sha256_hash(compiled_content)

    paper.encrypted_content = encrypted_content
    paper.content_hash = content_hash
    paper.updated_at = datetime.now(timezone.utc)

    ver_count = db.query(PaperVersion).filter(PaperVersion.paper_id == paper.id).count()
    v = PaperVersion(
        paper_id=paper.id,
        version_number=ver_count + 1,
        encrypted_content=encrypted_content,
        changes_summary="Paper randomly reshuffled by Moderator."
    )
    db.add(v)
    db.commit()
    db.refresh(paper)

    ip_address = request.client.host if request.client else "127.0.0.1"
    log_audit_event(
        db=db,
        action="PAPER_RESHUFFLED",
        result_status="SUCCESS",
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role.value,
        paper_id=paper.id,
        ip_address=ip_address
    )

    out = PaperOut.model_validate(paper)
    out.creator_name = paper.creator.full_name if paper.creator else "Unknown"
    return out


@router.get("", response_model=List[PaperOut])
def list_papers(
    status_filter: Optional[PaperStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Paper)

    # Scope results based on role permissions
    if current_user.role == UserRole.PAPER_SETTER:
        query = query.filter(Paper.created_by_id == current_user.id)
    elif current_user.role == UserRole.MODERATOR:
        # Moderator sees papers submitted, under review, approved, or rejected
        query = query.filter(Paper.current_status.in_([PaperStatus.SUBMITTED, PaperStatus.UNDER_REVIEW, PaperStatus.APPROVED, PaperStatus.REJECTED]))
    elif current_user.role == UserRole.EXAM_CONTROLLER:
        # Controller sees approved, scheduled, released, printed papers
        query = query.filter(Paper.current_status.in_([PaperStatus.APPROVED, PaperStatus.SCHEDULED, PaperStatus.RELEASED, PaperStatus.PRINTED]))
    elif current_user.role == UserRole.PRINTING_STAFF:
        # Printing staff sees released papers
        query = query.filter(Paper.current_status.in_([PaperStatus.RELEASED, PaperStatus.PRINTED]))

    if status_filter:
        query = query.filter(Paper.current_status == status_filter)

    papers = query.order_by(Paper.updated_at.desc()).all()
    
    res = []
    for p in papers:
        po = PaperOut.model_validate(p)
        po.creator_name = p.creator.full_name if p.creator else "Unknown"
        res.append(po)
    return res

@router.get("/{paper_id}", response_model=PaperDetailOut)
def get_paper_details(
    paper_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    ip_address = request.client.host if request.client else "127.0.0.1"
    device_info = request.headers.get("user-agent", "Unknown Client")

    # Access control verification
    can_decrypt = False
    denial_reason = None

    if current_user.role == UserRole.ADMIN:
        can_decrypt = True
    elif current_user.role == UserRole.PAPER_SETTER and paper.created_by_id == current_user.id:
        can_decrypt = True
    elif current_user.role == UserRole.MODERATOR and paper.current_status in [PaperStatus.SUBMITTED, PaperStatus.UNDER_REVIEW]:
        can_decrypt = True
    elif current_user.role == UserRole.EXAM_CONTROLLER and paper.current_status in [PaperStatus.APPROVED, PaperStatus.SCHEDULED, PaperStatus.RELEASED]:
        can_decrypt = True
    elif current_user.role == UserRole.PRINTING_STAFF:
        # Printing staff can access decrypted content for printing if paper is RELEASED or PRINTED
        if paper.current_status in [PaperStatus.RELEASED, PaperStatus.PRINTED]:
            if paper.schedule and paper.current_status == PaperStatus.SCHEDULED:
                now = datetime.now(timezone.utc)
                sched_time = paper.schedule.scheduled_release_time
                if sched_time.tzinfo is None:
                    sched_time = sched_time.replace(tzinfo=timezone.utc)
                
                if now >= sched_time:
                    can_decrypt = True
                else:
                    denial_reason = f"Release time not reached. Scheduled: {sched_time.isoformat()}"
            else:
                can_decrypt = True
        else:
            denial_reason = f"Paper status is {paper.current_status.value}, not RELEASED or PRINTED."
    else:
        denial_reason = f"Role {current_user.role.value} is not authorized to inspect paper {paper.paper_code} at status {paper.current_status.value}."

    if not can_decrypt:
        log_audit_event(
            db=db,
            action="PAPER_ACCESS_ATTEMPT",
            result_status="DENIED",
            user_id=current_user.id,
            username=current_user.username,
            user_role=current_user.role.value,
            paper_id=paper.id,
            ip_address=ip_address,
            device_info=device_info,
            denial_reason=denial_reason
        )
        # We still return metadata if authorized to view listed paper, but WITHOUT decrypted_content
        detail = PaperDetailOut.model_validate(paper)
        detail.creator_name = paper.creator.full_name if paper.creator else "Unknown"
        detail.denial_reason = denial_reason
        return detail

    # Granted access
    log_audit_event(
        db=db,
        action="PAPER_VIEWED",
        result_status="SUCCESS",
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role.value,
        paper_id=paper.id,
        ip_address=ip_address,
        device_info=device_info
    )

    detail = PaperDetailOut.model_validate(paper)
    detail.creator_name = paper.creator.full_name if paper.creator else "Unknown"
    detail.decrypted_content = decrypt_paper_content(paper.encrypted_content)
    
    # Fetch last rejection reason if available
    last_review = db.query(PaperReview).filter(
        PaperReview.paper_id == paper.id, PaperReview.decision == "REJECTED"
    ).order_by(PaperReview.reviewed_at.desc()).first()
    if last_review:
        detail.rejection_reason = last_review.rejection_reason

    if paper.schedule:
        detail.scheduled_release_time = paper.schedule.scheduled_release_time

    return detail

@router.put("/{paper_id}", response_model=PaperOut)
def update_and_resubmit_paper(
    paper_id: int,
    paper_in: PaperUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    if paper.created_by_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only the paper setter who created this paper can revise it.")

    # Paper can only be edited if in DRAFT or REJECTED state
    if paper.current_status not in [PaperStatus.DRAFT, PaperStatus.REJECTED]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot edit paper when status is {paper.current_status.value}. Editing is only permitted for REJECTED or DRAFT papers."
        )

    if paper_in.title:
        paper.title = paper_in.title
    if paper_in.subject:
        paper.subject = paper_in.subject
    if paper_in.department:
        paper.department = paper_in.department
    
    if paper_in.content:
        encrypted_content = encrypt_paper_content(paper_in.content)
        paper.encrypted_content = encrypted_content
        paper.content_hash = compute_sha256_hash(paper_in.content)

        # Version bump
        ver_count = db.query(PaperVersion).filter(PaperVersion.paper_id == paper.id).count()
        v = PaperVersion(
            paper_id=paper.id,
            version_number=ver_count + 1,
            encrypted_content=encrypted_content,
            changes_summary="Revised and resubmitted by Paper Setter."
        )
        db.add(v)

    # Transition status back to SUBMITTED for re-review
    paper.current_status = PaperStatus.SUBMITTED
    paper.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(paper)

    ip_address = request.client.host if request.client else "127.0.0.1"
    log_audit_event(
        db=db,
        action="PAPER_RESUBMITTED",
        result_status="SUCCESS",
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role.value,
        paper_id=paper.id,
        ip_address=ip_address
    )

    out = PaperOut.model_validate(paper)
    out.creator_name = current_user.full_name
    return out
