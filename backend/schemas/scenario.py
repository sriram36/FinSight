from typing import Optional, List
from pydantic import BaseModel, Field

class AffordabilityRequest(BaseModel):
    user_id: str = "default_user"
    purchase_amount: float = Field(..., gt=0)
    purchase_date: Optional[str] = None
    available_balance: Optional[float] = None
    upcoming_obligations: Optional[float] = None
    emergency_buffer: Optional[float] = None
    notes: Optional[str] = None

class AffordabilityGoalImpact(BaseModel):
    goal_id: str
    goal_title: str
    monthly_reservation: float
    is_delayed: bool

class AffordabilityResponse(BaseModel):
    purchase_amount: float
    available_balance: Optional[float] = None
    upcoming_obligations: float = 0.0
    emergency_buffer: float = 0.0
    goals_reserved: float = 0.0
    uncommitted_before: Optional[float] = None
    post_purchase_remainder: Optional[float] = None
    verdict: str  # comfortable, caution, unaffordable, incomplete_data
    summary: str
    missing_inputs: List[str] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)
    goal_impacts: List[AffordabilityGoalImpact] = Field(default_factory=list)
