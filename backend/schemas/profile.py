from typing import Dict, List, Optional
from pydantic import BaseModel, Field

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
