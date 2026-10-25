import csv
import io
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from dateutil import parser as date_parser
from backend.schemas.transaction import (
    TransactionDirection,
    CSVPreviewRow,
    CSVPreviewSummary,
    TransactionCreate,
    STANDARD_CATEGORIES
)

MERCHANT_RULES = {
    "Dining": ["coffee", "cafe", "restaurant", "swiggy", "zomato", "starbucks", "mcdonald", "burger", "pizza", "subway", "bar", "brewery"],
    "Groceries": ["bigbasket", "zepto", "blinkit", "supermarket", "grocery", "mart", "nature basket", "spencer", "dmart"],
    "Retail": ["amazon", "flipkart", "myntra", "zara", "h&m", "retail", "clothing", "apparel", "apple store", "electronics"],
    "Transportation": ["uber", "ola", "metro", "fuel", "petrol", "shell", "hpcl", "bpcl", "railway", "irctc", "taxi", "toll"],
    "Utilities": ["bescom", "airtel", "jio", "vodafone", "electricity", "water", "gas", "broadband", "wifi", "power"],
    "Entertainment": ["netflix", "spotify", "prime", "cinema", "pvr", "inox", "youtube", "hotstar", "disney", "theatre"],
    "Healthcare": ["pharmacy", "apollo", "medplus", "hospital", "clinic", "diagnostic", "1mg", "practo", "doctor"],
    "Subscriptions": ["icloud", "chatgpt", "github", "google storage", "subscription"],
    "Rent/Mortgage": ["rent", "landlord", "housing", "mortgage", "society maintenance"],
    "Income": ["payroll", "salary", "dividend", "interest", "bonus", "stipend"],
}

def infer_category(description: str, raw_category: Optional[str] = None) -> str:
    if raw_category:
        for cat in STANDARD_CATEGORIES:
            if raw_category.strip().lower() == cat.lower():
                return cat

    desc_lower = description.lower()
    for cat, keywords in MERCHANT_RULES.items():
        if any(kw in desc_lower for kw in keywords):
            return cat
    return "Uncategorized"

def parse_date_safely(date_str: str) -> Optional[str]:
    clean_str = date_str.strip()
    if not clean_str:
        return None
    try:
        import re
        m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})", clean_str)
        if m:
            y, mo, d = m.groups()
            return f"{int(y):04d}-{int(mo):02d}-{int(d):02d}"
        dt = date_parser.parse(clean_str, dayfirst=True)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return None

def detect_column_mappings(headers: List[str]) -> Dict[str, str]:
    mapping = {}
    h_lower = {h.strip().lower(): h for h in headers}

    # Date
    for candidate in ["date", "transaction date", "posted date", "tx_date", "value date", "time"]:
        for h, orig in h_lower.items():
            if candidate in h:
                mapping["date"] = orig
                break
        if "date" in mapping:
            break

    # Description
    for candidate in ["description", "narration", "merchant", "details", "particulars", "payee", "note"]:
        for h, orig in h_lower.items():
            if candidate in h:
                mapping["description"] = orig
                break
        if "description" in mapping:
            break

    # Amount / Debit / Credit
    for candidate in ["amount", "inr", "total", "net"]:
        for h, orig in h_lower.items():
            if candidate in h and "balance" not in h:
                mapping["amount"] = orig
                break
        if "amount" in mapping:
            break

    for candidate in ["debit", "withdrawal", "spend"]:
        for h, orig in h_lower.items():
            if candidate in h:
                mapping["debit"] = orig
                break

    for candidate in ["credit", "deposit"]:
        for h, orig in h_lower.items():
            if candidate in h:
                mapping["credit"] = orig
                break

    # Direction / Type
    for candidate in ["transaction type", "tx type", "direction", "type", "dr/cr", "cr/dr"]:
        for h, orig in h_lower.items():
            if candidate == h or (candidate in h and "category" not in h):
                mapping["direction"] = orig
                break
        if "direction" in mapping:
            break

    # Category
    for candidate in ["category", "tag", "classification"]:
        for h, orig in h_lower.items():
            if candidate in h:
                mapping["category"] = orig
                break
        if "category" in mapping:
            break

    return mapping

