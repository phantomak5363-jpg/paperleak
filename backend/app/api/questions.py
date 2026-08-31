from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Question, QuestionStatus, UserRole, User
from app.schemas.schemas import QuestionCreate, QuestionOut
from app.core.security import encrypt_paper_content, decrypt_paper_content
from app.api.deps import get_current_user
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/questions", tags=["Questions"])

@router.post("", response_model=QuestionOut)
def create_question(
    question_in: QuestionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.PAPER_SETTER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only Paper Setters can upload questions.")

    encrypted_content = encrypt_paper_content(question_in.content)

    new_question = Question(
        exam_name=question_in.exam_name,
        paper_code=question_in.paper_code or "",
        content=encrypted_content,
        marks=question_in.marks,
        subject=question_in.subject,
        department=question_in.department,
        created_by_id=current_user.id,
        status=QuestionStatus.SUBMITTED
    )
    db.add(new_question)
    db.commit()
    db.refresh(new_question)

    ip_address = request.client.host if request.client else "127.0.0.1"
    log_audit_event(
        db=db,
        action="QUESTION_UPLOADED",
        result_status="SUCCESS",
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role.value,
        ip_address=ip_address,
        extra_metadata={"question_id": new_question.id, "marks": question_in.marks, "subject": question_in.subject, "exam_name": question_in.exam_name}
    )

    out = QuestionOut.model_validate(new_question)
    out.creator_name = current_user.full_name
    return out

@router.get("", response_model=List[QuestionOut])
def list_questions(
    subject: Optional[str] = None,
    exam_name: Optional[str] = None,
    status_filter: Optional[QuestionStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Question)

    # Paper setters only see their own; everyone else sees all
    if current_user.role == UserRole.PAPER_SETTER:
        query = query.filter(Question.created_by_id == current_user.id)
    # Moderators, Admins, Controllers can see all questions

    if subject:
        query = query.filter(Question.subject == subject)
    if exam_name:
        query = query.filter(Question.exam_name == exam_name)
    if status_filter:
        query = query.filter(Question.status == status_filter)

    questions = query.order_by(Question.exam_name.asc(), Question.created_at.desc()).all()
    
    res = []
    for q in questions:
        qo = QuestionOut.model_validate(q)
        qo.creator_name = q.creator.full_name if q.creator else "Unknown"
        # Moderators, Admins, and Controllers can see decrypted content; setters see their own
        if current_user.role in [UserRole.ADMIN, UserRole.EXAM_CONTROLLER, UserRole.MODERATOR] or q.created_by_id == current_user.id:
            qo.decrypted_content = decrypt_paper_content(q.content)
        res.append(qo)
    return res
