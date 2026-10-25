from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
import json
from datetime import datetime, timedelta, timezone
from backend.database import get_db
from backend.security import get_current_user, verify_user_access
from backend.schemas.recommendation import (
    RecommendationRequest,
    RecommendationRead,
    RecommendationConfig
)
from backend.services.recommendation_service import generate_recommendation, generate_portfolio_insights

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.get("/portfolio", response_model=List[RecommendationRead])
def get_portfolio_insights_endpoint(
    user_id: Optional[str] = Query("default_user"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Returns a multi-dimensional portfolio of verified personal finance recommendations:
    1. Top Discretionary Pace Outlier (System C)
    2. Subscriptions & Recurring Commitments Audit
    3. Goal Acceleration & Surplus Allocation
    """
    target_user_id = verify_user_access(current_user, user_id)
    return generate_portfolio_insights(user_id=target_user_id, db=db)

@router.post("/generate", response_model=RecommendationRead)
def generate_recommendation_endpoint(
    req: RecommendationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    target_user_id = verify_user_access(current_user, req.user_id)
    cursor = db.cursor()
    recent_end = req.recent_end
    if not recent_end:
        cursor.execute("SELECT MAX(transaction_date) FROM transactions WHERE user_id = ?", (target_user_id,))
        max_row = cursor.fetchone()
        if max_row and max_row[0]:
            r_end = datetime.strptime(max_row[0][:10], "%Y-%m-%d")
        else:
            r_end = datetime.now(timezone.utc)
        recent_end = r_end.strftime("%Y-%m-%d")

    r_end_dt = datetime.strptime(recent_end[:10], "%Y-%m-%d")
    recent_start = req.recent_start or (r_end_dt - timedelta(days=29)).strftime("%Y-%m-%d")
    r_start_dt = datetime.strptime(recent_start[:10], "%Y-%m-%d")

    baseline_end = req.baseline_end or (r_start_dt - timedelta(days=1)).strftime("%Y-%m-%d")
    b_end_dt = datetime.strptime(baseline_end[:10], "%Y-%m-%d")
    baseline_start = req.baseline_start or (b_end_dt - timedelta(days=89)).strftime("%Y-%m-%d")

    return generate_recommendation(
        user_id=target_user_id,
        config=req.configuration,
        baseline_start=baseline_start,
        baseline_end=baseline_end,
        recent_start=recent_start,
        recent_end=recent_end,
        db=db
    )

@router.get("", response_model=List[RecommendationRead])
def list_recommendations(
    user_id: Optional[str] = Query("default_user"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    target_user_id = verify_user_access(current_user, user_id)
    cursor = db.cursor()
    cursor.execute("""
    SELECT id, user_id, configuration, category, action, reason, evidence_json,
           expected_impact, assumptions, is_verified, verifier_notes, created_at
    FROM recommendations WHERE user_id = ? ORDER BY created_at DESC
    """, (target_user_id,))
    rows = cursor.fetchall()

    results = []
    for r in rows:
        assumptions_val = []
        raw_asm = r["assumptions"]
        if raw_asm:
            try:
                parsed = json.loads(raw_asm)
                if isinstance(parsed, list):
                    assumptions_val = [str(x) for x in parsed]
                elif isinstance(parsed, str):
                    assumptions_val = [parsed]
            except Exception:
                assumptions_val = [str(raw_asm)]

        ev_val = {}
        raw_ev = r["evidence_json"]
        if raw_ev:
            try:
                parsed_ev = json.loads(raw_ev)
                if isinstance(parsed_ev, dict):
                    ev_val = parsed_ev
            except Exception:
                ev_val = {}

        results.append(RecommendationRead(
            id=r["id"],
            user_id=r["user_id"],
            configuration=r["configuration"],
            category=r["category"],
            action=r["action"],
            reason=r["reason"],
            evidence=ev_val,
            expected_impact=float(r["expected_impact"]) if r["expected_impact"] is not None else None,
            assumptions=assumptions_val,
            is_verified=bool(r["is_verified"]),
            verifier_notes=r["verifier_notes"],
            created_at=r["created_at"]
        ))
    return results

@router.get("/{rec_id}/evidence")
def inspect_recommendation_evidence(
    rec_id: str,
    user_id: Optional[str] = Query("default_user"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db=Depends(get_db)
):
    target_user_id = verify_user_access(current_user, user_id)
    cursor = db.cursor()
    cursor.execute("SELECT * FROM recommendations WHERE id = ? AND user_id = ?", (rec_id, target_user_id))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Recommendation not found or access denied.")

    evidence = {}
    raw_ev = row["evidence_json"]
    if raw_ev:
        try:
            parsed_ev = json.loads(raw_ev)
            if isinstance(parsed_ev, dict):
                evidence = parsed_ev
        except Exception:
            evidence = {}
    source_ids = evidence.get("source_transaction_ids", [])
    source_txs = []
    if source_ids:
        placeholders = ",".join("?" for _ in source_ids)
        cursor.execute(f"SELECT * FROM transactions WHERE id IN ({placeholders}) AND user_id = ?", list(source_ids) + [target_user_id])
        source_txs = [dict(t) for t in cursor.fetchall()]

    return {
        "recommendation_id": rec_id,
        "configuration": row["configuration"],
        "category": row["category"],
        "is_verified": bool(row["is_verified"]),
        "verifier_notes": row["verifier_notes"],
        "evidence": evidence,
        "source_transactions": source_txs
    }
