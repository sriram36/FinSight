from typing import Optional
from pydantic import BaseModel, Field

class GoalCreate(BaseModel):
    user_id: str = "default_user"
    title: str = Field(..., min_length=1)
    target_amount: float = Field(..., gt=0)
    current_amount: float = Field(default=0.0, ge=0)
    target_date: str = Field(..., description="Target completion date YYYY-MM-DD")

class GoalRead(BaseModel):
    id: str
    user_id: str
    title: str
    target_amount: float
    current_amount: float
    target_date: str
    status: str
    months_remaining: int
    monthly_needed: float
    is_feasible: bool
    shortfall: float
    feasibility_notes: str
    created_at: str

    model_config = {"from_attributes": True}

class CategoryPreferenceUpdate(BaseModel):
    is_protected: bool
    reason: Optional[str] = None

class CategoryPreferenceRead(BaseModel):
    category: str
    is_protected: bool
    reason: Optional[str] = None
    updated_at: str

    model_config = {"from_attributes": True}
