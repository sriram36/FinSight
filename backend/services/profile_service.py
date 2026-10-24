from datetime import datetime, timezone
from typing import Optional, Dict, List, Set
from backend.schemas.profile import CategoryProfileMetric, SpendingProfileResponse

MIN_BASELINE_THRESHOLD = 50.0  # Minimum spend to consider a valid baseline

def calculate_spending_profile(
    user_id: str,
    baseline_start: str,
    baseline_end: str,
    recent_start: str,
    recent_end: str,
    db
) -> SpendingProfileResponse:
    # Compute days inclusive
    b_start_dt = datetime.strptime(baseline_start[:10], "%Y-%m-%d")
    b_end_dt = datetime.strptime(baseline_end[:10], "%Y-%m-%d")
    baseline_days = max(1, (b_end_dt - b_start_dt).days + 1)

    r_start_dt = datetime.strptime(recent_start[:10], "%Y-%m-%d")
    r_end_dt = datetime.strptime(recent_end[:10], "%Y-%m-%d")
    recent_days = max(1, (r_end_dt - r_start_dt).days + 1)

    cursor = db.cursor()

    # Get protected categories
    cursor.execute(
        "SELECT category FROM category_preferences WHERE user_id = ? AND is_protected = 1",
        (user_id,)
    )
    protected_categories: Set[str] = {r[0] for r in cursor.fetchall()}

    # Fetch baseline spending transactions
    cursor.execute("""
    SELECT id, category, amount FROM transactions
    WHERE user_id = ? AND direction = 'spending' AND transaction_date BETWEEN ? AND ?
    """, (user_id, baseline_start, baseline_end))
    baseline_rows = cursor.fetchall()

    # Fetch recent spending transactions
    cursor.execute("""
    SELECT id, category, amount FROM transactions
    WHERE user_id = ? AND direction = 'spending' AND transaction_date BETWEEN ? AND ?
    """, (user_id, recent_start, recent_end))
    recent_rows = cursor.fetchall()

    # Aggregate baseline
    baseline_by_cat: Dict[str, List[float]] = {}
    for r in baseline_rows:
        cat = r["category"]
        baseline_by_cat.setdefault(cat, []).append(float(r["amount"]))

    # Aggregate recent
    recent_by_cat: Dict[str, List[dict]] = {}
    for r in recent_rows:
        cat = r["category"]
        recent_by_cat.setdefault(cat, []).append({"id": r["id"], "amount": float(r["amount"])})

    all_categories = set(baseline_by_cat.keys()).union(set(recent_by_cat.keys()))

    categories_metrics: Dict[str, CategoryProfileMetric] = {}
    total_recent_spend = 0.0
    total_baseline_spend = 0.0

    highest_dev_cat: Optional[str] = None
    highest_dev_val = -999999.0

    for cat in sorted(all_categories):
        b_amounts = baseline_by_cat.get(cat, [])
        r_items = recent_by_cat.get(cat, [])

        b_total = sum(b_amounts)
        r_total = sum(item["amount"] for item in r_items)
        r_ids = [item["id"] for item in r_items]

        total_baseline_spend += b_total
        total_recent_spend += r_total

        b_pace = b_total / baseline_days
        r_pace = r_total / recent_days
        norm_baseline = b_pace * recent_days

        is_low = norm_baseline < MIN_BASELINE_THRESHOLD or b_total <= 0
        dev_pct: Optional[float] = None

        if not is_low:
            dev_pct = round(((r_total - norm_baseline) / norm_baseline) * 100.0, 2)
            # Check highest positive deviation for non-protected, eligible categories
            if cat not in protected_categories and cat not in ["Payment", "Income", "Transfer", "Other"]:
                if dev_pct > highest_dev_val and dev_pct > 0:
                    highest_dev_val = dev_pct
                    highest_dev_cat = cat

        categories_metrics[cat] = CategoryProfileMetric(
            category=cat,
            baseline_total=round(b_total, 2),
            recent_total=round(r_total, 2),
            baseline_daily_pace=round(b_pace, 2),
            recent_daily_pace=round(r_pace, 2),
            normalized_baseline=round(norm_baseline, 2),
            percentage_deviation=dev_pct,
            is_low_baseline=is_low,
            is_protected=(cat in protected_categories),
            transaction_count_recent=len(r_items),
            transaction_count_baseline=len(b_amounts),
            recent_transaction_ids=r_ids
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    return SpendingProfileResponse(
        user_id=user_id,
        baseline_start=baseline_start,
        baseline_end=baseline_end,
        baseline_days=baseline_days,
        recent_start=recent_start,
        recent_end=recent_end,
        recent_days=recent_days,
        categories=categories_metrics,
        total_recent_spending=round(total_recent_spend, 2),
        total_baseline_spending=round(total_baseline_spend, 2),
        highest_deviation_category=highest_dev_cat,
        calculated_at=now_iso
    )
