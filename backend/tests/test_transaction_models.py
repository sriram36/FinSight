import pytest
from pydantic import ValidationError
from backend.schemas.transaction import (
    TransactionCreate,
    TransactionRead,
    TransactionDirection,
    STANDARD_CATEGORIES,
    TransactionUpdate
)

def test_transaction_create_valid():
    tx = TransactionCreate(
        user_id="default_user",
        transaction_date="2026-05-24",
        description="Third Wave Coffee",
        amount=286.80,
        direction=TransactionDirection.SPENDING,
        category="Dining"
    )
    assert tx.amount == 286.80
    assert tx.direction == "spending"
    assert tx.category == "Dining"

def test_transaction_negative_amount_normalized():
    # If a user or CSV passes negative for spending, it should normalize to positive magnitude with direction preserved
    tx = TransactionCreate(
        user_id="default_user",
        transaction_date="2026-05-24",
        description="BigBasket",
        amount=-1842.26,
        direction=TransactionDirection.SPENDING,
        category="Groceries"
    )
    assert tx.amount == 1842.26

def test_transaction_invalid_date():
    with pytest.raises(ValidationError):
        TransactionCreate(
            user_id="default_user",
            transaction_date="not-a-date",
            description="Bad date",
            amount=100.0,
            direction=TransactionDirection.SPENDING,
            category="Dining"
        )

def test_standard_categories_defined():
    assert "Dining" in STANDARD_CATEGORIES
    assert "Groceries" in STANDARD_CATEGORIES
    assert "Retail" in STANDARD_CATEGORIES
    assert "Uncategorized" in STANDARD_CATEGORIES
