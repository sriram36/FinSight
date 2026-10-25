import hashlib
import hmac
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, Field
from backend.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_SALT = "finsight_sec_salt_2026_ledger_zero_drift"

def hash_password(password: str) -> str:
    return hmac.new(SECRET_SALT.encode(), password.encode(), hashlib.sha256).hexdigest()

def verify_password(plain_pwd: str, hashed_pwd: str) -> bool:
    return hmac.compare_digest(hash_password(plain_pwd), hashed_pwd)

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., pattern=r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')
    password: str = Field(..., min_length=6)

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    token: str

@router.post("/register", response_model=UserResponse)
def register(payload: RegisterRequest, db=Depends(get_db)):
    cursor = db.cursor()
    # Check if email exists
    cursor.execute("SELECT id FROM users WHERE email = ?", (payload.email,))
    if cursor.fetchone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    pwd_hash = hash_password(payload.password)
    now_iso = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
    INSERT INTO users (id, name, email, created_at)
    VALUES (?, ?, ?, ?)
    """, (user_id, payload.name, payload.email, now_iso))
    db.commit()

    token = f"tok_{uuid.uuid4().hex}_{user_id}"
    return UserResponse(
        id=user_id,
        name=payload.name,
        email=payload.email,
        token=token
    )

@router.post("/login", response_model=UserResponse)
def login(payload: LoginRequest, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT id, name, email FROM users WHERE email = ?", (payload.email,))
    user = cursor.fetchone()

    if not user:
        # Check if default demo user
        if payload.email == "jordan@finsight.local":
            return UserResponse(
                id="default_user",
                name="Jordan Davis",
                email="jordan@finsight.local",
                token="tok_demo_jordan_sandbox"
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    user_id = user["id"]
    token = f"tok_{uuid.uuid4().hex}_{user_id}"
    return UserResponse(
        id=user_id,
        name=user["name"],
        email=user["email"],
        token=token
    )

@router.get("/me")
def get_current_user_profile(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    db=Depends(get_db)
):
    target_id = x_user_id or "default_user"
    if authorization and authorization.startswith("Bearer tok_"):
        parts = authorization.split("_")
        if len(parts) >= 3:
            target_id = f"usr_{parts[-1]}"

    cursor = db.cursor()
    cursor.execute("SELECT id, name, email, created_at FROM users WHERE id = ?", (target_id,))
    user = cursor.fetchone()
    if not user:
        # Fallback to demo user
        return {
            "id": "default_user",
            "name": "Jordan Davis",
            "email": "jordan@finsight.local",
            "role": "sandbox_demo_user",
            "is_isolated": True
        }

    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "created_at": user["created_at"],
        "is_isolated": True
    }
