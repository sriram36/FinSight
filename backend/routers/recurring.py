from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from backend.database import get_db
from backend.services.recurring_service import (
    detect_recurring_from_ledger,
    get_recurring_items,
    confirm_recurring_item,
    get_upcoming_schedule
)

router = APIRouter(prefix="/recurring", tags=["recurring"])

class ConfirmRecurringRequest(BaseModel):
    user_id: str = "default_user"
    is_confirmed: bool = True

@router.get("", response_model=List[Dict[str, Any]])
def list_recurring(
    user_id: str = Query("default_user"),
    db=Depends(get_db)
):
    items = get_recurring_items(user_id, db)
    if not items:
        # Auto-detect if empty
        items = detect_recurring_from_ledger(user_id, db)
    return items

@router.post("/detect", response_model=List[Dict[str, Any]])
def trigger_detection(
    user_id: str = Query("default_user"),
    db=Depends(get_db)
):
    return detect_recurring_from_ledger(user_id, db)

@router.post("/{item_id}/confirm")
def confirm_item(
    item_id: str,
    payload: ConfirmRecurringRequest,
    db=Depends(get_db)
):
    success = confirm_recurring_item(item_id, payload.user_id, payload.is_confirmed, db)
    if not success:
        raise HTTPException(status_code=404, detail="Recurring item not found")
    return {"status": "success", "id": item_id, "is_confirmed": payload.is_confirmed}

@router.get("/upcoming", response_model=Dict[str, Any])
def upcoming_schedule(
    user_id: str = Query("default_user"),
    horizon_days: int = Query(30, ge=1, le=90),
    db=Depends(get_db)
):
    return get_upcoming_schedule(user_id, horizon_days, db)
