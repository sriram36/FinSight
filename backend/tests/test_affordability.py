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
    assert "survival_p10" in data
    assert "survival_p90" in data
    assert data["survival_p10"] is not None
    assert data["survival_p90"] is not None


def test_affordability_behavioral_cap_enforcement(client, db):
    # Insert a BEHAVIORAL_CAP constraint with ₹700/week (₹100/day)
    cursor = db.cursor()
    cursor.execute("""
    INSERT INTO user_constraints (
        id, user_id, constraint_type, label, amount, due_day, is_active, metadata_json, created_at, updated_at
    ) VALUES ('cst_test_bcap', 'default_user', 'BEHAVIORAL_CAP', 'Late-Night Food Cap', 700.0, NULL, 1, '{}', '2026-01-01', '2026-01-01')
    """)
    # Insert a spending transaction to give daily burn
    cursor.execute("""
    INSERT INTO transactions (
        id, user_id, transaction_date, description, amount, direction, category, created_at
    ) VALUES ('tx_bcap_1', 'default_user', '2026-10-20', 'Swiggy Late Night', 3500.0, 'spending', 'Dining', '2026-10-20')
    """)
    db.commit()

    payload = {
        "user_id": "default_user",
        "purchase_amount": 5000.0,
        "available_balance": 50000.0,
        "emergency_buffer": 5000.0,
        "horizon_days": 30
    }
    res = client.post("/scenarios/affordability", json=payload)
    assert res.status_code == 200
    data = res.json()
    b_violations = [v for v in data.get("constraint_violations", []) if v.get("constraint_type") == "BEHAVIORAL_CAP"]
    assert len(b_violations) >= 1
    assert "Late-Night Food Cap" in b_violations[0]["label"]


