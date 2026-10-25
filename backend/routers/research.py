from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from backend.services.research_service import (
    get_dataset_audit,
    get_temporal_split,
    run_four_way_benchmark,
    run_perturbation_experiment,
)

router = APIRouter(prefix="/research", tags=["Research Lab"])

class PerturbationRequest(BaseModel):
    seed: int = Field(default=42, description="Pseudorandom seed for experiment repeatability")
    target_category: str = Field(default="Dining Out", description="Target category to perturb")
    delta_pct: float = Field(default=150.0, description="Percentage increase to inject")

@router.get("/audit")
def audit_dataset():
    try:
        return get_dataset_audit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/split")
def temporal_split():
    try:
        return get_temporal_split()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/benchmark")
def configuration_benchmark():
    try:
        return run_four_way_benchmark()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/perturbation")
def perturbation_experiment(req: PerturbationRequest):
    try:
        return run_perturbation_experiment(
            seed=req.seed,
            target_category=req.target_category,
            delta_pct=req.delta_pct
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
