from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List, Dict, Any
from backend.database import get_db
from backend.security import get_current_user, verify_user_access
from backend.services.budget_service import (
    BudgetCreateRequest,
    get_user_budgets,
    upsert_budget,
    delete_user_budget,
    get_budget_summary
)

router = APIRouter(prefix="/budgets", tags=["budgets"])

@router.get("", response_model=List[Dict[str, Any]])
def list_budgets(
    user_id: Optional[str] = Query("default_user"),
    month: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    target_user_id = verify_user_access(current_user, user_id)
    return get_user_budgets(target_user_id, month, db)

@router.get("/summary", response_model=Dict[str, Any])
def budget_summary(
    user_id: Optional[str] = Query("default_user"),
    month: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    target_user_id = verify_user_access(current_user, user_id)
    return get_budget_summary(target_user_id, month, db)

@router.post("", response_model=Dict[str, Any])
def create_or_update_budget(
    payload: BudgetCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    target_user_id = verify_user_access(current_user, payload.user_id)
    payload.user_id = target_user_id
    return upsert_budget(payload, db)

@router.delete("/{budget_id}")
def delete_budget(
    budget_id: str,
    user_id: Optional[str] = Query("default_user"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    target_user_id = verify_user_access(current_user, user_id)
    success = delete_user_budget(budget_id, target_user_id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Budget not found or unauthorized")
    return {"status": "success", "deleted_id": budget_id}
