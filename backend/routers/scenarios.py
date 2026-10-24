from fastapi import APIRouter, Depends
from backend.database import get_db
from backend.schemas.scenario import AffordabilityRequest, AffordabilityResponse
from backend.services.affordability_service import evaluate_affordability

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])

@router.post("/affordability", response_model=AffordabilityResponse)
def simulate_affordability(req: AffordabilityRequest, db=Depends(get_db)):
    return evaluate_affordability(req, db)
