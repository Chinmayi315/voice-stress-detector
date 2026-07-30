"""
routers/auth_router.py
Register + login endpoints. Login returns a JWT the app must send on
every future request (in the Authorization: Bearer <token> header).
"""

import random
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User
from ..schemas.schemas import UserCreate, UserLogin, TokenResponse
from ..auth import hash_password, verify_password, create_access_token

from datetime import datetime, timedelta
from ..schemas.schemas import ForgotPasswordRequest, ResetPasswordRequest
from ..email_utils import send_reset_code_email

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user = User(email=user_data.email, hashed_password=hash_password(user_data.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token}


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token}

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    # Always return the same response whether or not the email exists,
    # so attackers can't use this to discover which emails are registered
    if user:
        code = "".join(random.choices(string.digits, k=6))
        user.reset_code_hash = hash_password(code)
        user.reset_code_expires = datetime.utcnow() + timedelta(minutes=15)
        db.commit()
        send_reset_code_email(user.email, code)

    return {"message": "If that email is registered, a reset code has been sent."}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    if (
        not user
        or not user.reset_code_hash
        or not user.reset_code_expires
        or datetime.utcnow() > user.reset_code_expires
        or not verify_password(payload.code, user.reset_code_hash)
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired reset code.")

    user.hashed_password = hash_password(payload.new_password)
    user.reset_code_hash = None
    user.reset_code_expires = None
    db.commit()

    return {"message": "Password reset successful. You can now log in."}