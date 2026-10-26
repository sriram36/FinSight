import json
import uuid
import calendar
from datetime import datetime, date, timedelta, timezone
from typing import Optional, Dict, List, Set, Any
from backend.schemas.profile import (
    CategoryProfileMetric,
    SpendingProfileResponse,
    UserConstraint,
    UserConstraintCreate,
    SafeToSpendResponse,
)

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


ESSENTIAL_CATEGORIES = {
    "Housing", "Rent/Mortgage", "Rent & Housing", "Healthcare", "Utilities",
    "Groceries", "Insurance", "Education"
}


def _row_to_constraint(row) -> UserConstraint:
    meta = {}
    raw_meta = row["metadata_json"] if "metadata_json" in row.keys() else None
    if raw_meta:
        try:
            meta = json.loads(raw_meta)
        except Exception:
            meta = {}
    return UserConstraint(
        id=row["id"],
        user_id=row["user_id"],
        constraint_type=row["constraint_type"],
        label=row["label"],
        amount=float(row["amount"] or 0.0),
        due_day=row["due_day"],
        is_active=bool(row["is_active"]),
        metadata=meta,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def list_user_constraints(user_id: str, db, active_only: bool = False) -> List[UserConstraint]:
    cursor = db.cursor()
    sql = "SELECT * FROM user_constraints WHERE user_id = ?"
    params: List[Any] = [user_id]
    if active_only:
        sql += " AND is_active = 1"
    sql += " ORDER BY constraint_type, created_at"
    cursor.execute(sql, params)
    return [_row_to_constraint(r) for r in cursor.fetchall()]


def create_user_constraint(payload: UserConstraintCreate, db) -> UserConstraint:
    cursor = db.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    cid = f"cst_{uuid.uuid4().hex[:12]}"
    cursor.execute(
        """
        INSERT INTO user_constraints (
            id, user_id, constraint_type, label, amount, due_day, is_active, metadata_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            cid,
            payload.user_id,
            payload.constraint_type,
            payload.label,
            payload.amount,
            payload.due_day,
            1 if payload.is_active else 0,
            json.dumps(payload.metadata or {}),
            now_iso,
            now_iso,
        ),
    )
    db.commit()
    cursor.execute("SELECT * FROM user_constraints WHERE id = ?", (cid,))
    return _row_to_constraint(cursor.fetchone())


def update_user_constraint(constraint_id: str, user_id: str, updates: Dict[str, Any], db) -> Optional[UserConstraint]:
    cursor = db.cursor()
    cursor.execute("SELECT * FROM user_constraints WHERE id = ? AND user_id = ?", (constraint_id, user_id))
    existing = cursor.fetchone()
    if not existing:
        return None
    fields = []
    params: List[Any] = []
    if "label" in updates and updates["label"] is not None:
        fields.append("label = ?")
        params.append(updates["label"])
    if "amount" in updates and updates["amount"] is not None:
        fields.append("amount = ?")
        params.append(updates["amount"])
    if "due_day" in updates:
        fields.append("due_day = ?")
        params.append(updates["due_day"])
    if "is_active" in updates and updates["is_active"] is not None:
        fields.append("is_active = ?")
        params.append(1 if updates["is_active"] else 0)
    if "metadata" in updates and updates["metadata"] is not None:
        fields.append("metadata_json = ?")
        params.append(json.dumps(updates["metadata"]))
    fields.append("updated_at = ?")
    params.append(datetime.now(timezone.utc).isoformat())
    params.extend([constraint_id, user_id])
    cursor.execute(
        f"UPDATE user_constraints SET {', '.join(fields)} WHERE id = ? AND user_id = ?",
        params,
    )
    db.commit()
    cursor.execute("SELECT * FROM user_constraints WHERE id = ?", (constraint_id,))
    return _row_to_constraint(cursor.fetchone())


def delete_user_constraint(constraint_id: str, user_id: str, db) -> bool:
    cursor = db.cursor()
    cursor.execute("DELETE FROM user_constraints WHERE id = ? AND user_id = ?", (constraint_id, user_id))
    db.commit()
    return cursor.rowcount > 0


def _ledger_raw_balance(user_id: str, db) -> float:
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT
            SUM(CASE WHEN direction = 'income' OR direction = 'credit' THEN amount ELSE 0 END) AS total_inc,
            SUM(CASE WHEN direction = 'spending' OR direction = 'debit' THEN amount ELSE 0 END) AS total_exp
        FROM transactions WHERE user_id = ?
        """,
        (user_id,),
    )
    row = cursor.fetchone()
    tot_inc = float(row["total_inc"] or 0.0) if row else 0.0
    tot_exp = float(row["total_exp"] or 0.0) if row else 0.0
    return round(tot_inc - tot_exp, 2)


def _next_inflow_date(user_id: str, db, today: date) -> Optional[date]:
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT transaction_date FROM transactions
        WHERE user_id = ? AND (direction = 'income' OR direction = 'credit')
        ORDER BY transaction_date DESC LIMIT 6
        """,
        (user_id,),
    )
    dates = []
    for r in cursor.fetchall():
        try:
            dates.append(datetime.strptime(str(r["transaction_date"])[:10], "%Y-%m-%d").date())
        except Exception:
            continue
    if len(dates) >= 2:
        intervals = [(dates[i] - dates[i + 1]).days for i in range(len(dates) - 1)]
        avg = sum(intervals) / len(intervals) if intervals else 30
        avg = max(7, min(45, avg))
        candidate = dates[0] + timedelta(days=int(round(avg)))
        if candidate <= today:
            candidate = today + timedelta(days=int(round(avg)))
        return candidate
    if dates:
        return dates[0] + timedelta(days=30)
    return None


def _predicted_essential_burn(user_id: str, db, days: int) -> float:
    cursor = db.cursor()
    cutoff = (date.today() - timedelta(days=60)).isoformat()
    cursor.execute(
        """
        SELECT amount, category, transaction_date FROM transactions
        WHERE user_id = ? AND (direction = 'spending' OR direction = 'debit')
          AND transaction_date >= ?
        """,
        (user_id, cutoff),
    )
    rows = cursor.fetchall()
    if not rows:
        return 0.0
    essential = 0.0
    for r in rows:
        if r["category"] in ESSENTIAL_CATEGORIES:
            essential += float(r["amount"] or 0.0)
    daily = essential / 60.0
    return round(daily * max(1, days), 2)


def calculate_true_safe_to_spend(user_id: str, db, raw_balance: Optional[float] = None) -> SafeToSpendResponse:
    """
    True Safe-to-Spend Today:
    (Raw Balance - Unpaid Fixed Obligations - Hard Floor - Predicted Essential Burn Until Next Inflow)
    / Remaining Days in Cycle
    """
    today = date.today()
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    remaining_days = max(1, days_in_month - today.day + 1)

    constraints = list_user_constraints(user_id, db, active_only=True)
    hard_floor = sum(c.amount for c in constraints if c.constraint_type == "HARD_FLOOR")
    unpaid_fixed = 0.0
    for c in constraints:
        if c.constraint_type != "FIXED_OBLIGATION":
            continue
        due_day = c.due_day or 1
        if due_day >= today.day:
            unpaid_fixed += c.amount

    next_inflow = _next_inflow_date(user_id, db, today)
    days_until_inflow = remaining_days
    if next_inflow:
        days_until_inflow = max(1, (next_inflow - today).days)

    essential_burn = _predicted_essential_burn(user_id, db, days_until_inflow)
    ledger_balance = _ledger_raw_balance(user_id, db)
    raw = round(raw_balance if raw_balance is not None else max(0.0, ledger_balance), 2)
    locked = round(unpaid_fixed + hard_floor, 2)
    uncommitted = raw - locked - essential_burn
    safe_today = round(uncommitted / remaining_days, 2)

    daily_burn = essential_burn / max(1, days_until_inflow)
    if daily_burn > 0:
        runway = int(max(0, (raw - locked) / daily_burn))
    else:
        runway = remaining_days if uncommitted >= 0 else 0

    assumptions = [
        f"Raw balance {'supplied' if raw_balance is not None else 'derived from ledger net cash flow'}: ₹{raw:,.2f}",
        f"Locked by constraints (hard floor + unpaid fixed obligations): ₹{locked:,.2f}",
        f"Predicted essential burn until next inflow ({days_until_inflow}d): ₹{essential_burn:,.2f}",
        f"Cycle remaining days: {remaining_days}",
    ]

    return SafeToSpendResponse(
        user_id=user_id,
        raw_balance=raw,
        safe_to_spend_today=round(safe_today, 2),
        locked_by_constraints=locked,
        unpaid_fixed_obligations=round(unpaid_fixed, 2),
        hard_floor=round(hard_floor, 2),
        predicted_essential_burn=essential_burn,
        remaining_days_in_cycle=remaining_days,
        runway_days_remaining=runway,
        next_inflow_date=next_inflow.isoformat() if next_inflow else None,
        active_constraints=constraints,
        assumptions=assumptions,
        calculated_at=datetime.now(timezone.utc).isoformat(),
    )
