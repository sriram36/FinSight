from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
import uuid
from datetime import datetime, timezone
from backend.database import get_db
from backend.schemas.transaction import (
    TransactionCreate,
    TransactionRead,
    TransactionUpdate,
    STANDARD_CATEGORIES
)

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.post("", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(tx: TransactionCreate, db=Depends(get_db)):
    tx_id = f"tx_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor = db.cursor()

    cursor.execute("""
    INSERT INTO transactions (
        id, user_id, transaction_date, description, amount, direction,
        category, category_source, raw_data, import_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        tx_id, tx.user_id, tx.transaction_date, tx.description,
        tx.amount, tx.direction.value, tx.category, tx.category_source,
        tx.raw_data, tx.import_id, now_iso
    ))
    db.commit()

    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    row = cursor.fetchone()
    return dict(row)

@router.get("")
def list_transactions(
    user_id: str = "default_user",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
    direction: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db=Depends(get_db)
):
    cursor = db.cursor()
    where_clauses = ["user_id = ?"]
    params = [user_id]

    if start_date:
        where_clauses.append("transaction_date >= ?")
        params.append(start_date)
    if end_date:
        where_clauses.append("transaction_date <= ?")
        params.append(end_date)
    if category:
        where_clauses.append("category = ?")
        params.append(category)
    if direction:
        where_clauses.append("direction = ?")
        params.append(direction)
    if search:
        where_clauses.append("(description LIKE ? OR category LIKE ?)")
        params.extend([f"%{search}%", f"%{search}%"])

    where_sql = " WHERE " + " AND ".join(where_clauses)

    # Count total
    cursor.execute(f"SELECT COUNT(*) FROM transactions {where_sql}", params)
    total_count = cursor.fetchone()[0]

    # Calculate spending
    cursor.execute(
        f"SELECT SUM(amount) FROM transactions {where_sql} AND direction = 'spending'",
        params
    )
    spending_row = cursor.fetchone()
    total_spending = float(spending_row[0] or 0.0) if spending_row and spending_row[0] else 0.0

    # Calculate income
    cursor.execute(
        f"SELECT SUM(amount) FROM transactions {where_sql} AND direction = 'income'",
        params
    )
    income_row = cursor.fetchone()
    total_income = float(income_row[0] or 0.0) if income_row and income_row[0] else 0.0

    # Paginated rows
    fetch_params = list(params) + [limit, offset]
    cursor.execute(
        f"SELECT * FROM transactions {where_sql} ORDER BY transaction_date DESC, created_at DESC LIMIT ? OFFSET ?",
        fetch_params
    )
    rows = cursor.fetchall()


    return {
        "items": [dict(r) for r in rows],
        "total": total_count,
        "total_spending": round(total_spending, 2),
        "total_income": round(total_income, 2),
        "limit": limit,
        "offset": offset
    }

@router.patch("/{tx_id}", response_model=TransactionRead)
def update_transaction(
    tx_id: str,
    update_data: TransactionUpdate,
    user_id: str = "default_user",
    db=Depends(get_db)
):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM transactions WHERE id = ? AND user_id = ?", (tx_id, user_id))
    existing = cursor.fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Transaction not found or unauthorized.")

    updates = []
    params = []

    if update_data.category is not None:
        updates.append("category = ?")
        updates.append("category_source = 'user_override'")
        params.append(update_data.category)
    if update_data.description is not None:
        updates.append("description = ?")
        params.append(update_data.description)
    if update_data.amount is not None:
        updates.append("amount = ?")
        params.append(abs(update_data.amount))
    if update_data.direction is not None:
        updates.append("direction = ?")
        params.append(update_data.direction.value)
    if update_data.transaction_date is not None:
        updates.append("transaction_date = ?")
        params.append(update_data.transaction_date)

    if not updates:
        return dict(existing)

    query = f"UPDATE transactions SET {', '.join(updates)} WHERE id = ? AND user_id = ?"
    params.extend([tx_id, user_id])
    cursor.execute(query, params)
    db.commit()

    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    updated = cursor.fetchone()
    return dict(updated)

@router.delete("/{tx_id}")
def delete_transaction(
    tx_id: str,
    user_id: str = "default_user",
    db=Depends(get_db)
):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM transactions WHERE id = ? AND user_id = ?", (tx_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Transaction not found.")

    cursor.execute("DELETE FROM transactions WHERE id = ? AND user_id = ?", (tx_id, user_id))
    db.commit()
    return {"message": "Transaction deleted successfully.", "id": tx_id}
