from fastapi import APIRouter, Depends, Query
from typing import Optional, Dict, Any
from backend.database import get_db
from backend.security import get_current_user, verify_user_access
from backend.services.forecast_service import calculate_cash_flow_forecast

router = APIRouter(prefix="/forecast", tags=["forecast"])

@router.get("", response_model=Dict[str, Any])
def get_forecast(
    horizon_days: int = Query(30, ge=7, le=90),
    starting_balance: Optional[float] = Query(None),
    user_id: Optional[str] = Query("default_user"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    target_user_id = verify_user_access(current_user, user_id)
    return calculate_cash_flow_forecast(
        user_id=target_user_id,
        horizon_days=horizon_days,
        starting_balance=starting_balance,
        db=db
    )
