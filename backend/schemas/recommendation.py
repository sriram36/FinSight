from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class RecommendationConfig(str, Enum):
    SYSTEM_A = "A"
    SYSTEM_B = "B"
    SYSTEM_B_ABLATION = "B-ablation"
    SYSTEM_C = "C"

class RecommendationRequest(BaseModel):
    user_id: str = "default_user"
    configuration: RecommendationConfig = RecommendationConfig.SYSTEM_C
    baseline_start: Optional[str] = None
    baseline_end: Optional[str] = None
    recent_start: Optional[str] = None
    recent_end: Optional[str] = None

class RecommendationRead(BaseModel):
    id: str
    user_id: str
    configuration: str
    category: Optional[str] = None
    action: str
    reason: str
    evidence: Dict[str, Any] = Field(default_factory=dict)
    expected_impact: Optional[float] = None
    assumptions: List[str] = Field(default_factory=list)
    is_verified: bool = False
    verifier_notes: Optional[str] = None
    generation_mode: Optional[str] = "deterministic_fallback"
    llm_model: Optional[str] = "rule_engine"
    created_at: str

    model_config = {"from_attributes": True}
