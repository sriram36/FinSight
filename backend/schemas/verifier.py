from typing import List, Dict, Any
from pydantic import BaseModel, Field

class VerificationClaim(BaseModel):
    token: str
    numeric_value: float
    matched_evidence_key: str = ""
    tolerance: float = 0.0

class VerificationResult(BaseModel):
    is_verified: bool
    matched_claims: List[Dict[str, Any]] = Field(default_factory=list)
    unsupported_claims: List[Dict[str, Any]] = Field(default_factory=list)
    tolerance_used: float = 0.015
    notes: str
