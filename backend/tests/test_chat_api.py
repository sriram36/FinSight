import pytest
from fastapi.testclient import TestClient
from backend.main import app

def test_chat_category_spending_query(client):
    # Seed sample transactions
    client.post("/transactions", json={
        "user_id": "default_user",
        "transaction_date": "2026-05-10",
        "description": "Starbucks Coffee",
        "amount": 450.0,
        "direction": "spending",
        "category": "Dining"
    })
    client.post("/transactions", json={
        "user_id": "default_user",
        "transaction_date": "2026-05-12",
        "description": "Swiggy Delivery",
        "amount": 750.0,
        "direction": "spending",
        "category": "Dining"
    })

    res = client.post("/chat/query", json={
        "user_id": "default_user",
        "message": "How much did I spend on dining?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert data["intent"] == "category_spending"
    assert data["facts"]["total_spent"] >= 1200.0
    assert data["facts"]["transaction_count"] >= 2
    assert data["is_verified"] is True
    assert len(data["cited_transactions"]) >= 2

def test_chat_affordability_query(client):
    # Seed income & expense
    client.post("/transactions", json={
        "user_id": "default_user",
        "transaction_date": "2026-05-01",
        "description": "Consulting Income",
        "amount": 80000.0,
        "direction": "income",
        "category": "Income"
    })
    client.post("/transactions", json={
        "user_id": "default_user",
        "transaction_date": "2026-05-05",
        "description": "House Rent",
        "amount": 25000.0,
        "direction": "spending",
        "category": "Rent"
    })

    res = client.post("/chat/query", json={
        "user_id": "default_user",
        "message": "Can I afford to buy a ₹15,000 laptop?"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == "affordability_check"
    assert data["facts"]["purchase_amount"] == 15000.0
    assert data["is_verified"] is True
    assert "verdict" in data["facts"]

def test_chat_empty_query_rejected(client):
    res = client.post("/chat/query", json={
        "user_id": "default_user",
        "message": "   "
    })
    assert res.status_code == 400
