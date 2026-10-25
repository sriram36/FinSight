from unittest.mock import MagicMock
from backend.database import is_postgres, PostgresRow, PostgresCursorWrapper, PostgresConnectionWrapper

def test_is_postgres_detection():
    assert is_postgres("postgres://user:pass@host:5432/db") is True
    assert is_postgres("postgresql://user:pass@host:5432/db") is True
    assert is_postgres("sqlite:///./finsight.db") is False
    assert is_postgres("finsight.db") is False

def test_postgres_row_interface():
    cols = ["id", "description", "amount", "is_protected"]
    vals = ("tx_test_1", "Organic Groceries", 145.50, 1)
    
    row = PostgresRow(cols, vals)
    
    # Index access
    assert row[0] == "tx_test_1"
    assert row[1] == "Organic Groceries"
    assert row[2] == 145.50
    assert row[3] == 1
    
    # Key access
    assert row["id"] == "tx_test_1"
    assert row["description"] == "Organic Groceries"
    assert row["amount"] == 145.50
    assert row["is_protected"] == 1
    
    # Dict conversion
    d = dict(row)
    assert d == {
        "id": "tx_test_1",
        "description": "Organic Groceries",
        "amount": 145.50,
        "is_protected": 1
    }
    
    # Helper methods
    assert "amount" in row
    assert "unknown" not in row
    assert row.get("amount") == 145.50
    assert row.get("unknown", "default") == "default"
    assert row.keys() == cols
    assert row.values() == list(vals)

def test_postgres_cursor_query_conversion():
    mock_raw_cursor = MagicMock()
    mock_raw_cursor.description = [("id",), ("amount",)]
    mock_raw_cursor.fetchone.return_value = ("tx_99", 50.0)
    mock_raw_cursor.fetchall.return_value = [("tx_99", 50.0), ("tx_100", 75.0)]

    wrapper = PostgresCursorWrapper(mock_raw_cursor)
    
    # Execute with '?' placeholder and list params
    wrapper.execute("SELECT * FROM transactions WHERE user_id = ? AND amount > ?", ["user_1", 20.0])
    
    # Verify '?' was converted to '%s' and params passed as tuple
    mock_raw_cursor.execute.assert_called_once_with(
        "SELECT * FROM transactions WHERE user_id = %s AND amount > %s",
        ("user_1", 20.0)
    )
    
    # Verify fetchone returns PostgresRow
    row = wrapper.fetchone()
    assert isinstance(row, PostgresRow)
    assert row["id"] == "tx_99"
    assert row[1] == 50.0
    
    # Verify fetchall returns list of PostgresRows
    rows = wrapper.fetchall()
    assert len(rows) == 2
    assert rows[1]["id"] == "tx_100"

def test_postgres_connection_wrapper():
    mock_raw_conn = MagicMock()
    conn_wrapper = PostgresConnectionWrapper(mock_raw_conn)
    
    cursor = conn_wrapper.cursor()
    assert isinstance(cursor, PostgresCursorWrapper)
    
    conn_wrapper.commit()
    mock_raw_conn.commit.assert_called_once()
    
    conn_wrapper.rollback()
    mock_raw_conn.rollback.assert_called_once()
    
    conn_wrapper.close()
    mock_raw_conn.close.assert_called_once()
