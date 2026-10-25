import calendar
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class BudgetCreateRequest(BaseModel):
    user_id: str = "default_user"
    category: str
    monthly_limit: float = Field(..., gt=0)
    month: Optional[str] = None  # Format: "YYYY-MM" or "default"

def get_current_month_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")

def get_user_budgets(user_id: str, month: Optional[str], db) -> List[Dict[str, Any]]:
    cursor = db.cursor()
    target_month = month or get_current_month_str()

    cursor.execute("""
    SELECT id, user_id, category, monthly_limit, month, created_at, updated_at
    FROM budgets
    WHERE user_id = ? AND (month = ? OR month = 'default')
    ORDER BY monthly_limit DESC
    """, (user_id, target_month))
    rows = cursor.fetchall()

    # Determine date range for month
    try:
        yr, mo = map(int, target_month.split("-"))
        _, num_days = calendar.monthrange(yr, mo)
        start_date = f"{target_month}-01"
        end_date = f"{target_month}-{num_days:02d}"
    except Exception:
        now = datetime.now(timezone.utc)
        num_days = 30
        start_date = now.strftime("%Y-%m-01")
        end_date = now.strftime("%Y-%m-30")

    # Enforce override rule: month-specific budgets override 'default' limits
    cat_budget_map: Dict[str, Any] = {}
    for r in rows:
        cat = r["category"]
        if cat not in cat_budget_map:
            cat_budget_map[cat] = r
        elif r["month"] == target_month and cat_budget_map[cat]["month"] == "default":
            cat_budget_map[cat] = r
    effective_rows = list(cat_budget_map.values())

    # Date-aware elapsed days and projection handling
    now = datetime.now(timezone.utc)
    current_month_str = now.strftime("%Y-%m")
    if target_month < current_month_str:
        # Completed historical month: all days have elapsed, projected spend is actual spent
        days_elapsed = num_days
    elif target_month > current_month_str:
        # Future month: 0 days elapsed
        days_elapsed = 0
    else:
        # Active month in progress
        days_elapsed = min(num_days, max(1, now.day))

    budgets_list = []
    for r in effective_rows:
        b_id = r["id"]
        cat = r["category"]
        limit = float(r["monthly_limit"])

        # Calculate net spending in this category (spending minus refunds)
        cursor.execute("""
        SELECT 
            SUM(CASE WHEN direction = 'spending' OR direction = 'debit' THEN amount
                     WHEN direction = 'refund' THEN -amount
                     ELSE 0 END) AS spent_amt,
            COUNT(*) AS tx_cnt
        FROM transactions
        WHERE user_id = ? AND category = ? 
          AND (direction = 'spending' OR direction = 'debit' OR direction = 'refund')
          AND transaction_date >= ? AND transaction_date <= ?
        """, (user_id, cat, start_date, end_date))
        spent_row = cursor.fetchone()
        raw_spent = float(spent_row["spent_amt"] or 0.0) if spent_row else 0.0
        spent = round(max(0.0, raw_spent), 2)
        tx_count = int(spent_row["tx_cnt"] or 0) if spent_row else 0

        remaining = round(limit - spent, 2)
        pct = round((spent / limit * 100.0), 1) if limit > 0 else 0.0

        # Pace projection
        if target_month < current_month_str:
            projected = spent
        elif target_month > current_month_str:
            projected = 0.0
        else:
            burn_rate_daily = spent / max(1, days_elapsed)
            projected = round(burn_rate_daily * num_days, 2)

        if spent > limit:
            status = "exceeded"
        elif projected > limit and pct >= 50.0:
            status = "projected_overrun"
        elif pct >= 80.0:
            status = "warning"
        else:
            status = "healthy"

        budgets_list.append({
            "id": b_id,
            "user_id": user_id,
            "category": cat,
            "monthly_limit": limit,
            "month": target_month,
            "spent_amount": spent,
            "remaining_amount": remaining,
            "percentage_used": pct,
            "projected_spend": projected,
            "transaction_count": tx_count,
            "status": status,
            "days_elapsed": days_elapsed,
            "total_days_in_month": num_days
        })

    return budgets_list

def upsert_budget(req: BudgetCreateRequest, db) -> Dict[str, Any]:
    cursor = db.cursor()
    target_month = req.month or get_current_month_str()
    now_iso = datetime.now(timezone.utc).isoformat()

    # Check if budget already exists
    cursor.execute("""
    SELECT id FROM budgets 
    WHERE user_id = ? AND category = ? AND month = ?
    """, (req.user_id, req.category, target_month))
    existing = cursor.fetchone()

    if existing:
        b_id = existing["id"]
        cursor.execute("""
        UPDATE budgets 
        SET monthly_limit = ?, updated_at = ?
        WHERE id = ?
        """, (req.monthly_limit, now_iso, b_id))
    else:
        b_id = f"bgt_{uuid.uuid4().hex[:12]}"
        cursor.execute("""
        INSERT INTO budgets (id, user_id, category, monthly_limit, month, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (b_id, req.user_id, req.category, req.monthly_limit, target_month, now_iso, now_iso))

    db.commit()

    return {
        "id": b_id,
        "user_id": req.user_id,
        "category": req.category,
        "monthly_limit": req.monthly_limit,
        "month": target_month,
        "updated_at": now_iso
    }

def delete_user_budget(budget_id: str, user_id: str, db) -> bool:
    cursor = db.cursor()
    cursor.execute("DELETE FROM budgets WHERE id = ? AND user_id = ?", (budget_id, user_id))
    db.commit()
    return cursor.rowcount > 0

def get_budget_summary(user_id: str, month: Optional[str], db) -> Dict[str, Any]:
    budgets = get_user_budgets(user_id, month, db)
    total_budgeted = sum(b["monthly_limit"] for b in budgets)
    total_spent = sum(b["spent_amount"] for b in budgets)
    total_projected = sum(b["projected_spend"] for b in budgets)

    exceeded_count = sum(1 for b in budgets if b["status"] == "exceeded")
    warning_count = sum(1 for b in budgets if b["status"] in ("warning", "projected_overrun"))
    healthy_count = sum(1 for b in budgets if b["status"] == "healthy")

    return {
        "user_id": user_id,
        "month": month or get_current_month_str(),
        "total_budgeted": round(total_budgeted, 2),
        "total_spent": round(total_spent, 2),
        "total_remaining": round(total_budgeted - total_spent, 2),
        "total_projected": round(total_projected, 2),
        "budget_count": len(budgets),
        "healthy_count": healthy_count,
        "warning_count": warning_count,
        "exceeded_count": exceeded_count,
        "items": budgets
    }

def get_monthly_budget_summary(user_id: str, month: Optional[str], db) -> Dict[str, Any]:
    summary = get_budget_summary(user_id, month, db)
    return {
        "user_id": user_id,
        "month": summary["month"],
        "total_budget_limit": summary["total_budgeted"],
        "total_spent": summary["total_spent"],
        "remaining_budget": summary["total_remaining"],
        "overrun_count": summary["exceeded_count"],
        "categories": summary["items"]
    }
