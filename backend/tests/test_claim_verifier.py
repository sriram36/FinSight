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
    # Model hallucinated that the user spent ₹9,999 on Dining or 85% increase
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
    assert any(9999.0 in c for c in result.unsupported_claims) or any("9999" in str(c) for c in result.unsupported_claims)

def test_verifier_tolerance_for_rounding():
    # 29.99% rounded to 30% or ₹129.95 rounded to 130
    text = "Dining spending pace is ₹130/day (+30%)."
    evidence = {
        "recent_daily_pace": 129.95,
        "percentage_deviation": 29.98
    }
    result = verify_recommendation_claims(text, evidence)
    assert result.is_verified is True
