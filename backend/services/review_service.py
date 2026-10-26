import calendar
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from collections import defaultdict
from backend.services.budget_service import get_monthly_budget_summary
from backend.services.recurring_service import get_recurring_items
from backend.services.anomaly_service import get_user_anomalies

def generate_monthly_review(user_id: str, month_str: Optional[str], db) -> Dict[str, Any]:
    """
    Generates a deterministic financial review for the selected calendar month (YYYY-MM).
    Compares metrics against the previous calendar month with explicit handling for partial months
    and missing historical baseline data.
    """
    now = date.today()
    if not month_str or len(month_str) != 7 or "-" not in month_str:
        month_str = now.strftime("%Y-%m")
        
    year, month = int(month_str[:4]), int(month_str[5:7])
    days_in_month = calendar.monthrange(year, month)[1]
    
    current_calendar_month = now.strftime("%Y-%m")
    is_partial_month = (month_str == current_calendar_month)
    days_elapsed = min(now.day, days_in_month) if is_partial_month else days_in_month
    
    # Calculate previous month string
    if month == 1:
        prev_month_str = f"{year - 1:04d}-12"
    else:
        prev_month_str = f"{year:04d}-{month - 1:02d}"
        
    cursor = db.cursor()
    
    # Query current month transactions
    cursor.execute("""
    SELECT id, transaction_date, description, amount, direction, category
    FROM transactions
    WHERE user_id = ? AND transaction_date LIKE ?
    ORDER BY transaction_date ASC
    """, (user_id, f"{month_str}%"))
    curr_txs = cursor.fetchall()
    
    # Query previous month transactions
    cursor.execute("""
    SELECT id, transaction_date, description, amount, direction, category
    FROM transactions
    WHERE user_id = ? AND transaction_date LIKE ?
    ORDER BY transaction_date ASC
    """, (user_id, f"{prev_month_str}%"))
    prev_txs = cursor.fetchall()
    
    curr_income = sum(float(t["amount"]) for t in curr_txs if t["direction"] == "income")
    curr_spending = sum(float(t["amount"]) for t in curr_txs if t["direction"] == "spending")
    curr_net = round(curr_income - curr_spending, 2)
    
    prev_income = sum(float(t["amount"]) for t in prev_txs if t["direction"] == "income")
    prev_spending = sum(float(t["amount"]) for t in prev_txs if t["direction"] == "spending")
    has_prior_data = len(prev_txs) > 0
    
    savings_rate = round((curr_net / curr_income) * 100.0, 1) if curr_income > 0 else 0.0
    
    # Category spending breakdown
    curr_cat_spend: Dict[str, float] = defaultdict(float)
    for t in curr_txs:
        if t["direction"] == "spending":
            curr_cat_spend[t["category"]] += float(t["amount"])
            
    prev_cat_spend: Dict[str, float] = defaultdict(float)
    for t in prev_txs:
        if t["direction"] == "spending":
            prev_cat_spend[t["category"]] += float(t["amount"])
            
    all_categories = sorted(list(set(curr_cat_spend.keys()) | set(prev_cat_spend.keys())))
    category_comparisons = []
    for cat in all_categories:
        c_amt = round(curr_cat_spend.get(cat, 0.0), 2)
        p_amt = round(prev_cat_spend.get(cat, 0.0), 2)
        diff = round(c_amt - p_amt, 2)
        pct_change = round((diff / p_amt) * 100.0, 1) if p_amt > 0 else (100.0 if c_amt > 0 else 0.0)
        category_comparisons.append({
            "category": cat,
            "current_spend": c_amt,
            "previous_spend": p_amt,
            "diff_amount": diff,
            "pct_change": pct_change
        })
    category_comparisons.sort(key=lambda x: x["current_spend"], reverse=True)
    
    # Budget Summary for this month
    budget_summary = get_monthly_budget_summary(user_id, month_str, db)
    
    # Recurring Subscriptions
    recurring_items = get_recurring_items(user_id, db)
    monthly_recurring_total = round(sum(i["amount"] for i in recurring_items if i.get("is_confirmed", False)), 2)
    
    # Anomalies in this month
    all_anomalies = get_user_anomalies(user_id, db)
    month_anomalies = [a for a in all_anomalies if a.get("created_at", "")[:7] == month_str]
    
    # Deterministic Narrative
    diff_total_spend = round(curr_spending - prev_spending, 2)
    if not has_prior_data:
        spend_trend_str = f"stands at ₹{curr_spending:,.2f} (first recorded period with no prior baseline)"
    elif diff_total_spend > 0:
        spend_trend_str = f"increased by ₹{abs(diff_total_spend):,.2f} compared to {prev_month_str}"
    elif diff_total_spend < 0:
        spend_trend_str = f"decreased by ₹{abs(diff_total_spend):,.2f} compared to {prev_month_str}"
    else:
        spend_trend_str = "remained flat compared to previous month"
    
    top_cat = category_comparisons[0]["category"] if category_comparisons else "General"
    top_cat_amt = category_comparisons[0]["current_spend"] if category_comparisons else 0.0
    
    progress_prefix = f"Through day {days_elapsed} of {month_str} (month in progress)" if is_partial_month else f"In {month_str}"
    narrative = (
        f"{progress_prefix}, you recorded ₹{curr_income:,.2f} in total income and ₹{curr_spending:,.2f} in expenses, "
        f"yielding a net cash flow of ₹{curr_net:,.2f} (savings rate of {savings_rate}%). "
        f"Your total spending {spend_trend_str}. "
        f"Your largest spending driver was {top_cat} at ₹{top_cat_amt:,.2f}. "
    )
    if budget_summary["overrun_count"] > 0:
        narrative += f"Note: {budget_summary['overrun_count']} budget category exceeded its monthly envelope. "
    if month_anomalies:
        narrative += f"You have {len(month_anomalies)} unusual transaction alert(s) during this period to review."
        
    return {
        "month": month_str,
        "previous_month": prev_month_str,
        "is_partial_month": is_partial_month,
        "days_elapsed": days_elapsed,
        "days_in_month": days_in_month,
        "has_prior_month_data": has_prior_data,
        "total_income": round(curr_income, 2),
        "total_spending": round(curr_spending, 2),
        "net_cash_flow": curr_net,
        "savings_rate_pct": savings_rate,
        "previous_income": round(prev_income, 2),
        "previous_spending": round(prev_spending, 2),
        "spending_diff": diff_total_spend,
        "category_comparisons": category_comparisons,
        "budget_summary": budget_summary,
        "monthly_recurring_total": monthly_recurring_total,
        "anomalies_count": len(month_anomalies),
        "anomalies": month_anomalies,
        "narrative": narrative,
        "transaction_count": len(curr_txs),
        "spending_attribution": _spending_change_attribution(curr_txs, prev_txs),
        "late_night_velocity": _late_night_velocity(curr_txs, prev_txs),
    }


