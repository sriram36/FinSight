from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional
import numpy as np
from backend.schemas.scenario import AffordabilityRequest, AffordabilityResponse, AffordabilityGoalImpact
from backend.services.goal_service import calculate_goal_metrics
from backend.services.profile_service import list_user_constraints
from backend.services.forecast_service import calculate_cash_flow_forecast
from backend.services.verifier_service import bind_evidence_bundle

def evaluate_affordability(req: AffordabilityRequest, db) -> AffordabilityResponse:
    if req.available_balance is None:
        return AffordabilityResponse(
            purchase_amount=req.purchase_amount,
            available_balance=None,
            upcoming_obligations=req.upcoming_obligations or 0.0,
            emergency_buffer=req.emergency_buffer or 10000.0,
            goals_reserved=0.0,
            uncommitted_before=None,
            post_purchase_remainder=None,
            verdict="incomplete_data",
            summary="Available balance must be confirmed. Transaction history alone does not provide current account balance.",
            missing_inputs=["available_balance"],
            assumptions=[
                "Actual current bank balance was not specified",
                "Cannot compute safe-to-spend remainder without known liquid assets"
            ],
            goal_impacts=[]
        )

    obligations = req.upcoming_obligations if req.upcoming_obligations is not None else 0.0
    buffer = req.emergency_buffer if req.emergency_buffer is not None else 10000.0

    # Query active goals
    cursor = db.cursor()
    cursor.execute("SELECT * FROM goals WHERE user_id = ? AND status = 'active'", (req.user_id,))
    goal_rows = cursor.fetchall()

    goal_impacts: List[AffordabilityGoalImpact] = []
    total_goals_reserved = 0.0

    for g in goal_rows:
        _, monthly_needed, _, _, _ = calculate_goal_metrics(
            user_id=req.user_id,
            target_amount=float(g["target_amount"]),
            current_amount=float(g["current_amount"]),
            target_date=g["target_date"],
            db=db
        )
        total_goals_reserved += monthly_needed
        goal_impacts.append(AffordabilityGoalImpact(
            goal_id=g["id"],
            goal_title=g["title"],
            monthly_reservation=monthly_needed,
            is_delayed=False
        ))

    total_committed = obligations + buffer + total_goals_reserved
    uncommitted_before = round(req.available_balance - total_committed, 2)
    post_purchase = round(uncommitted_before - req.purchase_amount, 2)

    assumptions = [
        f"Confirmed available balance: ₹{req.available_balance:,.2f}",
        f"Near-term obligations accounted for: ₹{obligations:,.2f}",
        f"Protected emergency buffer: ₹{buffer:,.2f}",
        f"Reserved for active goal contributions this month: ₹{total_goals_reserved:,.2f}"
    ]

    if post_purchase >= 0:
        verdict = "comfortable"
        summary = (
            f"You can comfortably afford this ₹{req.purchase_amount:,.2f} purchase. "
            f"You will have ₹{post_purchase:,.2f} in remaining uncommitted funds after protecting "
            f"your ₹{buffer:,.2f} buffer, obligations, and goal contributions."
        )
    elif post_purchase >= -buffer:
        verdict = "caution"
        eats_buffer = abs(post_purchase)
        summary = (
            f"Proceed with caution: This purchase uses all uncommitted funds and dips into your "
            f"emergency cushion by ₹{eats_buffer:,.2f}."
        )
        for gi in goal_impacts:
            gi.is_delayed = True
    else:
        verdict = "unaffordable"
        shortfall = abs(post_purchase)
        summary = (
            f"Unaffordable: This purchase exceeds your available liquid funds by ₹{shortfall:,.2f} "
            f"after accounting for known obligations and safety buffer."
        )
        for gi in goal_impacts:
            gi.is_delayed = True

    stress = run_cashflow_stress_test(
        user_id=req.user_id,
        purchase_amount=req.purchase_amount,
        available_balance=req.available_balance,
        purchase_date=req.purchase_date,
        horizon_days=req.horizon_days or 30,
        is_emi=bool(req.is_emi),
        tenure_months=req.tenure_months,
        hard_floor=buffer if req.emergency_buffer is not None else None,
        db=db,
    )
    assumptions.extend(stress.get("assumptions", []))

    evidence = bind_evidence_bundle(
        transaction_ids=[],
        exact_sum=req.purchase_amount,
        baseline_sum=req.available_balance,
        extra={
            "purchase_amount": req.purchase_amount,
            "available_balance": req.available_balance,
            "post_purchase_remainder": post_purchase,
            "survival_probability": stress["survival_probability"],
        },
        claim_text=(
            f"A purchase of ₹{req.purchase_amount:,.2f} against ₹{req.available_balance:,.2f} "
            f"leaves ₹{post_purchase:,.2f} with survival probability {stress['survival_probability']}%."
        ),
    )

    return AffordabilityResponse(
        purchase_amount=req.purchase_amount,
        available_balance=req.available_balance,
        upcoming_obligations=obligations,
        emergency_buffer=buffer,
        goals_reserved=round(total_goals_reserved, 2),
        uncommitted_before=uncommitted_before,
        post_purchase_remainder=post_purchase,
        verdict=verdict,
        summary=summary,
        missing_inputs=[],
        assumptions=assumptions,
        goal_impacts=goal_impacts,
        survival_probability=stress["survival_probability"],
        survival_p10=stress.get("survival_p10"),
        survival_p90=stress.get("survival_p90"),
        constraint_violations=stress["constraint_violations"],
        counterfactual_alternatives=stress["counterfactual_alternatives"],
        runway_timeline=stress["runway_timeline"],
        evidence_bundle=evidence,
    )


