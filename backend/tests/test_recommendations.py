import pytest
from unittest.mock import patch, MagicMock
from backend.services.recommendation_service import generate_recommendation
from backend.services.llm_service import generate_llm_recommendation, get_openai_client
from backend.schemas.recommendation import RecommendationConfig

@pytest.fixture
def setup_rec_data(db):
    cursor = db.cursor()
    cursor.execute("INSERT INTO users (id, name, created_at) VALUES ('rec_user', 'Rec User', '2026-01-01T00:00:00Z') ON CONFLICT(id) DO NOTHING")
    for d in range(1, 31):
        cursor.execute("""
        INSERT INTO transactions (id, user_id, transaction_date, description, amount, direction, category, created_at)
        VALUES (?, 'rec_user', ?, 'Cafe', 100.0, 'spending', 'Dining', '2026-03-01T00:00:00Z')
        """, (f"tx_rec_b_{d}", f"2026-03-{d:02d}"))
        cursor.execute("""
        INSERT INTO transactions (id, user_id, transaction_date, description, amount, direction, category, created_at)
        VALUES (?, 'rec_user', ?, 'Cafe', 130.0, 'spending', 'Dining', '2026-04-01T00:00:00Z')
        """, (f"tx_rec_r_{d}", f"2026-04-{d:02d}"))
    db.commit()

def test_system_a_threshold_rule(db, setup_rec_data):
    rec_a = generate_recommendation(
        user_id="rec_user",
        config=RecommendationConfig.SYSTEM_A,
        baseline_start="2026-03-01",
        baseline_end="2026-03-30",
        recent_start="2026-04-01",
        recent_end="2026-04-30",
        db=db
    )
    assert rec_a.category == "Dining"
    assert "Dining" in rec_a.action
    assert rec_a.evidence["percentage_deviation"] == 30.0
    assert rec_a.is_verified is True
    assert "Deterministic Rule" in rec_a.verifier_notes

def test_system_a_below_threshold(db):
    # Spending changed by less than 25% (e.g. from 100 to 110 = +10%)
    cursor = db.cursor()
    cursor.execute("INSERT INTO users (id, name, created_at) VALUES ('low_user', 'Low User', '2026-01-01T00:00:00Z') ON CONFLICT(id) DO NOTHING")
    for d in range(1, 31):
        cursor.execute("INSERT INTO transactions (id, user_id, transaction_date, description, amount, direction, category, created_at) VALUES (?, 'low_user', ?, 'Coffee', 100.0, 'spending', 'Dining', '2026-03-01T00:00:00Z')", (f"tx_l_b_{d}", f"2026-03-{d:02d}"))
        cursor.execute("INSERT INTO transactions (id, user_id, transaction_date, description, amount, direction, category, created_at) VALUES (?, 'low_user', ?, 'Coffee', 110.0, 'spending', 'Dining', '2026-04-01T00:00:00Z')", (f"tx_l_r_{d}", f"2026-04-{d:02d}"))
    db.commit()

    rec_a = generate_recommendation(
        user_id="low_user",
        config=RecommendationConfig.SYSTEM_A,
        baseline_start="2026-03-01",
        baseline_end="2026-03-30",
        recent_start="2026-04-01",
        recent_end="2026-04-30",
        db=db
    )
    assert rec_a.category == "None"
    assert "25%" in rec_a.action

def test_system_b_recommendation(db, setup_rec_data):
    rec_b = generate_recommendation(
        user_id="rec_user",
        config=RecommendationConfig.SYSTEM_B,
        baseline_start="2026-03-01",
        baseline_end="2026-03-30",
        recent_start="2026-04-01",
        recent_end="2026-04-30",
        db=db
    )
    assert rec_b.configuration == "B"
    assert rec_b.category == "Dining"
    assert rec_b.expected_impact is not None
    assert rec_b.expected_impact > 0

def test_system_b_ablation_recommendation(db, setup_rec_data):
    rec_abl = generate_recommendation(
        user_id="rec_user",
        config=RecommendationConfig.SYSTEM_B_ABLATION,
        baseline_start="2026-03-01",
        baseline_end="2026-03-30",
        recent_start="2026-04-01",
        recent_end="2026-04-30",
        db=db
    )
    assert rec_abl.configuration == "B-ablation"
    assert rec_abl.category == "Dining"
    assert rec_abl.evidence == {}
    assert rec_abl.expected_impact is None

