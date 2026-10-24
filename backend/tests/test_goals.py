import pytest

def test_goal_creation_and_feasibility(client, db):
    # Setup user income and spend
    # Income: 80,000, Protected Rent: 25,000, Groceries: 15,000 (total spend 40,000 -> net surplus 40,000)
    cursor = db.cursor()
    cursor.execute("""
    INSERT INTO transactions (id, user_id, transaction_date, description, amount, direction, category, created_at)
    VALUES ('tx_inc', 'default_user', '2026-05-01', 'Salary', 80000.0, 'income', 'Income', '2026-05-01T00:00:00Z')
    """)
    cursor.execute("""
    INSERT INTO transactions (id, user_id, transaction_date, description, amount, direction, category, created_at)
    VALUES ('tx_rent', 'default_user', '2026-05-02', 'Rent', 25000.0, 'spending', 'Rent/Mortgage', '2026-05-02T00:00:00Z')
    """)
    cursor.execute("""
    INSERT INTO transactions (id, user_id, transaction_date, description, amount, direction, category, created_at)
    VALUES ('tx_groc', 'default_user', '2026-05-03', 'Groceries', 15000.0, 'spending', 'Groceries', '2026-05-03T00:00:00Z')
    """)
    db.commit()

    # Protect Rent
    pref_res = client.patch("/preferences/categories/Rent/Mortgage?user_id=default_user", json={"is_protected": True, "reason": "Essential"})
    assert pref_res.status_code == 200
    assert pref_res.json()["is_protected"] is True

    from datetime import datetime, timedelta, timezone
    future_date = (datetime.now(timezone.utc) + timedelta(days=180)).strftime("%Y-%m-%d")

    # Create feasible goal: Save 60,000 in 6 months (requires ~10,000/mo, surplus is ~13,333)
    goal_payload = {
        "user_id": "default_user",
        "title": "Emergency Fund",
        "target_amount": 60000.0,
        "current_amount": 0.0,
        "target_date": future_date
    }
    goal_res = client.post("/goals", json=goal_payload)
    assert goal_res.status_code == 201
    g = goal_res.json()
    assert g["title"] == "Emergency Fund"
    assert g["is_feasible"] is True
    assert g["monthly_needed"] > 0


def test_goal_conflict_detection(client, db):
    # Goal requires 1,00,000 per month, far exceeding available cashflow
    goal_payload = {
        "user_id": "default_user",
        "title": "Supercar",
        "target_amount": 1000000.0,
        "current_amount": 0.0,
        "target_date": "2026-06-01"
    }
    goal_res = client.post("/goals", json=goal_payload)
    assert goal_res.status_code == 201
    g = goal_res.json()
    assert g["is_feasible"] is False
    assert g["shortfall"] > 0
    assert "Shortfall" in g["feasibility_notes"]
