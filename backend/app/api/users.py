from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User, UserRole
from app.schemas.schemas import UserCreate, UserOut
from app.core.security import get_password_hash
from app.api.deps import require_roles
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/users", tags=["Users Management"])

@router.get("", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    return db.query(User).all()

@router.post("", response_model=UserOut)
def create_user(
    user_in: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    existing = db.query(User).filter((User.username == user_in.username) | (User.email == user_in.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or Email already registered")

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        full_name=user_in.full_name,
        department=user_in.department,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    ip_address = request.client.host if request.client else "127.0.0.1"
    log_audit_event(
        db=db,
        action="USER_CREATED",
        result_status="SUCCESS",
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role.value,
        ip_address=ip_address,
        extra_metadata={"created_user_id": new_user.id, "created_username": new_user.username, "role": new_user.role.value}
    )

    return new_user

@router.patch("/{user_id}/toggle-active", response_model=UserOut)
def toggle_user_active(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account.")

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)

    action = "USER_ACTIVATED" if user.is_active else "USER_DEACTIVATED"
    ip_address = request.client.host if request.client else "127.0.0.1"
    log_audit_event(
        db=db, action=action, result_status="SUCCESS",
        user_id=current_user.id, username=current_user.username,
        user_role=current_user.role.value, ip_address=ip_address,
        extra_metadata={"target_user_id": user.id, "target_username": user.username}
    )
    return user

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")

    username = user.username
    db.delete(user)
    db.commit()

    ip_address = request.client.host if request.client else "127.0.0.1"
    log_audit_event(
        db=db, action="USER_DELETED", result_status="SUCCESS",
        user_id=current_user.id, username=current_user.username,
        user_role=current_user.role.value, ip_address=ip_address,
        extra_metadata={"deleted_username": username, "deleted_user_id": user_id}
    )
    return {"detail": f"User '{username}' deleted successfully."}
