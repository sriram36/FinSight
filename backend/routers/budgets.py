from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List, Dict, Any
from backend.database import get_db
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
    user_id: str = Query("default_user"),
    month: Optional[str] = Query(None),
    db=Depends(get_db)
):
    return get_user_budgets(user_id, month, db)

@router.get("/summary", response_model=Dict[str, Any])
def budget_summary(
    user_id: str = Query("default_user"),
    month: Optional[str] = Query(None),
    db=Depends(get_db)
):
    return get_budget_summary(user_id, month, db)

@router.post("", response_model=Dict[str, Any])
def create_or_update_budget(
    payload: BudgetCreateRequest,
    db=Depends(get_db)
):
    return upsert_budget(payload, db)

@router.delete("/{budget_id}")
def delete_budget(
    budget_id: str,
    user_id: str = Query("default_user"),
    db=Depends(get_db)
):
    success = delete_user_budget(budget_id, user_id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Budget not found or unauthorized")
    return {"status": "success", "deleted_id": budget_id}
