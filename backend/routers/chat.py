from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from backend.database import get_db
from backend.services.chat_service import process_financial_chat

router = APIRouter(prefix="/chat", tags=["Financial Copilot"])

class ChatQueryRequest(BaseModel):
    user_id: str = "default_user"
    message: str = Field(..., min_length=1, max_length=1000, description="User financial inquiry")

class ChatQueryResponse(BaseModel):
    reply: str
    intent: str
    facts: Dict[str, Any]
    is_verified: bool
    verifier_notes: Optional[str] = None
    generation_mode: str
    model: str
    cited_transactions: List[Dict[str, Any]] = Field(default_factory=list)
    suggested_followups: List[str] = Field(default_factory=list)
    created_at: str

@router.post("/query", response_model=ChatQueryResponse)
def query_financial_copilot(
    req: ChatQueryRequest,
    db=Depends(get_db)
):
    """
    Submits a conversational financial inquiry to FinSight Copilot.
    Combines deterministic financial computing, Azure OpenAI generation,
    and strict claim verification.
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Query message cannot be empty.")
    
    result = process_financial_chat(
        user_id=req.user_id,
        message=req.message,
        db=db
    )
    return result
