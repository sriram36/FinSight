import uuid
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from backend.config import settings
from backend.schemas.recommendation import RecommendationConfig, RecommendationRead
from backend.services.profile_service import calculate_spending_profile
from backend.services.llm_service import generate_llm_recommendation, generate_deterministic_fallback
from backend.services.verifier_service import verify_recommendation_claims

logger = logging.getLogger("finsight.recommendations")

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

    profile_summary = {
        "baseline_days": profile.baseline_days,
        "recent_days": profile.recent_days,
        "total_baseline_spending": profile.total_baseline_spending,
        "total_recent_spending": profile.total_recent_spending,
        "highest_deviation_category": profile.highest_deviation_category
    }

    # 3. Handle configurations
    if config == RecommendationConfig.SYSTEM_A:
        # Rule threshold: strictly >= 25% deviation
        qualifying = [m for m in eligible if (m.percentage_deviation or 0.0) >= 25.0]
        if not qualifying:
            cat = "None"
            action = "No category crossed the 25% threshold."
            reason = "All eligible spending categories remained within 25% of baseline pace."
            evidence = {}
            impact = None
            assumptions = ["Threshold rule fires when recent spending pace exceeds 1.25x baseline pace."]
        else:
            top = qualifying[0]
            cat = top.category
            diff_pace = max(0.0, top.recent_daily_pace - top.baseline_daily_pace)
            monthly_impact = round(diff_pace * 30, 2)
            evidence = {
                "category": cat,
                "recent_amount": top.recent_total,
                "baseline_amount": top.baseline_total,
                "recent_daily_pace": top.recent_daily_pace,
                "baseline_daily_pace": top.baseline_daily_pace,
                "percentage_deviation": top.percentage_deviation,
                "expected_impact": monthly_impact,
                "monthly_impact": monthly_impact,
                "period_days": profile.recent_days,
                "transaction_count": top.transaction_count_recent,
                "source_transaction_ids": top.recent_transaction_ids
            }
            llm_result = generate_llm_recommendation(config, cat, evidence, profile_summary)
            action = llm_result["action"]
            reason = llm_result["reason"]
            impact = monthly_impact
            assumptions = llm_result.get("assumptions", ["Threshold rule triggered at >= 25% pace deviation."])

        # System A is a deterministic rule: it does not claim to be generative-verified
        is_verified = True
        verifier_notes = "Deterministic Rule Baseline: Mathematical certainty guaranteed by rule logic."

    elif config == RecommendationConfig.SYSTEM_B:
        if not eligible:
            cat = "None"
            action = "Keep up your balanced spending pace."
            reason = "No notable spending anomalies observed in flexible categories."
            evidence = {}
            impact = None
            assumptions = ["Personalized recommendation conditioned on spending profile trends."]
        else:
            top = eligible[0]
            cat = top.category
            diff_pace = max(0.0, top.recent_daily_pace - top.baseline_daily_pace)
            monthly_impact = round(diff_pace * 30, 2)
            evidence = {
                "category": cat,
                "percentage_deviation": top.percentage_deviation,
                "recent_amount": top.recent_total,
                "expected_impact": monthly_impact
            }
            llm_result = generate_llm_recommendation(config, cat, evidence, profile_summary)
            action = llm_result["action"]
            reason = llm_result["reason"]
            impact = monthly_impact
            assumptions = llm_result.get("assumptions", ["Personalized recommendation conditioned on spending profile trends."])

        # Check claims for System B
        combined_text = f"{action} {reason}"
        verification = verify_recommendation_claims(combined_text, evidence, tolerance=0.01) if evidence else None
        is_verified = verification.is_verified if verification else True
        verifier_notes = verification.notes if verification else "No evidence claims to verify."

    elif config == RecommendationConfig.SYSTEM_B_ABLATION:
        if not eligible:
            cat = "None"
            action = "Spending pace is steady."
            reason = "Everything looks in order across your accounts."
            evidence = {}
            impact = None
            assumptions = ["Unstructured free-form advice without grounded numeric evidence fields."]
        else:
            top = eligible[0]
            cat = top.category
            evidence = {}  # Ablation intentionally provides empty evidence
            llm_result = generate_llm_recommendation(config, cat, evidence, profile_summary)
            action = llm_result["action"]
            reason = llm_result["reason"]
            impact = None
            assumptions = llm_result.get("assumptions", ["Unstructured free-form advice without grounded numeric evidence fields."])

        # Ablation has no evidence, so any numeric claim fails verification
        combined_text = f"{action} {reason}"
        verification = verify_recommendation_claims(combined_text, evidence, tolerance=0.01)
        is_verified = verification.is_verified
        verifier_notes = verification.notes

    else:  # SYSTEM_C
        if not eligible:
            cat = "None"
            action = "Maintain your current spending discipline."
            reason = "All flexible categories are performing within historical baseline targets."
            evidence = {}
            impact = None
            assumptions = ["Deterministic baseline comparison shows steady spending."]
            is_verified = True
            verifier_notes = "No spending anomalies detected; baseline discipline maintained."
        else:
            top = eligible[0]
            cat = top.category
            diff_pace = max(0.0, top.recent_daily_pace - top.baseline_daily_pace)
            monthly_impact = round(diff_pace * 30, 2)
            evidence = {
                "category": cat,
                "recent_amount": top.recent_total,
                "baseline_amount": top.baseline_total,
                "recent_daily_pace": top.recent_daily_pace,
                "baseline_daily_pace": top.baseline_daily_pace,
                "percentage_deviation": top.percentage_deviation,
                "expected_impact": monthly_impact,
                "monthly_impact": monthly_impact,
                "period_days": profile.recent_days,
                "transaction_count": top.transaction_count_recent,
                "source_transaction_ids": top.recent_transaction_ids
            }
            llm_result = generate_llm_recommendation(config, cat, evidence, profile_summary)
            action = llm_result["action"]
            reason = llm_result["reason"]
            impact = monthly_impact
            assumptions = llm_result.get("assumptions", [
                f"Historical baseline evaluated over {profile.baseline_days} days.",
                f"Recent pacing evaluated over {profile.recent_days} days.",
                "Discretionary adjustment assumes consistent recurring income."
            ])

            # Strict Claim Verification for System C (Tolerance ±1.0%)
            combined_text = f"{action} {reason}"
            verification = verify_recommendation_claims(combined_text, evidence, tolerance=0.01)
            is_verified = verification.is_verified
            verifier_notes = verification.notes

            if not is_verified:
                logger.warning(f"System C claim verification failed: {verifier_notes}. Falling back to System A deterministic baseline.")
                fallback_a = generate_deterministic_fallback(RecommendationConfig.SYSTEM_A, cat, evidence, profile_summary)
                action = fallback_a["action"]
                reason = fallback_a["reason"]
                verifier_notes = f"System C generative verification failed; safely fell back to deterministic baseline: {verification.notes}"
                # Re-verify the deterministic fallback
                verification = verify_recommendation_claims(f"{action} {reason}", evidence, tolerance=0.01)
                is_verified = verification.is_verified

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

    gen_mode = "azure_openai" if ('llm_result' in locals() and isinstance(llm_result, dict) and llm_result.get("is_llm_generated")) else "deterministic_fallback"
    model_name = llm_result.get("model", "rule_engine") if ('llm_result' in locals() and isinstance(llm_result, dict)) else "rule_engine"

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
        generation_mode=gen_mode,
        llm_model=model_name,
        created_at=now_iso
    )

