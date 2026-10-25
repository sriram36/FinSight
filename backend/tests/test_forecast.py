import pytest
from datetime import date, timedelta

def test_cash_flow_forecast(client):
    # Seed salary and regular expenses
    client.post("/transactions", json={
        "user_id": "default_user",
        "transaction_date": "2026-03-01",
        "description": "Corporate Salary",
        "amount": 75000.0,
        "direction": "income",
        "category": "Income"
    })
    client.post("/transactions", json={
        "user_id": "default_user",
        "transaction_date": "2026-03-02",
        "description": "Rent Transfer",
        "amount": 25000.0,
        "direction": "spending",
        "category": "Rent & Housing"
    })

    # Call forecast endpoint
    res = client.get("/forecast?horizon_days=30&starting_balance=10000&user_id=default_user")
    assert res.status_code == 200
    fc = res.json()
    assert fc["horizon_days"] == 30
    assert fc["starting_balance"] == 10000.0
    assert "projected_net_cash_flow" in fc
    assert "assumptions" in fc
    assert len(fc["assumptions"]) >= 1

def test_forecast_includes_confirmed_recurring_payments(client, db):
    # Insert an active recurring subscription due in 10 days
    today = date.today()
    due_date = (today + timedelta(days=10)).isoformat()
    cursor = db.cursor()
    cursor.execute("""
    INSERT INTO recurring_items (
        id, user_id, merchant, category, amount, frequency, next_due_date,
        last_seen_date, status, is_confirmed, confidence, notes, created_at
    ) VALUES (
        'rec_test_sub', 'default_user', 'Cloud Hosting Services', 'Subscriptions',
        2500.0, 'monthly', ?, ?, 'active', 1, 1.0, 'Monthly server fee', ?
    )
    """, (due_date, today.isoformat(), today.isoformat()))
    db.commit()

    # Call forecast for 30 days
    res = client.get("/forecast?horizon_days=30&user_id=default_user")
    assert res.status_code == 200
    data = res.json()
    
    # Must correctly include the 2500 obligation in upcoming_obligations_total
    assert data["upcoming_obligations_total"] >= 2500.0
    
    # Must find the event in events list with proper fields
    rec_event = next((e for e in data["events"] if e["name"] == "Cloud Hosting Services"), None)
    assert rec_event is not None
    assert rec_event["amount"] == -2500.0
    assert rec_event["date"] == due_date
    assert rec_event["is_confirmed"] is True
