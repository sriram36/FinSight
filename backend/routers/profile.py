from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime, timedelta, timezone
from backend.database import get_db
from backend.schemas.profile import SpendingProfileResponse
from backend.services.profile_service import calculate_spending_profile

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.get("", response_model=SpendingProfileResponse)
def get_user_spending_profile(
    user_id: str = "default_user",
    baseline_start: Optional[str] = None,
    baseline_end: Optional[str] = None,
    recent_start: Optional[str] = None,
    recent_end: Optional[str] = None,
    db=Depends(get_db)
):
    cursor = db.cursor()
    # If dates not supplied, find latest transaction date or use today
    if not recent_end:
        cursor.execute("SELECT MAX(transaction_date) FROM transactions WHERE user_id = ?", (user_id,))
        max_date_row = cursor.fetchone()
        if max_date_row and max_date_row[0]:
            r_end = datetime.strptime(max_date_row[0][:10], "%Y-%m-%d")
        else:
            r_end = datetime.now(timezone.utc)
        recent_end = r_end.strftime("%Y-%m-%d")

    r_end_dt = datetime.strptime(recent_end[:10], "%Y-%m-%d")

    if not recent_start:
        recent_start = (r_end_dt - timedelta(days=29)).strftime("%Y-%m-%d")

    r_start_dt = datetime.strptime(recent_start[:10], "%Y-%m-%d")

    if not baseline_end:
        baseline_end = (r_start_dt - timedelta(days=1)).strftime("%Y-%m-%d")

    b_end_dt = datetime.strptime(baseline_end[:10], "%Y-%m-%d")

    if not baseline_start:
        baseline_start = (b_end_dt - timedelta(days=89)).strftime("%Y-%m-%d")

    return calculate_spending_profile(
        user_id=user_id,
        baseline_start=baseline_start,
        baseline_end=baseline_end,
        recent_start=recent_start,
        recent_end=recent_end,
        db=db
    )
