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
    assert rev["days_in_month"] == 31
    assert rev["has_prior_month_data"] is False
    assert "first recorded period with no prior baseline" in rev["narrative"]

def test_monthly_review_current_partial_month(client):
    from datetime import date
    today = date.today()
    curr_month = today.strftime("%Y-%m")

    client.post("/transactions", json={
        "user_id": "default_user",
        "transaction_date": f"{curr_month}-01",
        "description": "Salary",
        "amount": 75000.0,
        "direction": "income",
        "category": "Income"
    })

    res = client.get(f"/review/monthly?month={curr_month}&user_id=default_user")
    assert res.status_code == 200
    rev = res.json()
    assert rev["is_partial_month"] is True
    assert rev["days_elapsed"] == min(today.day, rev["days_in_month"])
    assert f"Through day {rev['days_elapsed']} of {curr_month} (month in progress)" in rev["narrative"]

