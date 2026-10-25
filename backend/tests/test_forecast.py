import pytest

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
