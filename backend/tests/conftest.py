import pytest
import sqlite3
from fastapi.testclient import TestClient
from backend.database import get_db, init_db, get_connection
from backend.main import app

@pytest.fixture(scope="function")
def db():
    # Use in-memory database shared for the test
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    
    # Initialize schema on this in-memory connection
    cursor = conn.cursor()
    cursor.executescript("""
    CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        created_at TEXT NOT NULL
    );
    CREATE TABLE transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        transaction_date TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        direction TEXT NOT NULL,
        category TEXT NOT NULL,
        category_source TEXT NOT NULL DEFAULT 'auto',
        raw_data TEXT,
        import_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE imports (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        total_rows INTEGER NOT NULL,
        accepted_rows INTEGER NOT NULL,
        rejected_rows INTEGER NOT NULL,
        duplicate_rows INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE category_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category TEXT NOT NULL,
        is_protected INTEGER NOT NULL DEFAULT 0,
        reason TEXT,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, category),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE goals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        target_amount REAL NOT NULL,
        current_amount REAL NOT NULL DEFAULT 0.0,
        target_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE recommendations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        configuration TEXT NOT NULL,
        category TEXT NOT NULL,
        action TEXT NOT NULL,
        reason TEXT NOT NULL,
        evidence_json TEXT NOT NULL,
        expected_impact REAL,
        assumptions TEXT,
        is_verified INTEGER NOT NULL DEFAULT 0,
        verifier_notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE budgets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category TEXT NOT NULL,
        monthly_limit REAL NOT NULL,
        month TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, category, month),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE recurring_items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        merchant TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        frequency TEXT NOT NULL DEFAULT 'monthly',
        next_due_date TEXT,
        last_seen_date TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        is_confirmed INTEGER NOT NULL DEFAULT 0,
        confidence REAL NOT NULL DEFAULT 1.0,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE research_runs (
        id TEXT PRIMARY KEY,
        dataset_version TEXT NOT NULL,
        seed INTEGER NOT NULL,
        metrics_json TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    INSERT INTO users (id, name, email, created_at)
    VALUES ('default_user', 'Jordan Davis', 'jordan@finsight.local', '2026-01-01T00:00:00Z');
    """)
    conn.commit()

    yield conn
    conn.close()

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
