import pytest
import io
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import get_db

client = TestClient(app)

def test_full_system_e2e_flow():
    # 1. Health check
    health_res = client.get("/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "ok"

    user_id = f"e2e_user_{uuid.uuid4().hex[:8]}"

    # Insert user in db to satisfy foreign key constraints
    from backend.database import get_connection
    conn = get_connection()
    now_iso = datetime.now(timezone.utc).isoformat()
    conn.cursor().execute("INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)", (user_id, "E2E User", f"{user_id}@example.com", now_iso))
    conn.commit()
    conn.close()

    # 2. CSV Import Flow
    csv_content = """Date,Description,Amount,Type
2026-01-10,Salary Credit,85000.00,Credit
2026-01-15,Swiggy Restaurant,1000.00,Debit
2026-01-20,BigBasket Grocery,3400.00,Debit
2026-02-05,Apartment Rent,28000.00,Debit
2026-02-12,Swiggy Lunch,1500.00,Debit
2026-02-18,Swiggy Dinner,2000.00,Debit
"""
    files = {"file": ("bank_statement.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    data = {"user_id": user_id}
    preview_res = client.post("/imports/preview", files=files, data=data)
    assert preview_res.status_code == 200
    preview_data = preview_res.json()
    assert preview_data["total_rows"] == 6
    assert preview_data["accepted_rows"] == 6

    valid_txs = [
        {
            "user_id": user_id,
            "transaction_date": r["mapped_date"],
            "description": r["mapped_description"],
            "amount": r["mapped_amount"],
            "direction": r["mapped_direction"],
            "category": r["mapped_category"] or "Uncategorized"
        }
        for r in preview_data["sample_preview"]
        if r["status"] == "valid"
    ]
    assert len(valid_txs) == 6

    confirm_res = client.post("/imports/confirm", json={
        "user_id": user_id,
        "file_name": "bank_statement.csv",
        "transactions": valid_txs
    })
    assert confirm_res.status_code == 200
    assert confirm_res.json()["accepted_count"] == 6

    # 3. Transaction List & CRUD
    tx_res = client.get(f"/transactions?user_id={user_id}")
    assert tx_res.status_code == 200
    tx_list = tx_res.json()
    assert tx_list["total"] == 6
    target_tx = [t for t in tx_list["items"] if "BigBasket" in t["description"]][0]

    # Category override PATCH
    patch_res = client.patch(f"/transactions/{target_tx['id']}?user_id={user_id}", json={
        "category": "Groceries"
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["category"] == "Groceries"

    # 4. Spending Profile with Normalized Baseline Math
    profile_res = client.get(
        f"/profile?user_id={user_id}&baseline_start=2026-01-01&baseline_end=2026-01-31&recent_start=2026-02-01&recent_end=2026-02-28"
    )
    assert profile_res.status_code == 200
    profile_data = profile_res.json()
    assert profile_data["baseline_days"] > 0
    assert profile_data["recent_days"] > 0
    assert "categories" in profile_data

    # 5. Goal Creation & Protected Category
    future_date = (datetime.now(timezone.utc) + timedelta(days=180)).strftime("%Y-%m-%d")
    goal_res = client.post("/goals", json={
        "user_id": user_id,
        "title": "Emergency Fund",
        "target_amount": 50000.0,
        "current_amount": 10000.0,
        "target_date": future_date
    })
    assert goal_res.status_code == 201
    goal_data = goal_res.json()
    assert goal_data["title"] == "Emergency Fund"
    assert goal_data["monthly_needed"] > 0

    # Protect Healthcare category
    pref_res = client.patch(f"/preferences/categories/Healthcare?user_id={user_id}", json={
        "is_protected": True,
        "reason": "Vital health coverage"
    })
    assert pref_res.status_code == 200
    assert pref_res.json()["is_protected"] is True

    # 6. Multi-Configuration Recommendations (System C)
    rec_res = client.post("/recommendations/generate", json={
        "user_id": user_id,
        "configuration": "C",
        "baseline_start": "2026-01-01",
        "baseline_end": "2026-01-31",
        "recent_start": "2026-02-01",
        "recent_end": "2026-02-28"
    })
    assert rec_res.status_code == 200
    rec_data = rec_res.json()
    assert rec_data["configuration"] == "C"
    assert rec_data["is_verified"] is True
    assert len(rec_data["evidence"]["source_transaction_ids"]) > 0

    # Evidence drill-down endpoint
    evidence_res = client.get(f"/recommendations/{rec_data['id']}/evidence?user_id={user_id}")
    assert evidence_res.status_code == 200
    ev_data = evidence_res.json()
    assert ev_data["is_verified"] is True
    assert len(ev_data["source_transactions"]) > 0

    # 7. "Can I Afford This?" Affordability Simulation
    sim_res = client.post("/scenarios/affordability", json={
        "user_id": user_id,
        "purchase_amount": 5000.0,
        "available_balance": 60000.0,
        "upcoming_obligations": 20000.0,
        "emergency_buffer": 10000.0
    })
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["verdict"] == "comfortable"
    assert sim_data["uncommitted_before"] > 0
    assert sim_data["post_purchase_remainder"] > 0

    # 8. Research Lab Endpoints
    audit_res = client.get("/research/audit")
    assert audit_res.status_code == 200
    assert audit_res.json()["total_rows"] == 1000

    split_res = client.get("/research/split")
    assert split_res.status_code == 200
    assert split_res.json()["no_temporal_leakage"] is True

    bench_res = client.get("/research/benchmark")
    assert bench_res.status_code == 200
    assert len(bench_res.json()) == 4

    pert_res = client.post("/research/perturbation", json={
        "seed": 42,
        "target_category": "Dining Out",
        "delta_pct": 150.0
    })
    assert pert_res.status_code == 200
    assert pert_res.json()["evaluations"]["Config_C"]["grounded_verification"] is True
