from fastapi import APIRouter, Depends
from typing import Dict, Any
from backend.database import get_db
from backend.security import get_current_user, verify_user_access
from backend.schemas.scenario import AffordabilityRequest, AffordabilityResponse
from backend.services.affordability_service import evaluate_affordability

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])

@router.post("/affordability", response_model=AffordabilityResponse)
def simulate_affordability(
    req: AffordabilityRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    target_user_id = verify_user_access(current_user, req.user_id)
    req_data = req.model_dump()
    req_data["user_id"] = target_user_id
    safe_req = AffordabilityRequest(**req_data)
    return evaluate_affordability(safe_req, db)
