import pytest

def test_monthly_financial_review(client):
    # Seed transactions in March 2026
    client.post("/transactions", json={
        "user_id": "default_user",
        "transaction_date": "2026-03-01",
        "description": "Consulting Income",
        "amount": 50000.0,
        "direction": "income",
        "category": "Income"
    })
    client.post("/transactions", json={
        "user_id": "default_user",
        "transaction_date": "2026-03-10",
        "description": "Dining Bill",
        "amount": 2500.0,
        "direction": "spending",
        "category": "Dining Out"
    })

    # Call monthly review
    res = client.get("/review/monthly?month=2026-03&user_id=default_user")
    assert res.status_code == 200
    rev = res.json()
    assert rev["month"] == "2026-03"
    assert rev["total_income"] == 50000.0
    assert rev["total_spending"] == 2500.0
    assert rev["net_cash_flow"] == 47500.0
    assert "narrative" in rev
    assert "₹50,000.00" in rev["narrative"]