def run_cashflow_stress_test(
    user_id: str,
    purchase_amount: float,
    available_balance: float,
    purchase_date: Optional[str],
    horizon_days: int,
    is_emi: bool,
    tenure_months: Optional[int],
    hard_floor: Optional[float],
    db,
) -> Dict[str, Any]:
    horizon = max(7, min(90, int(horizon_days or 30)))
    today = date.today()
    try:
        buy_on = datetime.strptime((purchase_date or today.isoformat())[:10], "%Y-%m-%d").date()
    except Exception:
        buy_on = today

    constraints = list_user_constraints(user_id, db, active_only=True)
    floor_amt = hard_floor
    if floor_amt is None:
        floors = [c.amount for c in constraints if c.constraint_type == "HARD_FLOOR"]
        floor_amt = floors[0] if floors else 0.0

    forecast = calculate_cash_flow_forecast(user_id, horizon, available_balance, db)
    daily_burn = float(forecast.get("daily_burn_rate") or 0.0)
    events_by_day: Dict[str, float] = {}
    for ev in forecast.get("events") or []:
        dkey = str(ev.get("date") or "")[:10]
        amt = float(ev.get("amount") or 0.0)
        events_by_day[dkey] = events_by_day.get(dkey, 0.0) + amt

    for c in constraints:
        if c.constraint_type == "FIXED_OBLIGATION" and c.due_day:
            due = date(today.year, today.month, min(c.due_day, 28))
            if due < today:
                if today.month == 12:
                    due = date(today.year + 1, 1, min(c.due_day, 28))
                else:
                    due = date(today.year, today.month + 1, min(c.due_day, 28))
            dkey = due.isoformat()
            events_by_day[dkey] = events_by_day.get(dkey, 0.0) - c.amount

    emi_daily = 0.0
    lump = purchase_amount
    if is_emi and tenure_months:
        lump = round(purchase_amount / max(1, tenure_months), 2)
        emi_daily = 0.0

    balance = float(available_balance)
    violations: List[Dict[str, Any]] = []
    timeline: List[Dict[str, Any]] = []
    days_ok = 0
    first_breach_day = None

    # Check BEHAVIORAL_CAP constraints against observed daily burn
    for cap in [c for c in constraints if c.constraint_type == "BEHAVIORAL_CAP" and c.amount > 0]:
        daily_cap = cap.amount / 7.0
        if daily_burn > daily_cap:
            violations.append({
                "constraint_type": "BEHAVIORAL_CAP",
                "label": cap.label,
                "amount": cap.amount,
                "breach_day": 1,
                "breach_date": today.isoformat(),
                "projected_balance": round(balance, 2),
                "message": f"Daily spending velocity of ₹{daily_burn:,.0f}/day breaches your '{cap.label}' cap of ₹{daily_cap:,.0f}/day (₹{cap.amount:,.0f}/week).",
            })

    for i in range(horizon):
        day = today + timedelta(days=i)
        if day == buy_on:
            balance -= lump
        balance -= daily_burn
        dkey = day.isoformat()
        if dkey in events_by_day:
            balance += events_by_day[dkey]
        below = floor_amt > 0 and balance < floor_amt
        if below:
            if first_breach_day is None:
                first_breach_day = i + 1
                label = next((c.label for c in constraints if c.constraint_type == "HARD_FLOOR"), "Hard Floor")
                violations.append({
                    "constraint_type": "HARD_FLOOR",
                    "label": label,
                    "amount": floor_amt,
                    "breach_day": i + 1,
                    "breach_date": dkey,
                    "projected_balance": round(balance, 2),
                    "message": f"Breaches ₹{floor_amt:,.0f} {label} on Day {i + 1} ({dkey}).",
                })
        else:
            days_ok += 1
        if i % max(1, horizon // 10) == 0 or below or day == buy_on:
            timeline.append({
                "day": i,
                "date": dkey,
                "projected_balance": round(balance, 2),
                "below_floor": below,
            })

    # Monte Carlo simulation over daily spending volatility (300 paths)
    N_SIMS = 300
    daily_std = max(10.0, daily_burn * 0.35)
    rng = np.random.default_rng(seed=42)
    burn_sims = rng.normal(loc=daily_burn, scale=daily_std, size=(N_SIMS, horizon))
    burn_sims = np.clip(burn_sims, 0.0, daily_burn * 3.5)

    sim_survivals = []
    for s_idx in range(N_SIMS):
        s_bal = float(available_balance)
        s_ok = 0
        for d_idx in range(horizon):
            d_date = today + timedelta(days=d_idx)
            if d_date == buy_on:
                s_bal -= lump
            s_bal -= float(burn_sims[s_idx, d_idx])
            dk = d_date.isoformat()
            if dk in events_by_day:
                s_bal += events_by_day[dk]
            if floor_amt <= 0 or s_bal >= floor_amt:
                s_ok += 1
        sim_survivals.append((s_ok / horizon) * 100.0)

    surv_arr = np.array(sim_survivals)
    survival = round(float(np.median(surv_arr)), 1)
    survival_p10 = round(float(np.percentile(surv_arr, 10)), 1)
    survival_p90 = round(float(np.percentile(surv_arr, 90)), 1)

    alternatives: List[Dict[str, Any]] = []
    if first_breach_day is not None:
        delay_days = first_breach_day
        alternatives.append({
            "action": "delay_purchase",
            "label": f"Delay purchase by {delay_days} days",
            "detail": f"Waiting {delay_days} days avoids the first hard-floor breach on the current velocity.",
        })
        cut_needed = round(max(0.0, (floor_amt - (available_balance - purchase_amount)) / max(1, horizon)), 2)
        if cut_needed > 0:
            alternatives.append({
                "action": "cut_velocity",
                "label": f"Cut evening food velocity by ₹{cut_needed:,.0f}/day for {min(21, horizon)} days",
                "detail": "Lower discretionary daily burn until the next inflow restores the floor.",
            })
        alternatives.append({
            "action": "emi_split",
            "label": "Split into 3-month no-cost EMI",
            "detail": f"₹{round(purchase_amount / 3.0, 2):,.2f}/month instead of a single ₹{purchase_amount:,.2f} debit.",
        })
    else:
        alternatives.append({
            "action": "proceed",
            "label": "Purchase stays above every active constraint across the horizon",
            "detail": f"Survival probability {survival}% (P10: {survival_p10}%, P90: {survival_p90}%) over {horizon} days.",
        })

    return {
        "survival_probability": survival,
        "survival_p10": survival_p10,
        "survival_p90": survival_p90,
        "constraint_violations": violations,
        "counterfactual_alternatives": alternatives,
        "runway_timeline": timeline,
        "assumptions": [
            f"Monte Carlo stress-tested {horizon} days (300 paths) using velocity ₹{daily_burn:,.2f}/day (P10: {survival_p10}%, P90: {survival_p90}%).",
            f"Active constraint floor used: ₹{floor_amt:,.2f}.",
        ],
    }
