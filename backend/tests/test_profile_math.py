import pytest
from datetime import datetime, timedelta
from backend.services.profile_service import calculate_spending_profile
from backend.schemas.transaction import TransactionDirection

def test_profile_calculation_with_unequal_windows(db):
    cursor = db.cursor()
    cursor.execute("INSERT OR IGNORE INTO users (id, name, created_at) VALUES ('user_test', 'Test User', '2026-01-01T00:00:00Z')")
    # Insert baseline transactions (60 days window: 2026-03-01 to 2026-04-30)

    # Total Dining = 6000 over 60 days -> 100/day
    for day in range(1, 31):
        d_str = f"2026-03-{day:02d}"
        cursor.execute("""
        INSERT INTO transactions (id, user_id, transaction_date, description, amount, direction, category, created_at)
        VALUES (?, 'user_test', ?, 'Cafe', 100.0, 'spending', 'Dining', '2026-03-01T00:00:00Z')
        """, (f"tx_b1_{day}", d_str))
        cursor.execute("""
        INSERT INTO transactions (id, user_id, transaction_date, description, amount, direction, category, created_at)
        VALUES (?, 'user_test', ?, 'Cafe', 100.0, 'spending', 'Dining', '2026-03-01T00:00:00Z')
        """, (f"tx_b2_{day}", f"2026-04-{day:02d}"))

    # Recent transactions (30 days window: 2026-05-01 to 2026-05-30)
    # Total Dining = 3600 over 30 days -> 120/day (+20% deviation)
    for day in range(1, 31):
        cursor.execute("""
        INSERT INTO transactions (id, user_id, transaction_date, description, amount, direction, category, created_at)
        VALUES (?, 'user_test', ?, 'Cafe', 120.0, 'spending', 'Dining', '2026-05-01T00:00:00Z')
        """, (f"tx_r_{day}", f"2026-05-{day:02d}"))
    db.commit()

    profile = calculate_spending_profile(
        user_id="user_test",
        baseline_start="2026-03-01",
        baseline_end="2026-04-30",
        recent_start="2026-05-01",
        recent_end="2026-05-30",
        db=db
    )

    assert profile.baseline_days == 61
    assert profile.recent_days == 30
    dining = profile.categories.get("Dining")
    assert dining is not None
    assert round(dining.recent_daily_pace, 2) == 120.00
    # Normalized baseline for 30 days should be around ~100/day * 30 = ~3000
    assert round(dining.normalized_baseline, 0) == round(dining.baseline_daily_pace * 30, 0)
    # Deviation should be positive (~+22%)
    assert dining.percentage_deviation is not None
    assert dining.percentage_deviation > 15.0

def test_profile_zero_baseline_safety(db):
    cursor = db.cursor()
    cursor.execute("INSERT OR IGNORE INTO users (id, name, created_at) VALUES ('user_zero', 'Zero User', '2026-01-01T00:00:00Z')")
    # Insert recent transactions only, zero baseline

    cursor.execute("""
    INSERT INTO transactions (id, user_id, transaction_date, description, amount, direction, category, created_at)
    VALUES ('tx_new_1', 'user_zero', '2026-05-15', 'Zara', 2500.0, 'spending', 'Retail', '2026-05-15T00:00:00Z')
    """)
    db.commit()

    profile = calculate_spending_profile(
        user_id="user_zero",
        baseline_start="2026-03-01",
        baseline_end="2026-04-30",
        recent_start="2026-05-01",
        recent_end="2026-05-30",
        db=db
    )
    retail = profile.categories.get("Retail")
    assert retail is not None
    assert retail.is_low_baseline is True
    assert retail.percentage_deviation is None  # Must not crash or be +9999%


def test_true_safe_to_spend_with_behavioral_cap(db):
    from backend.services.profile_service import calculate_true_safe_to_spend
    cursor = db.cursor()
    cursor.execute("INSERT OR IGNORE INTO users (id, name, created_at) VALUES ('user_bcap', 'BCap User', '2026-01-01T00:00:00Z')")
    cursor.execute("""
    INSERT INTO user_constraints (
        id, user_id, constraint_type, label, amount, due_day, is_active, metadata_json, created_at, updated_at
    ) VALUES ('cst_bcap_1', 'user_bcap', 'BEHAVIORAL_CAP', 'Dining Weekly Limit', 350.0, NULL, 1, '{}', '2026-01-01', '2026-01-01')
    """)
    # Insert income and essential spend
    cursor.execute("""
    INSERT INTO transactions (id, user_id, transaction_date, description, amount, direction, category, created_at)
    VALUES ('tx_inc_1', 'user_bcap', '2026-10-01', 'Salary', 50000.0, 'income', 'Income', '2026-10-01')
    """)
    cursor.execute("""
    INSERT INTO transactions (id, user_id, transaction_date, description, amount, direction, category, created_at)
    VALUES ('tx_sp_1', 'user_bcap', '2026-10-05', 'Groceries', 6000.0, 'spending', 'Groceries', '2026-10-05')
    """)
    db.commit()

    sts = calculate_true_safe_to_spend('user_bcap', db, raw_balance=44000.0)
    assert sts.safe_to_spend_today > 0
    assert hasattr(sts, 'behavioral_cap_violations')
    assert len(sts.behavioral_cap_violations) >= 1
    assert "Dining Weekly Limit" in sts.behavioral_cap_violations[0]["label"]

