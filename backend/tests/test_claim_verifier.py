import pytest
from backend.services.verifier_service import verify_recommendation_claims

def test_verifier_passes_on_grounded_text():
    reason = "Your recent Dining spending pace is ₹130.00/day, which is 30.0% above your baseline pace of ₹100.00/day."
    action = "Consider capping Dining spending by ₹900.00/month."
    evidence = {
        "recent_daily_pace": 130.0,
        "baseline_daily_pace": 100.0,
        "percentage_deviation": 30.0,
        "expected_impact": 900.0,
        "recent_amount": 3900.0,
        "baseline_amount": 3000.0
    }

    result = verify_recommendation_claims(f"{action} {reason}", evidence)
    assert result.is_verified is True
    assert len(result.unsupported_claims) == 0
    assert len(result.matched_claims) >= 3

def test_verifier_fails_on_hallucinated_number():
    hallucinated_text = "Your Dining spend spiked by 85% reaching ₹9,999.00."
    evidence = {
        "recent_daily_pace": 130.0,
        "baseline_daily_pace": 100.0,
        "percentage_deviation": 30.0,
        "expected_impact": 900.0
    }

    result = verify_recommendation_claims(hallucinated_text, evidence)
    assert result.is_verified is False
    assert len(result.unsupported_claims) > 0
    assert any("9999" in str(c) for c in result.unsupported_claims)

def test_verifier_tolerance_for_rounding():
    # 29.98% within 1% tolerance of 30%
    text = "Dining spending pace is ₹130.00/day (+30.0%)."
    evidence = {
        "recent_daily_pace": 129.95,
        "percentage_deviation": 29.98
    }
    result = verify_recommendation_claims(text, evidence, tolerance=0.01)
    assert result.is_verified is True

def test_verifier_unit_discipline():
    # A currency claim of ₹25 must NOT match a percentage of 25.0%
    text = "Save ₹25 by cooking at home."
    evidence = {
        "percentage_deviation": 25.0
    }
    result = verify_recommendation_claims(text, evidence)
    assert result.is_verified is False
    assert len(result.unsupported_claims) == 1
    assert result.unsupported_claims[0]["unit"] == "currency"

def test_verifier_strips_transaction_ids():
    # Transaction IDs like syn_tx_0072 or tx_seed_1234 should not be parsed as numerical claims
    text = "Review outings syn_tx_0072 and tx_seed_1234 to save ₹500.00."
    evidence = {
        "expected_impact": 500.00
    }
    result = verify_recommendation_claims(text, evidence)
    assert result.is_verified is True
    assert len(result.unsupported_claims) == 0
    assert len(result.matched_claims) == 1
    assert result.matched_claims[0]["value"] == 500.00

def test_verifier_temporal_literals_isolated():
    # "30 days" is skipped, but bare "30" without a time unit is treated as a claim
    text_with_days = "Evaluate spending over 30 days to recover ₹400.00."
    evidence = {"monthly_impact": 400.00}
    assert verify_recommendation_claims(text_with_days, evidence).is_verified is True

    text_bare_number = "Reduce outings by 30 to recover ₹400.00."
    # 30 without days is an unsupported claim
    res = verify_recommendation_claims(text_bare_number, evidence)
    assert res.is_verified is False
    assert any(u["value"] == 30.0 for u in res.unsupported_claims)