def parse_csv_preview(
    file_content: str,
    file_name: str,
    user_id: str,
    db,
    custom_mapping: Optional[Dict[str, str]] = None
) -> CSVPreviewSummary:
    f = io.StringIO(file_content.strip())
    reader = csv.DictReader(f)
    if not reader.fieldnames:
        return CSVPreviewSummary(
            file_name=file_name,
            total_rows=0,
            accepted_rows=0,
            rejected_rows=0,
            duplicate_rows=0,
            detected_headers=[],
            sample_preview=[],
            column_mapping={}
        )

    headers = list(reader.fieldnames)
    mapping = custom_mapping or detect_column_mappings(headers)

    date_col = mapping.get("date")
    desc_col = mapping.get("description")
    amt_col = mapping.get("amount")
    debit_col = mapping.get("debit")
    credit_col = mapping.get("credit")
    cat_col = mapping.get("category")
    dir_col = mapping.get("direction")

    rows: List[CSVPreviewRow] = []
    accepted = 0
    rejected = 0
    duplicates = 0

    # Query existing transactions for duplicate detection
    cursor = db.cursor()
    cursor.execute("SELECT transaction_date, description, amount FROM transactions WHERE user_id = ?", (user_id,))
    existing_txs = {(r[0], r[1].lower().strip(), round(float(r[2]), 2)) for r in cursor.fetchall()}

    for idx, row in enumerate(reader, start=1):
        err = None
        parsed_date = None
        desc = None
        amount = None
        direction = TransactionDirection.SPENDING
        category = "Uncategorized"

        # Date parsing
        if date_col and row.get(date_col):
            parsed_date = parse_date_safely(row[date_col])
            if not parsed_date:
                err = f"Invalid date: {row[date_col]}"
        else:
            err = "Missing date column"

        # Description
        if desc_col and row.get(desc_col):
            desc = row[desc_col].strip()
        else:
            desc = "Transaction"

        # Direction detection from direction column if present
        explicit_dir = None
        if dir_col and row.get(dir_col):
            val = row[dir_col].strip().lower()
            if val in ["debit", "dr", "withdrawal", "payment", "spend", "spending", "expense"]:
                explicit_dir = TransactionDirection.SPENDING
            elif val in ["credit", "cr", "deposit", "income", "salary", "refund"]:
                explicit_dir = TransactionDirection.INCOME

        # Amount and Direction
        if not err:
            try:
                if debit_col and row.get(debit_col) and row[debit_col].strip():
                    raw_val = float(row[debit_col].replace(",", "").replace("₹", "").replace("$", ""))
                    amount = abs(raw_val)
                    direction = explicit_dir or TransactionDirection.SPENDING
                elif credit_col and row.get(credit_col) and row[credit_col].strip():
                    raw_val = float(row[credit_col].replace(",", "").replace("₹", "").replace("$", ""))
                    amount = abs(raw_val)
                    direction = explicit_dir or TransactionDirection.INCOME
                elif amt_col and row.get(amt_col) and row[amt_col].strip():
                    raw_val = float(row[amt_col].replace(",", "").replace("₹", "").replace("$", ""))
                    amount = abs(raw_val)
                    if explicit_dir is not None:
                        direction = explicit_dir
                    elif raw_val > 0:
                        direction = TransactionDirection.INCOME
                    else:
                        direction = TransactionDirection.SPENDING
                else:
                    err = "Missing or empty amount"
            except Exception:
                err = f"Could not parse amount from row"

        # Category
        if not err and desc:
            raw_cat = row.get(cat_col) if cat_col else None
            category = infer_category(desc, raw_cat)
            if direction == TransactionDirection.INCOME and category == "Uncategorized":
                category = "Income"

        # Duplicate check
        status = "valid"
        if not err and parsed_date and desc and amount is not None:
            if (parsed_date, desc.lower().strip(), round(amount, 2)) in existing_txs:
                status = "duplicate"
                duplicates += 1
            else:
                accepted += 1
        else:
            status = "error"
            rejected += 1

        rows.append(CSVPreviewRow(
            row_number=idx,
            raw=dict(row),
            mapped_date=parsed_date,
            mapped_description=desc,
            mapped_amount=round(amount, 2) if amount is not None else None,
            mapped_direction=direction,
            mapped_category=category,
            status=status,
            error_message=err
        ))

    return CSVPreviewSummary(
        file_name=file_name,
        total_rows=len(rows),
        accepted_rows=accepted,
        rejected_rows=rejected,
        duplicate_rows=duplicates,
        detected_headers=headers,
        sample_preview=rows,
        column_mapping=mapping
    )

def confirm_csv_import(
    user_id: str,
    file_name: str,
    transactions: List[Dict[str, Any]],
    db
) -> Dict[str, Any]:
    import_id = f"imp_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()


    cursor = db.cursor()
    accepted_count = 0

    for tx in transactions:
        tx_id = f"tx_{uuid.uuid4().hex[:12]}"
        date_str = tx.get("transaction_date")
        desc = tx.get("description", "Imported transaction")
        amount = abs(float(tx.get("amount", 0.0)))
        direction = tx.get("direction", "spending")
        category = tx.get("category", "Uncategorized")
        cat_src = tx.get("category_source", "csv_import")

        cursor.execute("""
        INSERT INTO transactions (
            id, user_id, transaction_date, description, amount, direction,
            category, category_source, import_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            tx_id, user_id, date_str, desc, amount, direction,
            category, cat_src, import_id, now_iso
        ))
        accepted_count += 1

    cursor.execute("""
    INSERT INTO imports (
        id, user_id, file_name, total_rows, accepted_rows, rejected_rows,
        duplicate_rows, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        import_id, user_id, file_name, len(transactions), accepted_count, 0, 0, now_iso
    ))

    db.commit()
    return {
        "import_id": import_id,
        "accepted_count": accepted_count,
        "file_name": file_name,
        "created_at": now_iso
    }
