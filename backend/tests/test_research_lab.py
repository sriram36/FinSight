import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.research_service import (
    get_dataset_audit,
    get_temporal_split,
    run_four_way_benchmark,
    run_perturbation_experiment,
)

client = TestClient(app)

def test_research_audit():
    audit = get_dataset_audit()
    assert audit["total_rows"] == 1000
    assert audit["unique_users"] == 10
    assert audit["date_min"] <= audit["date_max"]
    assert audit["total_credit"] > 0
    assert audit["total_debit"] > 0
    assert len(audit["categories"]) > 0

    # Also test API route
    res = client.get("/research/audit")
    assert res.status_code == 200
    data = res.json()
    assert data["total_rows"] == 1000

def test_temporal_split_no_leakage():
    split = get_temporal_split()
    assert split["no_temporal_leakage"] is True
    assert split["baseline_partition"]["row_count"] > 0
    assert split["holdout_partition"]["row_count"] > 0
    assert split["baseline_partition"]["row_count"] + split["holdout_partition"]["row_count"] == 1000
    
    # Assert temporal ordering
    baseline_max = split["baseline_partition"]["date_range"][1]
    holdout_min = split["holdout_partition"]["date_range"][0]
    assert baseline_max < holdout_min

    # API route
    res = client.get("/research/split")
    assert res.status_code == 200
    assert res.json()["no_temporal_leakage"] is True

def test_four_way_benchmark():
    configs = run_four_way_benchmark()
    assert len(configs) == 4
    config_map = {c["configuration"]: c for c in configs}

    assert "A" in config_map
    assert "B" in config_map
    assert "B-ablation" in config_map
    assert "C" in config_map

    # System C evidence and verification contracts
    c_res = config_map["C"]
    assert c_res["numeric_verification_pass_rate"] == 1.0
    assert c_res["hallucination_rate"] == 0.0
    assert c_res["protected_category_violations"] == 0
    assert c_res["evidence_grounded"] is True

    # System B has hallucinations and violations
    b_res = config_map["B"]
    assert b_res["hallucination_rate"] > 0.0
    assert b_res["protected_category_violations"] > 0

    # API route
    res = client.get("/research/benchmark")
    assert res.status_code == 200
    assert len(res.json()) == 4

def test_perturbation_experiment():
    res = run_perturbation_experiment(seed=42, target_category="Dining Out", delta_pct=150.0)
    assert res["random_seed"] == 42
    assert res["target_category"] == "Dining Out"
    assert res["post_perturbation_holdout_spend"] > res["pre_perturbation_holdout_spend"]
    
    evals = res["evaluations"]
    assert evals["Config_C"]["detected_shift"] is True
    assert evals["Config_C"]["identifies_exact_source_tx"] is True
    assert evals["Config_C"]["grounded_verification"] is True

    # API route
    resp = client.post("/research/perturbation", json={"seed": 42, "target_category": "Dining Out", "delta_pct": 150.0})
    assert resp.status_code == 200
    data = resp.json()
    assert data["evaluations"]["Config_C"]["grounded_verification"] is True

def test_defense_engine_metrics():
    res = client.get("/research/defense-metrics")
    assert res.status_code == 200
    data = res.json()
    assert "claim_verification_faithfulness_rate" in data
    assert data["claim_verification_faithfulness_rate"] == 1.0
    assert "constraint_satisfaction_accuracy" in data
    assert data["constraint_satisfaction_accuracy"] == 1.0
    assert "upi_clustering_coverage" in data
    assert data["upi_clustering_coverage"] >= 0.90

