import pytest
from backend.services.import_service import parse_csv_preview, confirm_csv_import
from backend.schemas.transaction import TransactionDirection

SAMPLE_CSV = """Date,Description,Amount,Category
2026-05-24,Third Wave Coffee,-286.80,Dining
2026-05-24,Infosys Payroll,84280.00,Income
2026-05-23,BigBasket Groceries,-1842.26,Groceries
2026-05-22,BESCOM Electricity Bill,-2142.00,Utilities
"""

def test_parse_csv_preview_auto_mapping(db):
    preview = parse_csv_preview(SAMPLE_CSV, "test_file.csv", "default_user", db)
    assert preview.total_rows == 4
    assert preview.accepted_rows == 4
    assert preview.rejected_rows == 0
    assert len(preview.sample_preview) == 4
    
    # Check first row
    r0 = preview.sample_preview[0]
    assert r0.mapped_description == "Third Wave Coffee"
    assert r0.mapped_amount == 286.80
    assert r0.mapped_direction == TransactionDirection.SPENDING
    assert r0.mapped_category == "Dining"

    # Check income row
    r1 = preview.sample_preview[1]
    assert r1.mapped_amount == 84280.00
    assert r1.mapped_direction == TransactionDirection.INCOME

def test_parse_csv_preview_malformed_row(db):
    bad_csv = """Date,Description,Amount
not-a-date,Broken,abc
2026-05-24,Valid Coffee,150.00
"""
    preview = parse_csv_preview(bad_csv, "bad.csv", "default_user", db)
    assert preview.total_rows == 2
    assert preview.rejected_rows == 1
    assert preview.accepted_rows == 1

def test_confirm_csv_import(db):
    preview = parse_csv_preview(SAMPLE_CSV, "test_file.csv", "default_user", db)
    tx_list = [
        {
            "user_id": "default_user",
            "transaction_date": r.mapped_date,
            "description": r.mapped_description,
            "amount": r.mapped_amount,
            "direction": r.mapped_direction,
            "category": r.mapped_category
        }
        for r in preview.sample_preview if r.status == "valid"
    ]
    res = confirm_csv_import("default_user", "test_file.csv", tx_list, db)
    assert res["accepted_count"] == 4
    # Verify in DB
    cursor = db.cursor()
    cursor.execute("SELECT COUNT(*) FROM transactions WHERE user_id = 'default_user'")
    count = cursor.fetchone()[0]
    assert count == 4

def test_in_file_duplicate_detection_and_accounting_identity(db):
    duplicate_csv = """Date,Description,Amount,Category
2026-05-24,Duplicate Coffee,150.00,Dining
2026-05-24,Duplicate Coffee,150.00,Dining
2026-05-25,Valid Snack,80.00,Dining
not-a-date,Malformed Row,abc,Dining
"""
    preview = parse_csv_preview(duplicate_csv, "dup.csv", "default_user", db)
    assert preview.total_rows == 4
    assert preview.accepted_rows == 2  # Coffee (first occurrence) + Snack
    assert preview.duplicate_rows == 1 # Coffee (second occurrence)
    assert preview.rejected_rows == 1  # Malformed row
    # Invariant: total_rows == accepted_rows + rejected_rows + duplicate_rows
    assert preview.total_rows == preview.accepted_rows + preview.rejected_rows + preview.duplicate_rows

    valid_txs = [
        {
            "user_id": "default_user",
            "transaction_date": r.mapped_date,
            "description": r.mapped_description,
            "amount": r.mapped_amount,
            "direction": r.mapped_direction,
            "category": r.mapped_category
        }
        for r in preview.sample_preview if r.status == "valid"
    ]
    res = confirm_csv_import(
        user_id="default_user",
        file_name="dup.csv",
        transactions=valid_txs,
        db=db,
        total_rows=preview.total_rows,
        rejected_rows=preview.rejected_rows,
        duplicate_rows=preview.duplicate_rows
    )
    assert res["total_rows"] == 4
    assert res["accepted_count"] == 2
    assert res["rejected_count"] == 1
    assert res["duplicate_count"] == 1
    assert res["total_rows"] == res["accepted_count"] + res["rejected_count"] + res["duplicate_count"]

