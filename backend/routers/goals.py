from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from backend.database import get_db
from backend.schemas.goal import GoalCreate, GoalRead, CategoryPreferenceUpdate, CategoryPreferenceRead
from backend.schemas.transaction import STANDARD_CATEGORIES
from backend.services.goal_service import calculate_goal_metrics

router = APIRouter(tags=["Goals and Preferences"])

@router.post("/goals", response_model=GoalRead, status_code=status.HTTP_201_CREATED)
def create_goal(req: GoalCreate, db=Depends(get_db)):
    goal_id = f"goal_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    months, monthly_needed, feasible, shortfall, notes = calculate_goal_metrics(
        user_id=req.user_id,
        target_amount=req.target_amount,
        current_amount=req.current_amount,
        target_date=req.target_date,
        db=db
    )

    cursor = db.cursor()
    cursor.execute("""
    INSERT INTO goals (id, user_id, title, target_amount, current_amount, target_date, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
    """, (
        goal_id, req.user_id, req.title, req.target_amount, req.current_amount, req.target_date, now_iso
    ))
    db.commit()

    return GoalRead(
        id=goal_id,
        user_id=req.user_id,
        title=req.title,
        target_amount=req.target_amount,
        current_amount=req.current_amount,
        target_date=req.target_date,
        status="active",
        months_remaining=months,
        monthly_needed=monthly_needed,
        is_feasible=feasible,
        shortfall=shortfall,
        feasibility_notes=notes,
        created_at=now_iso
    )

@router.get("/goals", response_model=List[GoalRead])
def list_goals(user_id: str = "default_user", db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    rows = cursor.fetchall()

    results = []
    for r in rows:
        months, monthly_needed, feasible, shortfall, notes = calculate_goal_metrics(
            user_id=user_id,
            target_amount=float(r["target_amount"]),
            current_amount=float(r["current_amount"]),
            target_date=r["target_date"],
            db=db
        )
        results.append(GoalRead(
            id=r["id"],
            user_id=r["user_id"],
            title=r["title"],
            target_amount=float(r["target_amount"]),
            current_amount=float(r["current_amount"]),
            target_date=r["target_date"],
            status=r["status"],
            months_remaining=months,
            monthly_needed=monthly_needed,
            is_feasible=feasible,
            shortfall=shortfall,
            feasibility_notes=notes,
            created_at=r["created_at"]
        ))
    return results

@router.delete("/goals/{goal_id}")
def delete_goal(goal_id: str, user_id: str = "default_user", db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM goals WHERE id = ? AND user_id = ?", (goal_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Goal not found.")

    cursor.execute("DELETE FROM goals WHERE id = ? AND user_id = ?", (goal_id, user_id))
    db.commit()
    return {"message": "Goal deleted successfully", "id": goal_id}

@router.get("/preferences/categories", response_model=List[CategoryPreferenceRead])
def list_category_preferences(user_id: str = "default_user", db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT category, is_protected, reason, updated_at FROM category_preferences WHERE user_id = ?", (user_id,))
    rows = {r["category"]: dict(r) for r in cursor.fetchall()}

    now_iso = datetime.now(timezone.utc).isoformat()
    preferences = []
    for cat in STANDARD_CATEGORIES:
        if cat in ["Income", "Transfer", "Payment"]:
            continue
        pref = rows.get(cat)
        if pref:
            preferences.append(CategoryPreferenceRead(
                category=cat,
                is_protected=bool(pref["is_protected"]),
                reason=pref["reason"],
                updated_at=pref["updated_at"]
            ))
        else:
            preferences.append(CategoryPreferenceRead(
                category=cat,
                is_protected=False,
                reason=None,
                updated_at=now_iso
            ))
    return preferences

@router.patch("/preferences/categories/{category:path}", response_model=CategoryPreferenceRead)
def update_category_preference(
    category: str,
    update: CategoryPreferenceUpdate,
    user_id: str = "default_user",
    db=Depends(get_db)
):
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor = db.cursor()

    cursor.execute("""
    INSERT INTO category_preferences (id, user_id, category, is_protected, reason, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, category) DO UPDATE SET
        is_protected = excluded.is_protected,
        reason = excluded.reason,
        updated_at = excluded.updated_at
    """, (
        f"pref_{uuid.uuid4().hex[:12]}",
        user_id,
        category,
        1 if update.is_protected else 0,
        update.reason,
        now_iso
    ))
    db.commit()

    return CategoryPreferenceRead(
        category=category,
        is_protected=update.is_protected,
        reason=update.reason,
        updated_at=now_iso
    )
