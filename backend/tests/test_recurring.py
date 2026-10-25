import pytest
from fastapi.testclient import TestClient
from backend.main import app

def test_recurring_detection_and_schedule(client):
    # Seed repeated monthly charges
    client.post("/transactions", json={
        "user_id": "default_user",
        "transaction_date": "2026-03-05",
        "description": "Netflix Subscription",
        "amount": 649.0,
        "direction": "spending",
        "category": "Subscriptions"
    })
    client.post("/transactions", json={
        "user_id": "default_user",
        "transaction_date": "2026-04-05",
        "description": "Netflix Subscription",
        "amount": 799.0,
        "direction": "spending",
        "category": "Subscriptions"
    })

    # Trigger detection
    res = client.post("/recurring/detect?user_id=default_user")
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 1

    netflix_item = next((i for i in items if "netflix" in i["merchant"].lower()), None)
    assert netflix_item is not None
    assert netflix_item["frequency"] == "monthly"
    assert netflix_item["amount"] == 799.0
    # Price hike detected
    assert netflix_item["notes"] is not None
    assert "increased" in netflix_item["notes"].lower()

    # Confirm recurring item
    confirm_res = client.post(f"/recurring/{netflix_item['id']}/confirm", json={
        "user_id": "default_user",
        "is_confirmed": True
    })
    assert confirm_res.status_code == 200
    assert confirm_res.json()["is_confirmed"] is True

    # Check upcoming schedule
    sched_res = client.get("/recurring/upcoming?user_id=default_user&horizon_days=60")
    assert sched_res.status_code == 200
    sched_data = sched_res.json()
    assert "total_upcoming" in sched_data
    assert "items" in sched_data
