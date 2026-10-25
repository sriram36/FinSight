import pytest
from fastapi.testclient import TestClient
from backend.main import app

def test_budget_crud_lifecycle(client):
    # 1. Create a budget limit for Dining
    res = client.post("/budgets", json={
        "user_id": "default_user",
        "category": "Dining",
        "monthly_limit": 10000.0
    })
    assert res.status_code == 200
    b_data = res.json()
    assert b_data["category"] == "Dining"
    assert b_data["monthly_limit"] == 10000.0
    budget_id = b_data["id"]

    # 2. Add sample transactions to test MTD spend and burn pace calculation
    client.post("/transactions", json={
        "user_id": "default_user",
        "transaction_date": "2026-05-10",
        "description": "Starbucks Coffee",
        "amount": 2500.0,
        "direction": "spending",
        "category": "Dining"
    })

    # 3. Get summary
    res_summary = client.get("/budgets/summary?user_id=default_user")
    assert res_summary.status_code == 200
    s_data = res_summary.json()
    assert s_data["total_budgeted"] >= 10000.0
    assert s_data["budget_count"] >= 1

    # 4. List budgets
    res_list = client.get("/budgets?user_id=default_user")
    assert res_list.status_code == 200
    items = res_list.json()
    dining_bgt = next((b for b in items if b["category"] == "Dining"), None)
    assert dining_bgt is not None
    assert dining_bgt["monthly_limit"] == 10000.0
    assert "status" in dining_bgt
    assert "projected_spend" in dining_bgt

    # 5. Delete budget
    del_res = client.delete(f"/budgets/{budget_id}?user_id=default_user")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"