def _parse_hour(tx_date: str) -> Optional[int]:
    text = str(tx_date or "")
    if "T" in text and len(text) >= 13:
        try:
            return int(text[11:13])
        except Exception:
            return None
    return None


def _spending_change_attribution(curr_txs, prev_txs) -> Dict[str, Any]:
    from backend.services.verifier_service import bind_evidence_bundle

    def _spend(rows):
        return [r for r in rows if r["direction"] == "spending"]

    curr = _spend(curr_txs)
    prev = _spend(prev_txs)
    by_cat_curr: Dict[str, List] = defaultdict(list)
    by_cat_prev: Dict[str, List] = defaultdict(list)
    for t in curr:
        by_cat_curr[t["category"]].append(t)
    for t in prev:
        by_cat_prev[t["category"]].append(t)

    cards = []
    cats = set(by_cat_curr) | set(by_cat_prev)
    for cat in cats:
        c_rows = by_cat_curr.get(cat, [])
        p_rows = by_cat_prev.get(cat, [])
        c_sum = sum(float(t["amount"]) for t in c_rows)
        p_sum = sum(float(t["amount"]) for t in p_rows)
        if abs(c_sum - p_sum) < 1:
            continue
        c_freq = len(c_rows)
        p_freq = len(p_rows)
        c_ticket = c_sum / c_freq if c_freq else 0.0
        p_ticket = p_sum / p_freq if p_freq else 0.0
        freq_effect = (c_freq - p_freq) * (p_ticket or c_ticket)
        ticket_effect = (c_ticket - p_ticket) * (p_freq or c_freq)
        driver = "frequency_drift" if abs(freq_effect) >= abs(ticket_effect) else "ticket_size_inflation"
        ids = [t["id"] for t in c_rows]
        bundle = bind_evidence_bundle(ids, c_sum, p_sum, extra={"recent_amount": round(c_sum, 2), "baseline_amount": round(p_sum, 2)})
        cards.append({
            "category": cat,
            "driver": driver,
            "frequency_current": c_freq,
            "frequency_baseline": p_freq,
            "avg_ticket_current": round(c_ticket, 2),
            "avg_ticket_baseline": round(p_ticket, 2),
            "frequency_effect": round(freq_effect, 2),
            "ticket_size_effect": round(ticket_effect, 2),
            "current_spend": round(c_sum, 2),
            "previous_spend": round(p_sum, 2),
            "evidence_bundle": bundle,
        })
    cards.sort(key=lambda x: abs(x["current_spend"] - x["previous_spend"]), reverse=True)
    return {"cards": cards[:8], "card_count": len(cards)}


def _late_night_velocity(curr_txs, prev_txs) -> Dict[str, Any]:
    from backend.services.verifier_service import bind_evidence_bundle

    def late(rows):
        out = []
        for t in rows:
            if t["direction"] != "spending":
                continue
            hour = _parse_hour(t["transaction_date"])
            if hour is not None and (hour >= 22 or hour < 2):
                out.append(t)
        return out

    curr_late = late(curr_txs)
    prev_late = late(prev_txs)
    c_sum = sum(float(t["amount"]) for t in curr_late)
    p_sum = sum(float(t["amount"]) for t in prev_late)
    bundle = bind_evidence_bundle(
        [t["id"] for t in curr_late],
        c_sum,
        p_sum,
        extra={"recent_amount": round(c_sum, 2), "baseline_amount": round(p_sum, 2)},
    )
    return {
        "current_count": len(curr_late),
        "baseline_count": len(prev_late),
        "current_spend": round(c_sum, 2),
        "baseline_spend": round(p_sum, 2),
        "evidence_bundle": bundle,
        "headline": (
            f"{len(curr_late)} late-night spends totaling ₹{c_sum:,.2f} "
            f"vs {len(prev_late)} totaling ₹{p_sum:,.2f} in the prior period."
        ),
    }
