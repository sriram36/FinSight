from typing import List
from backend.schemas.scenario import AffordabilityRequest, AffordabilityResponse, AffordabilityGoalImpact
from backend.services.goal_service import calculate_goal_metrics

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
        goal_impacts=goal_impacts
    )
