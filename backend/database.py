import sqlite3
import os
from contextlib import contextmanager
from backend.config import settings

DB_PATH = settings.DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")
if not DB_PATH or DB_PATH == ":memory:":
    DB_PATH = "finsight.db"

def get_connection(db_file: str = None) -> sqlite3.Connection:
    target = db_file or DB_PATH
    conn = sqlite3.connect(target, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db(db_file: str = None):
    conn = get_connection(db_file)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # Transactions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
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
    """)

    # Imports table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS imports (
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
    """)

    # Category Preferences / Protected table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS category_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category TEXT NOT NULL,
        is_protected INTEGER NOT NULL DEFAULT 0,
        reason TEXT,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, category),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # Goals table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS goals (
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
    """)

    # Recommendations table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS recommendations (
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
    """)

    # Research runs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS research_runs (
        id TEXT PRIMARY KEY,
        dataset_version TEXT NOT NULL,
        seed INTEGER NOT NULL,
        metrics_json TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    # Default demo user
    cursor.execute("""
    INSERT OR IGNORE INTO users (id, name, email, created_at)
    VALUES ('default_user', 'Jordan Davis', 'jordan@finsight.local', '2026-01-01T00:00:00Z');
    """)

    conn.commit()
    conn.close()

# Dependency for FastAPI
def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
