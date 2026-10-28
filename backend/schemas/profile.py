from typing import Dict, List, Optional, Any, Literal
from pydantic import BaseModel, Field

ConstraintType = Literal["HARD_FLOOR", "FIXED_OBLIGATION", "BEHAVIORAL_CAP", "PENDING_IOU"]

class CategoryProfileMetric(BaseModel):
    category: str
    baseline_total: float = 0.0
    recent_total: float = 0.0
    baseline_daily_pace: float = 0.0
    recent_daily_pace: float = 0.0
    normalized_baseline: float = 0.0
    percentage_deviation: Optional[float] = None
    is_low_baseline: bool = False
    is_protected: bool = False
    transaction_count_recent: int = 0
    transaction_count_baseline: int = 0
    recent_transaction_ids: List[str] = Field(default_factory=list)

class SpendingProfileResponse(BaseModel):
    user_id: str
    baseline_start: str
    baseline_end: str
    baseline_days: int
    recent_start: str
    recent_end: str
    recent_days: int
    categories: Dict[str, CategoryProfileMetric]
    total_recent_spending: float
    total_baseline_spending: float
    highest_deviation_category: Optional[str] = None
    calculated_at: str


class UserConstraint(BaseModel):
    id: str
    user_id: str
    constraint_type: str
    label: str
    amount: float
    due_day: Optional[int] = None
    is_active: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: str


class UserConstraintCreate(BaseModel):
    user_id: str = "default_user"
    constraint_type: ConstraintType
    label: str
    amount: float = Field(..., ge=0)
    due_day: Optional[int] = Field(default=None, ge=1, le=31)
    is_active: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)


class UserConstraintUpdate(BaseModel):
    label: Optional[str] = None
    amount: Optional[float] = Field(default=None, ge=0)
    due_day: Optional[int] = Field(default=None, ge=1, le=31)
    is_active: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None


class SafeToSpendResponse(BaseModel):
    user_id: str
    raw_balance: float
    safe_to_spend_today: float
    locked_by_constraints: float
    unpaid_fixed_obligations: float
    hard_floor: float
    predicted_essential_burn: float
    remaining_days_in_cycle: int
    runway_days_remaining: int
    next_inflow_date: Optional[str] = None
    active_constraints: List[UserConstraint] = Field(default_factory=list)
    behavioral_cap_violations: List[Dict[str, Any]] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)
    calculated_at: str
