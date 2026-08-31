from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User
from app.core.security import verify_password, create_access_token
from app.schemas.schemas import Token, UserOut
from app.api.deps import get_current_user
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    ip_address = request.client.host if request.client else "127.0.0.1"
    device_info = request.headers.get("user-agent", "Unknown Client")

    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        # Log failed login attempt
        log_audit_event(
            db=db,
            action="LOGIN_FAILED",
            result_status="DENIED",
            user_id=user.id if user else None,
            username=form_data.username,
            user_role=user.role.value if user else "UNKNOWN",
            ip_address=ip_address,
            device_info=device_info,
            denial_reason="Invalid credentials"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        log_audit_event(
            db=db,
            action="LOGIN_BLOCKED_INACTIVE",
            result_status="DENIED",
            user_id=user.id,
            username=user.username,
            user_role=user.role.value,
            ip_address=ip_address,
            device_info=device_info,
            denial_reason="Account is deactivated"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact the administrator.",
        )

    # Log successful login
    log_audit_event(
        db=db,
        action="LOGIN_SUCCESS",
        result_status="SUCCESS",
        user_id=user.id,
        username=user.username,
        user_role=user.role.value,
        ip_address=ip_address,
        device_info=device_info
    )

    access_token = create_access_token(data={"sub": user.username, "role": user.role.value})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "role": user.role,
        "full_name": user.full_name
    }

@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
