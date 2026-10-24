import uuid
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from backend.schemas.recommendation import RecommendationConfig, RecommendationRead
from backend.services.profile_service import calculate_spending_profile

def generate_recommendation(
    user_id: str,
    config: RecommendationConfig,
    baseline_start: str,
    baseline_end: str,
    recent_start: str,
    recent_end: str,
    db
) -> RecommendationRead:
    rec_id = f"rec_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Compute profile deterministically
    profile = calculate_spending_profile(
        user_id=user_id,
        baseline_start=baseline_start,
        baseline_end=baseline_end,
        recent_start=recent_start,
        recent_end=recent_end,
        db=db
    )

    # 2. Filter eligible categories (must not be protected, and not utility/transfer/payment/income)
    eligible = []
    excluded_names = {"Other", "Payment", "Income", "Transfer"}

    for cat_name, metric in profile.categories.items():
        if metric.is_protected or cat_name in excluded_names:
            continue
        if metric.is_low_baseline or metric.percentage_deviation is None:
            continue
        eligible.append(metric)

    # Sort deterministically: highest deviation %, then highest recent total, then alphabetical
    eligible.sort(
        key=lambda m: (m.percentage_deviation or 0.0, m.recent_total, m.category),
        reverse=True
    )

    # 3. Handle configurations
    if config == RecommendationConfig.SYSTEM_A:
        # Rule threshold: strictly >= 25% deviation
        qualifying = [m for m in eligible if (m.percentage_deviation or 0.0) >= 25.0]
        if not qualifying:
            action = "No category crossed the 25% threshold."
            reason = "All eligible spending categories remained within 25% of baseline pace."
            cat = "None"
            evidence = {}
            impact = None

        else:
            top = qualifying[0]
            cat = top.category
            action = f"Review and moderate discretionary spending in {cat}."
            reason = f"{cat} spending is trending {top.percentage_deviation}% above baseline pace."
            impact = round(max(0.0, (top.recent_daily_pace - top.baseline_daily_pace) * 30), 2)
            evidence = {
                "category": cat,
                "recent_amount": top.recent_total,
                "baseline_amount": top.baseline_total,
                "recent_daily_pace": top.recent_daily_pace,
                "baseline_daily_pace": top.baseline_daily_pace,
                "percentage_deviation": top.percentage_deviation,
                "transaction_count": top.transaction_count_recent,
                "source_transaction_ids": top.recent_transaction_ids
            }
        assumptions = ["Threshold rule fires when recent spending pace exceeds 1.25x baseline pace."]

    elif config == RecommendationConfig.SYSTEM_B:
        if not eligible:
            cat = "None"
            action = "Keep up your balanced spending pace."
            reason = "No notable spending anomalies observed in flexible categories."
            evidence = {}
            impact = None
        else:
            top = eligible[0]
            cat = top.category
            action = f"Plan flexible purchases carefully around {cat}."
            reason = f"Your {cat} spending has shown an upward shift (+{top.percentage_deviation}%) recently."
            impact = round(max(0.0, (top.recent_daily_pace - top.baseline_daily_pace) * 30), 2)
            evidence = {
                "category": cat,
                "percentage_deviation": top.percentage_deviation,
                "recent_amount": top.recent_total
            }
        assumptions = ["Personalized recommendation conditioned on profile spending trends."]

    elif config == RecommendationConfig.SYSTEM_B_ABLATION:
        if not eligible:
            cat = "None"
            action = "Spending pace is steady."
            reason = "Everything looks in order across your accounts."
            evidence = {}
            impact = None
        else:
            top = eligible[0]
            cat = top.category
            action = f"Try spending less on {cat} this month."
            reason = f"You seemed to spend quite a bit on {cat} lately. Easing back might help your savings."
            impact = None
            evidence = {}
        assumptions = ["Unstructured free-form advice without grounded numeric evidence fields."]

    else:  # SYSTEM_C
        if not eligible:
            cat = "None"
            action = "Maintain your current spending discipline."
            reason = "All flexible categories are performing within historical baseline targets."
            evidence = {}
            impact = None
            assumptions = ["Deterministic baseline comparison shows steady spending."]

        else:
            top = eligible[0]
            cat = top.category
            diff_pace = max(0.0, top.recent_daily_pace - top.baseline_daily_pace)
            monthly_impact = round(diff_pace * 30, 2)
            action = f"Consider capping {cat} spending by ₹{monthly_impact:,.2f}/month to return to baseline pace."
            reason = (
                f"Your recent {cat} spending pace is ₹{top.recent_daily_pace:,.2f}/day, which is "
                f"{top.percentage_deviation}% above your historical baseline pace of ₹{top.baseline_daily_pace:,.2f}/day."
            )
            impact = monthly_impact
            evidence = {
                "category": cat,
                "recent_amount": top.recent_total,
                "baseline_amount": top.baseline_total,
                "recent_daily_pace": top.recent_daily_pace,
                "baseline_daily_pace": top.baseline_daily_pace,
                "percentage_deviation": top.percentage_deviation,
                "period_days": profile.recent_days,
                "transaction_count": top.transaction_count_recent,
                "source_transaction_ids": top.recent_transaction_ids
            }
            assumptions = [
                f"Historical baseline evaluated over {profile.baseline_days} days.",
                f"Recent pacing evaluated over {profile.recent_days} days.",
                "Discretionary adjustment assumes consistent recurring income."
            ]

    # Strict Claim Verification
    from backend.services.verifier_service import verify_recommendation_claims
    combined_text = f"{action} {reason}"
    verification = verify_recommendation_claims(combined_text, evidence) if evidence else None
    is_verified = verification.is_verified if verification else False
    verifier_notes = verification.notes if verification else "No evidence claims to verify."

    # Save to database
    cursor = db.cursor()
    cursor.execute("""
    INSERT INTO recommendations (
        id, user_id, configuration, category, action, reason, evidence_json,
        expected_impact, assumptions, is_verified, verifier_notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        rec_id, user_id, config.value, cat, action, reason,
        json.dumps(evidence), impact, json.dumps(assumptions),
        1 if is_verified else 0,
        verifier_notes,
        now_iso
    ))
    db.commit()

    return RecommendationRead(
        id=rec_id,
        user_id=user_id,
        configuration=config.value,
        category=cat,
        action=action,
        reason=reason,
        evidence=evidence,
        expected_impact=impact,
        assumptions=assumptions,
        is_verified=is_verified,
        verifier_notes=verifier_notes,
        created_at=now_iso
    )

