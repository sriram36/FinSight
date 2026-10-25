from fastapi import APIRouter, Depends, Query
from typing import Optional, Dict, Any
from backend.database import get_db
from backend.security import get_current_user, verify_user_access
from backend.services.review_service import generate_monthly_review

router = APIRouter(prefix="/review", tags=["review"])

@router.get("/monthly", response_model=Dict[str, Any])
def get_monthly_review(
    month: Optional[str] = Query(None, description="Month in YYYY-MM format"),
    user_id: Optional[str] = Query("default_user"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    target_user_id = verify_user_access(current_user, user_id)
    return generate_monthly_review(target_user_id, month, db)
