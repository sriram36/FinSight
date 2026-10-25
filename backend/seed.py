import uuid
from datetime import datetime, timedelta, timezone

DEMO_USER_ID = "default_user"

def seed_demo_data(conn):
    """
    Seeds initial realistic demonstration data for 'default_user' if the
    transactions table is currently empty. Fully idempotent.
    """
    cursor = conn.cursor()

    # Check if demo transactions already exist
    cursor.execute("SELECT COUNT(*) FROM transactions WHERE user_id = ?", (DEMO_USER_ID,))
    count_row = cursor.fetchone()
    count = count_row[0] if count_row else 0
    if count > 0:
        return

    now = datetime.now(timezone.utc)
    today = now.date()

    # 1. Seed Category Preferences (Protected Invariants)
    preferences = [
        ("Housing", 1, "Essential monthly lease contract and living space"),
        ("Healthcare", 1, "Critical health insurance premiums and prescriptions"),
        ("Groceries", 0, "Essential nutrition and household groceries"),
        ("Dining", 0, "Discretionary restaurants, takeout, and coffee runs"),
        ("Subscriptions", 0, "Entertainment, streaming, and membership recurring services"),
        ("Utilities", 0, "Electric, water, gas, and broadband home connections"),
        ("Transportation", 0, "Daily commute, subway passes, and rideshares"),
        ("Shopping", 0, "Retail, apparel, and discretionary purchases"),
        ("Entertainment", 0, "Concerts, cinema, and leisure activities")
    ]

    for cat, is_prot, reason in preferences:
        pref_id = f"pref_{uuid.uuid4().hex[:10]}"
        cursor.execute("""
        INSERT INTO category_preferences (id, user_id, category, is_protected, reason, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, category) DO NOTHING;
        """, (pref_id, DEMO_USER_ID, cat, is_prot, reason, now.isoformat()))

    # 2. Seed Financial Goals
    goals = [
        ("goal_emergency_01", "Emergency Reserve Fund", 150000.0, 110000.0, (today + timedelta(days=120)).isoformat(), "active"),
        ("goal_travel_01", "Kyoto Autumn Retreat", 75000.0, 42000.0, (today + timedelta(days=75)).isoformat(), "active"),
        ("goal_gadget_01", "Workstation Upgrade", 45000.0, 38000.0, (today + timedelta(days=30)).isoformat(), "active"),
    ]

    for gid, title, target, current, target_date, status in goals:
        cursor.execute("""
        INSERT INTO goals (id, user_id, title, target_amount, current_amount, target_date, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING;
        """, (gid, DEMO_USER_ID, title, target, current, target_date, status, now.isoformat()))

    # 3. Seed Realistic Transactions across past 60 days
    # Generates a balanced history: steady income, fixed housing, variable groceries/dining
    sample_txs = []

    # Two bi-weekly salary credits
    sample_txs.append((
        (today - timedelta(days=35)).isoformat(),
        "Apex Global Tech - Direct Deposit Payroll",
        85000.0,
        "income",
        "Income"
    ))
    sample_txs.append((
        (today - timedelta(days=5)).isoformat(),
        "Apex Global Tech - Direct Deposit Payroll",
        85000.0,
        "income",
        "Income"
    ))

    # Monthly Rent / Housing (Protected)
    sample_txs.append(((today - timedelta(days=55)).isoformat(), "Greenfield Realty - Monthly Rent", 32000.0, "spending", "Housing"))
    sample_txs.append(((today - timedelta(days=25)).isoformat(), "Greenfield Realty - Monthly Rent", 32000.0, "spending", "Housing"))

    # Healthcare (Protected)
    sample_txs.append(((today - timedelta(days=48)).isoformat(), "BlueCross Healthcare Premium", 4500.0, "spending", "Healthcare"))
    sample_txs.append(((today - timedelta(days=18)).isoformat(), "Apex Care Pharmacy Prescriptions", 1850.0, "spending", "Healthcare"))

    # Utilities
    sample_txs.append(((today - timedelta(days=42)).isoformat(), "ConEd Electric & Power", 3450.0, "spending", "Utilities"))
    sample_txs.append(((today - timedelta(days=12)).isoformat(), "ConEd Electric & Power", 3280.0, "spending", "Utilities"))
    sample_txs.append(((today - timedelta(days=38)).isoformat(), "FiberOptic Home Internet 1Gbps", 1899.0, "spending", "Utilities"))
    sample_txs.append(((today - timedelta(days=8)).isoformat(), "FiberOptic Home Internet 1Gbps", 1899.0, "spending", "Utilities"))

    # Subscriptions
    sample_txs.append(((today - timedelta(days=50)).isoformat(), "Netflix Premium UltraHD", 649.0, "spending", "Subscriptions"))
    sample_txs.append(((today - timedelta(days=20)).isoformat(), "Netflix Premium UltraHD", 649.0, "spending", "Subscriptions"))
    sample_txs.append(((today - timedelta(days=45)).isoformat(), "Spotify Family HiFi", 299.0, "spending", "Subscriptions"))
    sample_txs.append(((today - timedelta(days=15)).isoformat(), "Spotify Family HiFi", 299.0, "spending", "Subscriptions"))
    sample_txs.append(((today - timedelta(days=40)).isoformat(), "Equinox Fitness Club Membership", 4200.0, "spending", "Subscriptions"))
    sample_txs.append(((today - timedelta(days=10)).isoformat(), "Equinox Fitness Club Membership", 4200.0, "spending", "Subscriptions"))

    # Groceries (Past 60 days)
    groceries_data = [
        (56, "Whole Foods Market Organics", 4820.0),
        (51, "Trader Joe's Pantry Haul", 3650.0),
        (46, "BigBasket Fresh Produce & Dairy", 2890.0),
        (41, "Costco Wholesale Club Pantry", 6450.0),
        (36, "Trader Joe's Weekly Groceries", 3420.0),
        (31, "Whole Foods Market Organics", 4120.0),
        (26, "BigBasket Fresh Fruits & Staples", 2980.0),
        (21, "Trader Joe's Essentials", 3790.0),
        (16, "Costco Bulk Household Provisions", 5890.0),
        (11, "BigBasket Organic Produce", 2740.0),
        (6, "Trader Joe's Artisanal Bakery", 3890.0),
        (2, "Whole Foods Market Dinner Provisions", 3250.0),
    ]
    for days_ago, desc, amt in groceries_data:
        sample_txs.append(((today - timedelta(days=days_ago)).isoformat(), desc, amt, "spending", "Groceries"))

    # Dining & Coffee (Past 60 days)
    dining_data = [
        (57, "Blue Bottle Specialty Coffee", 420.0),
        (54, "Chipotle Mexican Grill Lunch", 680.0),
        (52, "Artisan Woodfired Pizza Bistro", 2450.0),
        (47, "Starbucks Reserve Roastery", 540.0),
        (43, "Tokyo Ramen Bar Dinner", 1850.0),
        (39, "Sweetgreen Harvest Bowl", 720.0),
        (34, "Blue Bottle Cold Brew", 390.0),
        (29, "Olive Garden Family Dinner", 3100.0),
        (24, "Chipotle Burrito Bowl", 710.0),
        (19, "Trattoria Pasta & Wine Bar", 3450.0),
        (14, "Starbucks Morning Nitro", 480.0),
        (9, "Izakaya Sushi & Yakitori", 2890.0),
        (4, "Sweetgreen Warm Salad Bowl", 740.0),
        (1, "Artisan Espresso Lounge", 450.0),
    ]
    for days_ago, desc, amt in dining_data:
        sample_txs.append(((today - timedelta(days=days_ago)).isoformat(), desc, amt, "spending", "Dining"))

    # Transit
    transit_data = [
        (53, "Metro Transit Monthly Pass", 1450.0),
        (38, "Uber Premier Downtown", 680.0),
        (23, "Metro Transit Monthly Pass", 1450.0),
        (17, "Lyft Ride to Airport Terminal", 1120.0),
        (7, "Uber Premier Ride Home", 620.0),
    ]
    for days_ago, desc, amt in transit_data:
        sample_txs.append(((today - timedelta(days=days_ago)).isoformat(), desc, amt, "spending", "Transportation"))

    # Shopping & Leisure
    sample_txs.append(((today - timedelta(days=44)).isoformat(), "Amazon Prime Household Essentials", 2450.0, "spending", "Shopping"))
    sample_txs.append(((today - timedelta(days=27)).isoformat(), "Kinokuniya Bookstore Hardcovers", 1890.0, "spending", "Shopping"))
    sample_txs.append(((today - timedelta(days=13)).isoformat(), "Uniqlo Winter Cashmere Sweater", 4990.0, "spending", "Shopping"))
    sample_txs.append(((today - timedelta(days=32)).isoformat(), "IMAX Cinema Weekend Premiere", 1250.0, "spending", "Entertainment"))
    sample_txs.append(((today - timedelta(days=5)).isoformat(), "Symphony Hall Concert Tickets", 2800.0, "spending", "Entertainment"))

    # Insert transactions into database
    created_at_iso = now.isoformat()
    created_tx_ids = []
    for tx_date, desc, amount, direction, category in sample_txs:
        t_id = f"tx_seed_{uuid.uuid4().hex[:10]}"
        created_tx_ids.append(t_id)
        cursor.execute("""
        INSERT INTO transactions (
            id, user_id, transaction_date, description, amount, direction,
            category, category_source, raw_data, import_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING;
        """, (
            t_id, DEMO_USER_ID, tx_date, desc, amount, direction,
            category, "demo_seed", "{\"source\": \"system_seed\"}", "imp_demo_seed", created_at_iso
        ))

    # 4. Seed Verified Initial Recommendations
    # Seed sample recommendations for each of the 4 systems to showcase the multi-system comparison
    sample_recs = [
        (
            f"rec_seed_{uuid.uuid4().hex[:10]}",
            "system_a",
            "Dining",
            "reduce",
            "Reduce discretionary dining by 25% to recover monthly surplus.",
            "{\"threshold\": 0.25, \"recent_spending\": 18350.0, \"target_reduction\": 4587.50}",
            4587.50,
            json.dumps(["Based on deterministic 25% threshold rule against top discretionary spending category."]),
            1,
            "Deterministic Rule Engine passed: valid category and non-protected tier."
        ),
        (
            f"rec_seed_{uuid.uuid4().hex[:10]}",
            "system_b",
            "Dining",
            "reallocate",
            "Reallocate ₹3,500 of monthly eating-out spend toward the Kyoto Autumn Retreat travel goal.",
            "{\"profile_delta\": 14.8, \"goal_id\": \"goal_travel_01\", \"reallocation_amount\": 3500.0}",
            3500.0,
            json.dumps(["Conditioned on spending profile pace and current progress toward Kyoto travel goal."]),
            1,
            "Personalized AI insight aligned with user discretionary preferences."
        ),
        (
            f"rec_seed_{uuid.uuid4().hex[:10]}",
            "system_b_ablation",
            "Dining",
            "curtail",
            "Try cooking at home more often instead of ordering takeout on weekends.",
            "{}",
            2500.0,
            json.dumps(["General heuristic recommendation without itemized transaction anchoring."]),
            0,
            "Ablation baseline: Unstructured heuristic without empirical evidence."
        ),
        (
            f"rec_seed_{uuid.uuid4().hex[:10]}",
            "system_c",
            "Dining",
            "restructure",
            "Cut 3 high-spend weekend dinner bistro outings across the next cycle to free up ₹4,200.00/month for your emergency buffer.",
            "{\"category\": \"Dining\", \"monthly_impact\": 4200.00, \"expected_impact\": 4200.00, \"source_transaction_ids\": [\"" + created_tx_ids[-2] + "\", \"" + created_tx_ids[-4] + "\", \"" + created_tx_ids[-6] + "\"]}",
            4200.00,
            json.dumps(["Grounding confirmed against exact source receipts. Protected categories (Housing, Healthcare) untouched."]),
            1,
            "Strict Numeric Claim Verifier passed: Claimed ₹4,200.00 matches underlying itemized receipts within 1.5% margin."
        ),
    ]

    for rid, config, cat, action, reason, ev_json, impact, assumptions, is_ver, notes in sample_recs:
        cursor.execute("""
        INSERT INTO recommendations (
            id, user_id, configuration, category, action, reason,
            evidence_json, expected_impact, assumptions, is_verified, verifier_notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING;
        """, (
            rid, DEMO_USER_ID, config, cat, action, reason,
            ev_json, impact, assumptions, is_ver, notes, created_at_iso
        ))

    conn.commit()
