import pytest

def test_create_and_get_transaction(client):
    payload = {
        "user_id": "default_user",
        "transaction_date": "2026-05-24",
        "description": "Third Wave Coffee",
        "amount": 286.80,
        "direction": "spending",
        "category": "Dining"
    }
    # Create
    post_res = client.post("/transactions", json=payload)
    assert post_res.status_code == 201
    created = post_res.json()
    assert created["description"] == "Third Wave Coffee"
    assert created["amount"] == 286.80
    tx_id = created["id"]

    # Read
    get_res = client.get("/transactions?user_id=default_user")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["total"] == 1
    assert data["items"][0]["id"] == tx_id
    assert data["total_spending"] == 286.80

def test_patch_category_override(client):
    payload = {
        "user_id": "default_user",
        "transaction_date": "2026-05-20",
        "description": "Amazon Purchase",
        "amount": 1500.0,
        "direction": "spending",
        "category": "Uncategorized"
    }
    created = client.post("/transactions", json=payload).json()
    tx_id = created["id"]

    # Override category to Retail
    patch_res = client.patch(f"/transactions/{tx_id}?user_id=default_user", json={"category": "Retail"})
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["category"] == "Retail"
    assert updated["category_source"] == "user_override"

def test_delete_transaction(client):
    payload = {
        "user_id": "default_user",
        "transaction_date": "2026-05-18",
        "description": "Zepto",
        "amount": 420.0,
        "direction": "spending",
        "category": "Groceries"
    }
    tx_id = client.post("/transactions", json=payload).json()["id"]

    del_res = client.delete(f"/transactions/{tx_id}?user_id=default_user")
    assert del_res.status_code == 200

    # Ensure deleted
    get_res = client.get(f"/transactions?user_id=default_user")
    ids = [item["id"] for item in get_res.json()["items"]]
    assert tx_id not in ids

def test_cashflow_aggregation(client):
    # Seed 2 transactions across 2 months
    client.post("/transactions", json={
        "user_id": "default_user",
        "transaction_date": "2026-01-15",
        "description": "January Salary",
        "amount": 50000.0,
        "direction": "income",
        "category": "Income"
    })
    client.post("/transactions", json={
        "user_id": "default_user",
        "transaction_date": "2026-01-20",
        "description": "January Rent",
        "amount": 20000.0,
        "direction": "spending",
        "category": "Rent"
    })
    client.post("/transactions", json={
        "user_id": "default_user",
        "transaction_date": "2026-02-10",
        "description": "February Groceries",
        "amount": 5000.0,
        "direction": "spending",
        "category": "Groceries"
    })

    res = client.get("/transactions/cashflow?user_id=default_user&period=6m")
    assert res.status_code == 200
    data = res.json()
    assert data["total_income"] >= 50000.0
    assert data["total_spending"] >= 25000.0
    assert len(data["months"]) >= 2
    jan = next((m for m in data["months"] if m.get("month_key") == "2026-01" or m.get("month") == "Jan"), None)
    assert jan is not None
    assert jan["income"] == 50000.0
    assert jan["expense"] == 20000.0

def test_export_and_clear_transactions(client):
    # Export
    res = client.get("/transactions/export?user_id=default_user")
    assert res.status_code == 200
    assert "text/csv" in res.headers.get("content-type", "")
    assert "transaction_date,description,amount,direction,category" in res.text

    # Clear
    del_res = client.delete("/transactions?user_id=default_user")
    assert del_res.status_code == 200
    assert del_res.json()["deleted"] is True

    # Check empty
    get_res = client.get("/transactions?user_id=default_user")
    assert get_res.status_code == 200
    assert get_res.json()["total"] == 0

