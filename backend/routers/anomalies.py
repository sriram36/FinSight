from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from backend.database import get_db
from backend.security import get_current_user, verify_user_access
from backend.services.anomaly_service import (
    detect_anomalies_from_ledger,
    get_user_anomalies,
    review_anomaly,
    get_anomalies_summary
)

router = APIRouter(prefix="/anomalies", tags=["anomalies"])

class ReviewAnomalyRequest(BaseModel):
    status: str = Field(..., pattern=r'^(new|reviewed|confirmed_unusual|dismissed)$')
    notes: Optional[str] = None

@router.get("", response_model=List[Dict[str, Any]])
def list_anomalies(
    status: Optional[str] = Query(None),
    user_id: Optional[str] = Query("default_user"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    target_user_id = verify_user_access(current_user, user_id)
    items = get_user_anomalies(target_user_id, db, status_filter=status)
    if not items:
        # Auto-detect on first query
        items = detect_anomalies_from_ledger(target_user_id, db)
    return items

@router.post("/detect", response_model=List[Dict[str, Any]])
def trigger_detection(
    user_id: Optional[str] = Query("default_user"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    target_user_id = verify_user_access(current_user, user_id)
    return detect_anomalies_from_ledger(target_user_id, db)

@router.get("/summary", response_model=Dict[str, Any])
def anomalies_summary(
    user_id: Optional[str] = Query("default_user"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    target_user_id = verify_user_access(current_user, user_id)
    return get_anomalies_summary(target_user_id, db)

@router.post("/{anomaly_id}/review")
def review_alert(
    anomaly_id: str,
    payload: ReviewAnomalyRequest,
    user_id: Optional[str] = Query("default_user"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    target_user_id = verify_user_access(current_user, user_id)
    success = review_anomaly(anomaly_id, target_user_id, payload.status, payload.notes, db)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found or access denied.")
    return {"status": "success", "id": anomaly_id, "updated_status": payload.status}
