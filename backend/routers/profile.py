from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, timezone
from backend.database import get_db
from backend.security import get_current_user, verify_user_access
from backend.schemas.profile import (
    SpendingProfileResponse,
    SafeToSpendResponse,
    UserConstraint,
    UserConstraintCreate,
    UserConstraintUpdate,
)
from backend.services.profile_service import (
    calculate_spending_profile,
    calculate_true_safe_to_spend,
    list_user_constraints,
    create_user_constraint,
    update_user_constraint,
    delete_user_constraint,
)

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.get("", response_model=SpendingProfileResponse)
def get_user_spending_profile(
    user_id: Optional[str] = Query("default_user"),
    baseline_start: Optional[str] = None,
    baseline_end: Optional[str] = None,
    recent_start: Optional[str] = None,
    recent_end: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    target_user_id = verify_user_access(current_user, user_id)
    cursor = db.cursor()
    # If dates not supplied, find latest transaction date or use today
    if not recent_end:
        cursor.execute("SELECT MAX(transaction_date) FROM transactions WHERE user_id = ?", (target_user_id,))
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
        user_id=target_user_id,
        baseline_start=baseline_start,
        baseline_end=baseline_end,
        recent_start=recent_start,
        recent_end=recent_end,
        db=db
    )


@router.get("/safe-to-spend", response_model=SafeToSpendResponse)
def get_true_safe_to_spend(
    user_id: Optional[str] = Query("default_user"),
    raw_balance: Optional[float] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    target_user_id = verify_user_access(current_user, user_id)
    return calculate_true_safe_to_spend(target_user_id, db, raw_balance=raw_balance)


@router.get("/constraints", response_model=List[UserConstraint])
def get_constraints(
    user_id: Optional[str] = Query("default_user"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    target_user_id = verify_user_access(current_user, user_id)
    return list_user_constraints(target_user_id, db)


@router.post("/constraints", response_model=UserConstraint)
def add_constraint(
    payload: UserConstraintCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    target_user_id = verify_user_access(current_user, payload.user_id)
    payload.user_id = target_user_id
    return create_user_constraint(payload, db)


@router.patch("/constraints/{constraint_id}", response_model=UserConstraint)
def patch_constraint(
    constraint_id: str,
    payload: UserConstraintUpdate,
    user_id: Optional[str] = Query("default_user"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    target_user_id = verify_user_access(current_user, user_id)
    updated = update_user_constraint(constraint_id, target_user_id, payload.model_dump(exclude_unset=True), db)
    if not updated:
        raise HTTPException(status_code=404, detail="Constraint not found")
    return updated


@router.delete("/constraints/{constraint_id}")
def remove_constraint(
    constraint_id: str,
    user_id: Optional[str] = Query("default_user"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    target_user_id = verify_user_access(current_user, user_id)
    if not delete_user_constraint(constraint_id, target_user_id, db):
        raise HTTPException(status_code=404, detail="Constraint not found")
    return {"message": "Constraint deleted", "id": constraint_id}
