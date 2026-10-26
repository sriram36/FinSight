from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field
from typing import Optional
from backend.services.research_service import (
    get_dataset_audit,
    get_temporal_split,
    run_four_way_benchmark,
    run_perturbation_experiment,
    get_defense_engine_metrics,
)

router = APIRouter(prefix="/research", tags=["Research Lab"])

class PerturbationRequest(BaseModel):
    user_id: str = Field(default="syn_user_01", description="Persona user ID to evaluate")
    seed: int = Field(default=42, description="Pseudorandom seed for experiment repeatability")
    target_category: Optional[str] = Field(default=None, description="Target category to perturb (defaults to highest eligible)")
    delta_pct: float = Field(default=150.0, description="Percentage increase to inject")

@router.api_route("/audit", methods=["GET", "POST"])
def audit_dataset():
    try:
        return get_dataset_audit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.api_route("/split", methods=["GET", "POST"])
def temporal_split():
    try:
        return get_temporal_split()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.api_route("/benchmark", methods=["GET", "POST"])
def configuration_benchmark(live_llm: bool = Query(False, description="Run live LLM evaluation across personas")):
    try:
        return run_four_way_benchmark(live_llm=live_llm)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/perturbation")
def perturbation_experiment_post(req: PerturbationRequest):
    try:
        return run_perturbation_experiment(
            user_id=req.user_id,
            seed=req.seed,
            target_category=req.target_category,
            delta_pct=req.delta_pct
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.api_route("/defense-metrics", methods=["GET", "POST"])
def defense_engine_metrics():
    try:
        return get_defense_engine_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/perturbation")
def perturbation_experiment_get(
    user_id: str = Query("syn_user_01", description="Persona user ID"),
    seed: int = Query(42, description="Pseudorandom seed"),
    target_category: Optional[str] = Query(None, description="Target category"),
    delta_pct: float = Query(150.0, description="Percentage delta")
):
    try:
        return run_perturbation_experiment(
            user_id=user_id,
            seed=seed,
            target_category=target_category,
            delta_pct=delta_pct
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