def test_protected_category_not_recommended(db, setup_rec_data):
    cursor = db.cursor()
    # Protect Dining category
    cursor.execute("""
    INSERT INTO category_preferences (id, user_id, category, is_protected, reason, updated_at)
    VALUES ('pref_rec_d', 'rec_user', 'Dining', 1, 'Essential food', '2026-01-01T00:00:00Z')
    ON CONFLICT(user_id, category) DO UPDATE SET is_protected = 1
    """)
    db.commit()

    rec_a = generate_recommendation(
        user_id="rec_user",
        config=RecommendationConfig.SYSTEM_A,
        baseline_start="2026-03-01",
        baseline_end="2026-03-30",
        recent_start="2026-04-01",
        recent_end="2026-04-30",
        db=db
    )
    assert rec_a.category != "Dining"
    assert "No category" in rec_a.action or rec_a.category == "None"

def test_system_c_structured_grounding(db, setup_rec_data):
    # Unprotect Dining
    cursor = db.cursor()
    cursor.execute("UPDATE category_preferences SET is_protected = 0 WHERE user_id = 'rec_user' AND category = 'Dining'")
    db.commit()

    rec_c = generate_recommendation(
        user_id="rec_user",
        config=RecommendationConfig.SYSTEM_C,
        baseline_start="2026-03-01",
        baseline_end="2026-03-30",
        recent_start="2026-04-01",
        recent_end="2026-04-30",
        db=db
    )
    assert rec_c.configuration == "C"
    assert rec_c.category == "Dining"
    assert rec_c.evidence["recent_amount"] == 3900.0
    assert rec_c.evidence["baseline_amount"] == 3000.0
    assert rec_c.expected_impact is not None
    assert rec_c.expected_impact > 0
    assert rec_c.is_verified is True
    assert "verified" in rec_c.verifier_notes.lower()

def test_empty_eligible_categories(db):
    cursor = db.cursor()
    cursor.execute("INSERT INTO users (id, name, created_at) VALUES ('empty_user', 'Empty User', '2026-01-01T00:00:00Z') ON CONFLICT(id) DO NOTHING")
    db.commit()

    # When no transactions exist, all configurations should handle gracefully
    rec_c = generate_recommendation(
        user_id="empty_user",
        config=RecommendationConfig.SYSTEM_C,
        baseline_start="2026-03-01",
        baseline_end="2026-03-30",
        recent_start="2026-04-01",
        recent_end="2026-04-30",
        db=db
    )
    assert rec_c.category == "None"
    assert rec_c.is_verified is True

    rec_b = generate_recommendation(
        user_id="empty_user",
        config=RecommendationConfig.SYSTEM_B,
        baseline_start="2026-03-01",
        baseline_end="2026-03-30",
        recent_start="2026-04-01",
        recent_end="2026-04-30",
        db=db
    )
    assert rec_b.category == "None"

    rec_abl = generate_recommendation(
        user_id="empty_user",
        config=RecommendationConfig.SYSTEM_B_ABLATION,
        baseline_start="2026-03-01",
        baseline_end="2026-03-30",
        recent_start="2026-04-01",
        recent_end="2026-04-30",
        db=db
    )
    assert rec_abl.category == "None"

def test_llm_service_with_mock():
    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = '{"action": "Cap dining outings by ₹500.00.", "reason": "Pace exceeded target by 20.0%.", "expected_impact": 500.0, "cited_transaction_ids": ["tx_1"], "assumptions": ["Stable income"]}'
    mock_response = MagicMock(choices=[mock_choice])
    mock_client.chat.completions.create.return_value = mock_response

    with patch("backend.services.llm_service.get_openai_client", return_value=mock_client):
        res = generate_llm_recommendation(
            config=RecommendationConfig.SYSTEM_C,
            category="Dining",
            evidence={"expected_impact": 500.0},
            profile_summary={"baseline_days": 60, "recent_days": 30}
        )
        assert res["is_llm_generated"] is True
        assert res["llm_provider"] == "azure_openai"
        assert res["expected_impact"] == 500.0

def test_portfolio_insights_generation(db, setup_rec_data):
    from backend.services.recommendation_service import generate_portfolio_insights
    cursor = db.cursor()
    cursor.execute("""
    INSERT INTO goals (id, user_id, title, target_amount, current_amount, target_date, status, created_at)
    VALUES ('goal_rec_test', 'rec_user', 'Emergency Reserve', 50000.0, 15000.0, '2026-12-31', 'active', '2026-01-01T00:00:00Z')
    ON CONFLICT(id) DO NOTHING
    """)
    db.commit()

    insights = generate_portfolio_insights(user_id="rec_user", db=db)
    assert len(insights) >= 1
    for ins in insights:
        assert ins.user_id == "rec_user"
        assert ins.is_verified is True
        assert ins.action != ""
        assert ins.reason != ""
