import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from fastapi import Header, HTTPException, status, Depends
from backend.database import get_db

def get_jwt_secret() -> str:
    """
    Retrieves the JWT signing secret from environment.
    Strictly forbids insecure fallbacks in production or live cloud environments.
    """
    secret = os.getenv("JWT_SECRET")
    if not secret:
        app_env = os.getenv("APP_ENV", "development").lower()
        if app_env in ("production", "prod") or (os.getenv("RENDER") and not os.getenv("TESTING")):
            raise RuntimeError(
                "FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing in production environment. "
                "Application refused to start with an insecure default signing secret."
            )
        return "finsight_dev_test_signing_key_not_for_production_only"
    return secret

JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 72

def hash_password(password: str) -> tuple[str, str]:
    """Hashes a password using PBKDF2-HMAC-SHA256 with 100,000 iterations and a unique salt."""
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    return pwd_hash, salt

def verify_password(plain_password: str, stored_hash: str, salt: str) -> bool:
    """Verifies a password against the stored PBKDF2-HMAC-SHA256 hash using constant-time comparison."""
    if not stored_hash or not salt:
        return False
    computed = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    return hmac.compare_digest(computed, stored_hash)

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def _b64url_decode(data_str: str) -> bytes:
    padding = '=' * (4 - (len(data_str) % 4)) if len(data_str) % 4 != 0 else ''
    return base64.urlsafe_b64decode((data_str + padding).encode('utf-8'))

def create_access_token(user_id: str, email: str, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a cryptographically signed HMAC-SHA256 JWT access token."""
    now = int(time.time())
    expire = now + (int(expires_delta.total_seconds()) if expires_delta else TOKEN_EXPIRE_HOURS * 3600)
    
    header = {"alg": JWT_ALGORITHM, "typ": "JWT"}
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": expire
    }
    
    header_b64 = _b64url_encode(json.dumps(header, separators=(',', ':')).encode('utf-8'))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(',', ':')).encode('utf-8'))
    
    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(get_jwt_secret().encode('utf-8'), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(signature)
    
    return f"{header_b64}.{payload_b64}.{sig_b64}"

def decode_access_token(token: str) -> Dict[str, Any]:
    """Decodes and validates an HMAC-SHA256 JWT token. Raises HTTPException if tampered or expired."""
    parts = token.split('.')
    if len(parts) != 3:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token structure."
        )
    header_b64, payload_b64, sig_b64 = parts
    
    # Verify signature
    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    expected_sig = hmac.new(get_jwt_secret().encode('utf-8'), signing_input, hashlib.sha256).digest()
    actual_sig = _b64url_decode(sig_b64)
    
    if not hmac.compare_digest(expected_sig, actual_sig):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signature. Token may have been tampered with."
        )
    
    try:
        payload = json.loads(_b64url_decode(payload_b64).decode('utf-8'))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token payload."
        )
    
    # Check expiration
    now = int(time.time())
    if payload.get("exp", 0) < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again."
        )
    
    return payload

def get_current_user(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    db = Depends(get_db)
) -> Dict[str, Any]:
    """
    Reusable FastAPI dependency that extracts and authenticates the current user.
    Enforces token validation and retrieves the user record from the database.
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        # Handle demo token
        if token == "tok_demo_jordan_sandbox":
            return {"id": "default_user", "name": "Jordan Davis", "email": "jordan@finsight.local", "is_demo": True}
        
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject.")
        
        cursor = db.cursor()
        cursor.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
        return dict(user)
    
    # If no Bearer token provided, check if client is using the default_user demo sandbox
    target_id = x_user_id or "default_user"
    if target_id == "default_user":
        return {"id": "default_user", "name": "Jordan Davis", "email": "jordan@finsight.local", "is_demo": True}
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please provide a valid Bearer token."
    )

def verify_user_access(current_user: Dict[str, Any], requested_user_id: Optional[str]) -> str:
    """
    Strict ownership check. Prevents any user from reading or modifying another user's financial records.
    Returns the authorized user_id.
    """
    caller_id = current_user.get("id")
    if not caller_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthenticated.")
    
    # If caller is an authenticated user, but requested_user_id was omitted or defaulted to 'default_user',
    # safely scope to their own account.
    if requested_user_id in (None, "", "default_user") and caller_id != "default_user":
        return caller_id
    
    if requested_user_id and requested_user_id != caller_id:
        # If demo user requests someone else's data, or authenticated user requests someone else's data, strictly reject.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: You do not have permission to access user '{requested_user_id}' data."
        )
    return caller_id
