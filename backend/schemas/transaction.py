from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field, field_validator
import uuid

class TransactionDirection(str, Enum):
    SPENDING = "spending"
    INCOME = "income"
    TRANSFER = "transfer"
    REFUND = "refund"
    PAYMENT = "payment"

STANDARD_CATEGORIES = [
    "Groceries",
    "Dining",
    "Retail",
    "Entertainment",
    "Travel",
    "Transportation",
    "Utilities",
    "Rent/Mortgage",
    "Healthcare",
    "Education",
    "Personal Care",
    "Subscriptions",
    "Insurance",
    "Investment",
    "Gifts/Donations",
    "Miscellaneous",
    "Other",
    "Income",
    "Transfer",
    "Payment",
    "Uncategorized"
]

class TransactionBase(BaseModel):
    transaction_date: str = Field(..., description="ISO date YYYY-MM-DD")
    description: str = Field(..., min_length=1)
    amount: float = Field(..., description="Transaction amount magnitude (positive)")
    direction: TransactionDirection = Field(default=TransactionDirection.SPENDING)
    category: str = Field(default="Uncategorized")
    category_source: str = Field(default="auto")

    @field_validator("transaction_date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        try:
            # support YYYY-MM-DD or parseable dates
            dt = datetime.strptime(v[:10], "%Y-%m-%d")
            return dt.strftime("%Y-%m-%d")
        except Exception:
            raise ValueError(f"Invalid date format: {v}. Expected YYYY-MM-DD.")

    @field_validator("amount")
    @classmethod
    def normalize_amount(cls, v: float) -> float:
        val = abs(float(v))
        return round(val, 2)

    @field_validator("category")
    @classmethod
    def normalize_category(cls, v: str) -> str:
        # Match case-insensitively if in standard categories
        for std in STANDARD_CATEGORIES:
            if v.strip().lower() == std.lower():
                return std
        return v.strip() or "Uncategorized"

class TransactionCreate(TransactionBase):
    user_id: str = Field(default="default_user")
    import_id: Optional[str] = None
    raw_data: Optional[str] = None

class TransactionUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    direction: Optional[TransactionDirection] = None
    amount: Optional[float] = None
    transaction_date: Optional[str] = None

class TransactionRead(TransactionBase):
    id: str
    user_id: str
    import_id: Optional[str] = None
    raw_data: Optional[str] = None
    created_at: str

    model_config = {"from_attributes": True}


class CSVPreviewRow(BaseModel):
    row_number: int
    raw: Dict[str, Any]
    mapped_date: Optional[str] = None
    mapped_description: Optional[str] = None
    mapped_amount: Optional[float] = None
    mapped_direction: Optional[TransactionDirection] = None
    mapped_category: Optional[str] = None
    status: str = "valid"  # valid, error, duplicate
    error_message: Optional[str] = None

class CSVPreviewSummary(BaseModel):
    file_name: str
    total_rows: int
    accepted_rows: int
    rejected_rows: int
    duplicate_rows: int
    detected_headers: List[str]
    sample_preview: List[CSVPreviewRow]
    column_mapping: Dict[str, str]

class CSVConfirmRequest(BaseModel):
    user_id: str = "default_user"
    file_name: str
    transactions: List[TransactionCreate]
    total_rows: Optional[int] = None
    rejected_rows: Optional[int] = 0
    duplicate_rows: Optional[int] = 0
