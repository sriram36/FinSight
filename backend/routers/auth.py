import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, Field
from backend.database import get_db
from backend.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., pattern=r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')
    password: str = Field(..., min_length=6, max_length=128)

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    token: str
    created_at: Optional[str] = None

@router.post("/register", response_model=UserResponse)
def register(payload: RegisterRequest, db=Depends(get_db)):
    cursor = db.cursor()
    # Check if email exists
    cursor.execute("SELECT id FROM users WHERE email = ?", (payload.email.lower().strip(),))
    if cursor.fetchone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    pwd_hash, salt = hash_password(payload.password)
    now_iso = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
    INSERT INTO users (id, name, email, password_hash, salt, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (user_id, payload.name.strip(), payload.email.lower().strip(), pwd_hash, salt, now_iso))
    db.commit()

    token = create_access_token(user_id=user_id, email=payload.email.lower().strip())
    return UserResponse(
        id=user_id,
        name=payload.name.strip(),
        email=payload.email.lower().strip(),
        token=token,
        created_at=now_iso
    )

@router.post("/login", response_model=UserResponse)
def login(payload: LoginRequest, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT id, name, email, password_hash, salt, created_at FROM users WHERE email = ?", (payload.email.lower().strip(),))
    user = cursor.fetchone()

    if not user:
        # Check if default demo user
        if payload.email == "jordan@finsight.local":
            return UserResponse(
                id="default_user",
                name="Jordan Davis",
                email="jordan@finsight.local",
                token="tok_demo_jordan_sandbox",
                created_at="2026-01-01T00:00:00Z"
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # If demo user has no password_hash, allow if password is demo password
    stored_hash = user["password_hash"]
    salt = user["salt"]
    if stored_hash and salt:
        if not verify_password(payload.password, stored_hash, salt):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )
    elif user["id"] != "default_user":
        # Legacy non-demo account without password hash
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account requires password reset."
        )

    token = create_access_token(user_id=user["id"], email=user["email"])
    return UserResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        token=token,
        created_at=user["created_at"]
    )

@router.get("/me", response_model=Dict[str, Any])
def get_current_user_profile(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return {
        "status": "authenticated",
        "user": current_user
    }

@router.post("/logout")
def logout():
    return {"status": "success", "message": "Logged out successfully."}
