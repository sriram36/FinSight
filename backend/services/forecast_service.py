from datetime import datetime, date, timedelta, timezone
from typing import Dict, Any, List, Optional
from backend.services.recurring_service import get_upcoming_schedule

def calculate_cash_flow_forecast(
    user_id: str,
    horizon_days: int,
    starting_balance: Optional[float],
    db
) -> Dict[str, Any]:
    """
    Deterministic cash-flow forecasting over 7, 30, or 90 day horizons.
    Combines:
    1. Confirmed upcoming obligations from recurring_items
    2. Historical daily income pace
    3. Historical daily variable spending pace
    """
    cursor = db.cursor()
    # Fetch historical transactions to estimate baseline velocity
    cursor.execute("""
    SELECT transaction_date, amount, direction, category
    FROM transactions
    WHERE user_id = ?
    ORDER BY transaction_date ASC
    """, (user_id,))
    rows = cursor.fetchall()
    
    now = date.today()
    horizon_days = max(7, min(90, horizon_days))
    end_date = now + timedelta(days=horizon_days)
    
    # Upcoming recurring obligations from confirmed recurring items
    upcoming_data = get_upcoming_schedule(user_id, horizon_days, db)
    upcoming_events = upcoming_data.get("items") or upcoming_data.get("upcoming_items") or []
    upcoming_obligations_total = float(
        upcoming_data.get("total_upcoming") or upcoming_data.get("total_upcoming_amount") or 0.0
    )

    if not rows and not upcoming_events:
        return {
            "horizon_days": horizon_days,
            "start_date": now.isoformat(),
            "end_date": end_date.isoformat(),
            "starting_balance": starting_balance,
            "daily_burn_rate": 0.0,
            "projected_income": 0.0,
            "upcoming_obligations_total": 0.0,
            "projected_variable_spend": 0.0,
            "projected_total_outflow": 0.0,
            "projected_net_cash_flow": 0.0,
            "projected_closing_balance": starting_balance,
            "events": [],
            "assumptions": ["Insufficient ledger data. Import bank transactions to enable cash-flow projections."],
            "confidence": 0.0,
            "status": "insufficient_data"
        }
        
    # Analyze recent 60-day velocity from transactions (if any)
    if rows:
        recent_cutoff = (now - timedelta(days=60)).isoformat()
        recent_txs = [r for r in rows if r["transaction_date"] >= recent_cutoff]
        if not recent_txs:
            recent_txs = list(rows)
            
        dates = [r["transaction_date"][:10] for r in recent_txs]
        min_date = datetime.fromisoformat(min(dates)).date()
        max_date = datetime.fromisoformat(max(dates)).date()
        observed_days = max(1, (max_date - min_date).days + 1)
        
        total_recent_income = sum(float(r["amount"]) for r in recent_txs if r["direction"] == "income")
        total_recent_spending = sum(float(r["amount"]) for r in recent_txs if r["direction"] == "spending")
        
        daily_income_pace = total_recent_income / observed_days
        daily_spend_pace = total_recent_spending / observed_days
    else:
        observed_days = 0
        total_recent_income = 0.0
        daily_income_pace = 0.0
        daily_spend_pace = 0.0
    
    # Project variable spend (spend excluding confirmed recurring payments)
    recurring_daily_equiv = upcoming_obligations_total / max(1, horizon_days)
    discretionary_daily_pace = max(0.0, daily_spend_pace - recurring_daily_equiv)
    projected_variable_spend = round(discretionary_daily_pace * horizon_days, 2)
    
    projected_income = round(daily_income_pace * horizon_days, 2)
    projected_total_outflow = round(upcoming_obligations_total + projected_variable_spend, 2)
    projected_net_cash_flow = round(projected_income - projected_total_outflow, 2)
    
    projected_closing_balance = (
        round(starting_balance + projected_net_cash_flow, 2)
        if starting_balance is not None
        else None
    )
    
    # Build timeline events
    events = []
    for item in upcoming_events:
        due_date = item.get("due_date") or item.get("next_due_date") or now.isoformat()
        events.append({
            "date": due_date,
            "type": "obligation",
            "name": item.get("merchant") or "Recurring Obligation",
            "category": item.get("category", "Subscriptions"),
            "amount": -float(item.get("amount", 0.0)),
            "is_confirmed": bool(item.get("is_confirmed", False))
        })
        
    # Add recurring income expectation if steady income detected
    if total_recent_income > 0:
        events.append({
            "date": (now + timedelta(days=horizon_days // 2)).isoformat(),
            "type": "projected_inflow",
            "name": "Projected Income / Credits",
            "category": "Income",
            "amount": projected_income,
            "is_confirmed": False
        })
        
    confidence = 0.85 if len(rows) > 30 and upcoming_events else (0.65 if len(rows) > 10 else 0.40)
    
    assumptions = [
        f"Based on {observed_days}-day observed velocity (daily spend pace: ₹{daily_spend_pace:,.2f}/day).",
        f"Includes ₹{upcoming_obligations_total:,.2f} in confirmed recurring commitments over {horizon_days} days.",
        f"Discretionary/variable spending projected at ₹{projected_variable_spend:,.2f} based on recent pace."
    ]
    if starting_balance is None:
        assumptions.append("Starting balance not supplied; showing projected net trajectory (delta) only.")
        
    return {
        "horizon_days": horizon_days,
        "start_date": now.isoformat(),
        "end_date": end_date.isoformat(),
        "starting_balance": starting_balance,
        "daily_burn_rate": round(daily_spend_pace, 2),
        "projected_income": projected_income,
        "upcoming_obligations_total": round(upcoming_obligations_total, 2),
        "projected_variable_spend": projected_variable_spend,
        "projected_total_outflow": projected_total_outflow,
        "projected_net_cash_flow": projected_net_cash_flow,
        "projected_closing_balance": projected_closing_balance,
        "events": events,
        "assumptions": assumptions,
        "confidence": confidence,
        "status": "computed"
    }
