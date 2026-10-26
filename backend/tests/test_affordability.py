import pytest

def test_affordability_missing_balance_warning(client):
    payload = {
        "user_id": "default_user",
        "purchase_amount": 15000.0,
        "available_balance": None
    }
    res = client.post("/scenarios/affordability", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["verdict"] == "incomplete_data"
    assert "available_balance" in data["missing_inputs"]
    assert "confirmed" in data["summary"].lower()

def test_affordability_comfortable_purchase(client, db):
    # Available balance 1,00,000, obligations 20,000, buffer 15,000 -> 65,000 uncommitted
    # Purchase 15,000 -> Remainder 50,000
    payload = {
        "user_id": "default_user",
        "purchase_amount": 15000.0,
        "available_balance": 100000.0,
        "upcoming_obligations": 20000.0,
        "emergency_buffer": 15000.0
    }
    res = client.post("/scenarios/affordability", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["verdict"] == "comfortable"
    assert data["post_purchase_remainder"] == 50000.0

def test_affordability_caution_disrupts_buffer(client):
    # Available balance 30,000, obligations 15,000, buffer 10,000 -> 5,000 uncommitted
    # Purchase 12,000 -> Post-purchase remainder -7,000 (eats into buffer)
    payload = {
        "user_id": "default_user",
        "purchase_amount": 12000.0,
        "available_balance": 30000.0,
        "upcoming_obligations": 15000.0,
        "emergency_buffer": 10000.0
    }
    res = client.post("/scenarios/affordability", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["verdict"] == "caution"
    assert data["post_purchase_remainder"] < 0

def test_affordability_stress_test_emi(client):
    payload = {
        "user_id": "default_user",
        "purchase_amount": 60000.0,
        "available_balance": 45000.0,
        "upcoming_obligations": 10000.0,
        "emergency_buffer": 5000.0,
        "is_emi": True,
        "tenure_months": 6,
        "horizon_days": 60
    }
    res = client.post("/scenarios/affordability", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "survival_probability" in data
    assert 0.0 <= data["survival_probability"] <= 100.0
    assert "constraint_violations" in data
    assert "runway_timeline" in data
    assert len(data["runway_timeline"]) > 0
    assert "counterfactual_alternatives" in data

