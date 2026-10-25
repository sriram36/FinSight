import pytest

def test_anomaly_detection_and_review(client):
    # Seed a normal spending history for groceries
    for i in range(1, 6):
        client.post("/transactions", json={
            "user_id": "default_user",
            "transaction_date": f"2026-03-0{i}",
            "description": "Supermarket Store",
            "amount": 500.0,
            "direction": "spending",
            "category": "Groceries"
        })

    # Seed an unusually large grocery transaction (> 3x average)
    client.post("/transactions", json={
        "user_id": "default_user",
        "transaction_date": "2026-03-15",
        "description": "Supermarket Bulk Buy",
        "amount": 3200.0,
        "direction": "spending",
        "category": "Groceries"
    })

    # Trigger detection
    res = client.post("/anomalies/detect?user_id=default_user")
    assert res.status_code == 200
    alerts = res.json()
    assert len(alerts) >= 1

    large_alert = next((a for a in alerts if a["alert_type"] == "unusually_large"), None)
    assert large_alert is not None
    assert large_alert["amount"] == 3200.0
    assert large_alert["status"] == "new"

    # Review alert
    rev_res = client.post(f"/anomalies/{large_alert['id']}/review?user_id=default_user", json={
        "status": "reviewed",
        "notes": "Legitimate bulk shopping for family event"
    })
    assert rev_res.status_code == 200
    assert rev_res.json()["updated_status"] == "reviewed"

    # Verify summary
    summary_res = client.get("/anomalies/summary?user_id=default_user")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_alerts"] >= 1
