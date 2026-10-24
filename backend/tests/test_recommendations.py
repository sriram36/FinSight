import pytest
from backend.services.recommendation_service import generate_recommendation
from backend.schemas.recommendation import RecommendationConfig

@pytest.fixture
def setup_rec_data(db):
    cursor = db.cursor()
    cursor.execute("INSERT OR IGNORE INTO users (id, name, created_at) VALUES ('rec_user', 'Rec User', '2026-01-01T00:00:00Z')")
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

def test_protected_category_not_recommended(db, setup_rec_data):
    cursor = db.cursor()
    # Protect Dining category
    cursor.execute("""
    INSERT INTO category_preferences (id, user_id, category, is_protected, reason, updated_at)
    VALUES ('pref_rec_d', 'rec_user', 'Dining', 1, 'Essential food', '2026-01-01T00:00:00Z')
    ON CONFLICT(user_id, category) DO UPDATE SET is_protected = 1
    """)
    db.commit()

    # System A should now NOT recommend Dining!
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
    assert "No category" in rec_a.action or rec_a.category in (None, "None")

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
