import os
import re
import sqlite3
from typing import Any, List, Optional, Tuple, Union
from backend.config import settings

def is_postgres(url: Optional[str] = None) -> bool:
    target = (url or settings.DATABASE_URL).strip()
    return target.startswith("postgresql://") or target.startswith("postgres://")

class PostgresRow:
    """Provides sqlite3.Row-compatible interface (index, key, dict) for psycopg2 results."""
    def __init__(self, cols: List[str], vals: Tuple[Any, ...]):
        self._cols = cols
        self._vals = list(vals)
        self._dict = dict(zip(cols, vals))

    def __getitem__(self, key: Union[int, str]) -> Any:
        if isinstance(key, int):
            return self._vals[key]
        return self._dict[key]

    def __contains__(self, key: str) -> bool:
        return key in self._dict

    def get(self, key: str, default: Any = None) -> Any:
        return self._dict.get(key, default)

    def keys(self) -> List[str]:
        return self._cols

    def values(self) -> List[Any]:
        return self._vals

    def items(self):
        return self._dict.items()

    def __iter__(self):
        return iter(self._cols)

    def __repr__(self) -> str:
        return repr(self._dict)

class PostgresCursorWrapper:
    def __init__(self, raw_cursor):
        self._cursor = raw_cursor

    def _convert_query(self, query: str) -> str:
        # Convert SQLite '?' placeholders to PostgreSQL '%s'
        return re.sub(r'\?', '%s', query)

    def execute(self, query: str, params=None):
        pg_query = self._convert_query(query)
        if params is not None:
            if isinstance(params, list):
                params = tuple(params)
            self._cursor.execute(pg_query, params)
        else:
            self._cursor.execute(pg_query)
        return self

    def executemany(self, query: str, param_list):
        pg_query = self._convert_query(query)
        return self._cursor.executemany(pg_query, param_list)

    def fetchone(self) -> Optional[PostgresRow]:
        row = self._cursor.fetchone()
        if row is None:
            return None
        cols = [desc[0] for desc in self._cursor.description]
        return PostgresRow(cols, row)

    def fetchall(self) -> List[PostgresRow]:
        rows = self._cursor.fetchall()
        if not rows:
            return []
        cols = [desc[0] for desc in self._cursor.description]
        return [PostgresRow(cols, r) for r in rows]

    def fetchmany(self, size: Optional[int] = None) -> List[PostgresRow]:
        rows = self._cursor.fetchmany(size) if size else self._cursor.fetchmany()
        if not rows:
            return []
        cols = [desc[0] for desc in self._cursor.description]
        return [PostgresRow(cols, r) for r in rows]

    @property
    def rowcount(self) -> int:
        return self._cursor.rowcount

    @property
    def description(self):
        return self._cursor.description

    def close(self):
        self._cursor.close()

class PostgresConnectionWrapper:
    def __init__(self, raw_conn):
        self._conn = raw_conn

    def cursor(self):
        return PostgresCursorWrapper(self._conn.cursor())

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()

    def execute(self, query: str, params=None):
        cur = self.cursor()
        cur.execute(query, params)
        return cur

def get_connection(db_target: Optional[str] = None):
    target = (db_target or settings.DATABASE_URL).strip()
    if is_postgres(target):
        try:
            import psycopg2
        except ImportError:
            raise ImportError(
                "psycopg2-binary is required for PostgreSQL connections. "
                "Run `pip install psycopg2-binary` to install it."
            )
        url = target
        if "sslmode=" not in url and ("render.com" in url or "supabase" in url or "neon.tech" in url):
            connector = "&" if "?" in url else "?"
            url = f"{url}{connector}sslmode=require"
        conn = psycopg2.connect(url)
        return PostgresConnectionWrapper(conn)
    else:
        db_path = target.replace("sqlite:///", "").replace("sqlite://", "")
        if not db_path or db_path == ":memory:":
            db_path = "finsight.db"
        conn = sqlite3.connect(db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

def init_db(db_target: Optional[str] = None, auto_seed: bool = True):
    conn = get_connection(db_target)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        password_hash TEXT,
        salt TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # Safe migrations for existing users table
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN password_hash TEXT;")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN salt TEXT;")
    except Exception:
        pass

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

    # Budgets table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS budgets (
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
    """)

    # Recurring items table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS recurring_items (
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
    """)

    # Anomalies / Unusual Spending table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS anomalies (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        transaction_id TEXT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        baseline_amount REAL,
        deviation_pct REAL,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'medium',
        explanation TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        user_decision TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
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

    # Default demo user (standard ANSI SQL ON CONFLICT compatible with Postgres and SQLite)
    cursor.execute("""
    INSERT INTO users (id, name, email, created_at)
    VALUES ('default_user', 'Jordan Davis', 'jordan@finsight.local', '2026-01-01T00:00:00Z')
    ON CONFLICT (id) DO NOTHING;
    """)

    conn.commit()

    if auto_seed:
        try:
            from backend.seed import seed_demo_data
            seed_demo_data(conn)
        except Exception as e:
            import logging
            logging.getLogger("finsight").error(f"Error seeding initial demo data: {e}", exc_info=True)

    conn.close()

# Dependency for FastAPI
def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