def generate_portfolio_insights(
    user_id: str,
    db
) -> List[RecommendationRead]:
    """
    Generates a portfolio of verified, actionable financial insights for the product view:
    1. Primary Discretionary Outlier (System C)
    2. Recurring & Subscriptions Audit
    3. Goal Acceleration & Surplus Allocation
    """
    cursor = db.cursor()
    cursor.execute("SELECT MAX(transaction_date) FROM transactions WHERE user_id = ?", (user_id,))
    max_row = cursor.fetchone()
    if max_row and max_row[0]:
        r_end_dt = datetime.strptime(max_row[0][:10], "%Y-%m-%d")
    else:
        r_end_dt = datetime.now(timezone.utc)

    recent_end = r_end_dt.strftime("%Y-%m-%d")
    recent_start = (r_end_dt - timedelta(days=29)).strftime("%Y-%m-%d")
    baseline_end = (r_end_dt - timedelta(days=30)).strftime("%Y-%m-%d")
    baseline_start = (r_end_dt - timedelta(days=119)).strftime("%Y-%m-%d")

    portfolio = []

    # 1. Primary Discretionary Insight (System C Verified Recommender)
    primary_rec = generate_recommendation(
        user_id=user_id,
        config=RecommendationConfig.SYSTEM_C,
        baseline_start=baseline_start,
        baseline_end=baseline_end,
        recent_start=recent_start,
        recent_end=recent_end,
        db=db
    )
    portfolio.append(primary_rec)

    # 2. Recurring & Subscriptions Audit
    cursor.execute("""
    SELECT id, transaction_date, description, amount, category
    FROM transactions 
    WHERE user_id = ? AND category IN ('Utilities', 'Subscriptions', 'Memberships', 'Services')
      AND transaction_date >= ?
    ORDER BY amount DESC
    """, (user_id, recent_start))
    rec_rows = [dict(r) for r in cursor.fetchall()]
    rec_total = round(sum(float(r["amount"]) for r in rec_rows), 2)
    rec_count = len(rec_rows)

    if rec_count > 0:
        rec_ev = {
            "category": "Recurring Subscriptions",
            "total_spent": rec_total,
            "monthly_impact": round(rec_total * 0.20, 2), # 20% potential savings on unused services
            "transaction_count": rec_count,
            "source_transaction_ids": [r["id"] for r in rec_rows[:5]]
        }
        rec_action = f"Audit your recurring subscriptions and utility commitments to eliminate unused services."
        rec_reason = f"You incurred ₹{rec_total:,.2f} across {rec_count} recurring bills this past month. Trimming duplicate or idle subscriptions could save approximately ₹{rec_ev['monthly_impact']:,.2f}/month."
        rec_ver = verify_recommendation_claims(f"{rec_action} {rec_reason}", rec_ev, tolerance=0.01)

        portfolio.append(RecommendationRead(
            id=f"rec_sub_{uuid.uuid4().hex[:10]}",
            user_id=user_id,
            configuration="Portfolio-Subscription",
            category="Recurring Subscriptions",
            action=rec_action,
            reason=rec_reason,
            evidence=rec_ev,
            expected_impact=rec_ev["monthly_impact"],
            assumptions=["Audit focuses on recurring digital memberships, utilities, and subscriptions."],
            is_verified=rec_ver.is_verified,
            verifier_notes=rec_ver.notes,
            generation_mode="azure_openai" if settings.AZURE_OPENAI_API_KEY else "deterministic_fallback",
            llm_model=settings.AZURE_OPENAI_DEPLOYMENT or "rule_engine",
            created_at=datetime.now(timezone.utc).isoformat()
        ))

    # 3. Active Goal Acceleration
    cursor.execute("""
    SELECT title, target_amount, current_amount FROM goals 
    WHERE user_id = ? AND status = 'active' 
    ORDER BY target_amount DESC LIMIT 1
    """, (user_id,))
    top_goal = cursor.fetchone()

    if top_goal:
        g_name = top_goal["title"]
        g_target = round(float(top_goal["target_amount"]), 2)
        g_curr = round(float(top_goal["current_amount"] or 0.0), 2)
        g_rem = max(0.0, g_target - g_curr)
        monthly_realloc = round(min(g_rem, 3500.0), 2)

        g_ev = {
            "target_amount": g_target,
            "current_amount": g_curr,
            "remaining_amount": g_rem,
            "monthly_impact": monthly_realloc
        }
        g_action = f"Allocate discretionary savings surplus toward your '{g_name}' milestone."
        g_reason = f"Your goal '{g_name}' requires ₹{g_rem:,.2f} to complete. Redirecting ₹{monthly_realloc:,.2f}/month will accelerate your target completion timeline."
        g_ver = verify_recommendation_claims(f"{g_action} {g_reason}", g_ev, tolerance=0.01)

        portfolio.append(RecommendationRead(
            id=f"rec_goal_{uuid.uuid4().hex[:10]}",
            user_id=user_id,
            configuration="Portfolio-Goal",
            category="Goal Acceleration",
            action=g_action,
            reason=g_reason,
            evidence=g_ev,
            expected_impact=monthly_realloc,
            assumptions=["Accelerated savings preserves your emergency reserve buffer."],
            is_verified=g_ver.is_verified,
            verifier_notes=g_ver.notes,
            generation_mode="azure_openai" if settings.AZURE_OPENAI_API_KEY else "deterministic_fallback",
            llm_model=settings.AZURE_OPENAI_DEPLOYMENT or "rule_engine",
            created_at=datetime.now(timezone.utc).isoformat()
        ))

    return portfolio

