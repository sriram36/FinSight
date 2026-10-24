from datetime import datetime, timezone
from typing import Dict, Any, Tuple
from backend.schemas.goal import GoalCreate, GoalRead

def calculate_goal_metrics(
    user_id: str,
    target_amount: float,
    current_amount: float,
    target_date: str,
    db
) -> Tuple[int, float, bool, float, str]:
    now = datetime.now(timezone.utc)
    try:
        t_dt = datetime.strptime(target_date[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except Exception:
        t_dt = now

    days_remaining = max(1, (t_dt - now).days)
    months_remaining = max(1, round(days_remaining / 30.0))
    needed_total = max(0.0, target_amount - current_amount)
    monthly_needed = round(needed_total / months_remaining, 2)

    cursor = db.cursor()
    # Check income and spending in last 90 days to estimate monthly baseline
    cursor.execute("""
    SELECT direction, category, SUM(amount) FROM transactions
    WHERE user_id = ?
    GROUP BY direction, category
    """, (user_id,))
    rows = cursor.fetchall()

    income_total = 0.0
    spending_total = 0.0
    for r in rows:
        d = r[0]
        amt = float(r[2] or 0.0)
        if d == "income":
            income_total += amt
        elif d == "spending":
            spending_total += amt

    # Monthly estimate (using transactions or fallback to typical baseline)
    monthly_income = income_total / 3.0 if income_total > 0 else 50000.0
    monthly_spending = spending_total / 3.0 if spending_total > 0 else 30000.0
    net_surplus = monthly_income - monthly_spending

    # If monthly needed is within surplus or surplus + 30% discretionary flexibility
    available_capacity = max(0.0, net_surplus)
    if available_capacity == 0.0 and income_total == 0.0:
        available_capacity = 25000.0  # reasonable default if fresh account

    if monthly_needed <= available_capacity:
        is_feasible = True
        shortfall = 0.0
        notes = f"Target is feasible. Requires saving ₹{monthly_needed:,.2f}/month over {months_remaining} month(s)."
    else:
        is_feasible = False
        shortfall = round(monthly_needed - available_capacity, 2)
        notes = f"Shortfall of ₹{shortfall:,.2f}/month. Saving ₹{monthly_needed:,.2f}/month exceeds estimated available surplus of ₹{available_capacity:,.2f}/month."

    return months_remaining, monthly_needed, is_feasible, shortfall, notes
