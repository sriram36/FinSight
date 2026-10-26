import csv
import io
import json
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
    seen_in_file = set()

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

        # Duplicate check (existing DB + within-file duplicates)
        status = "valid"
        if not err and parsed_date and desc and amount is not None:
            tx_sig = (parsed_date, desc.lower().strip(), round(amount, 2))
            if tx_sig in existing_txs or tx_sig in seen_in_file:
                status = "duplicate"
                duplicates += 1
                err = "Duplicate transaction (matches existing record or repeated in file)"
            else:
                seen_in_file.add(tx_sig)
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
    db,
    total_rows: Optional[int] = None,
    rejected_rows: Optional[int] = 0,
    duplicate_rows: Optional[int] = 0
) -> Dict[str, Any]:
    import_id = f"imp_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    cursor = db.cursor()
    cursor.execute("SELECT transaction_date, description, amount FROM transactions WHERE user_id = ?", (user_id,))
    existing_txs = {(r[0], r[1].lower().strip(), round(float(r[2]), 2)) for r in cursor.fetchall()}
    seen_in_batch = set()

    accepted_count = 0
    batch_duplicates = 0
    batch_rejected = 0

    for tx in transactions:
        date_str = tx.get("transaction_date")
        desc = tx.get("description", "Imported transaction")
        try:
            amount = abs(float(tx.get("amount", 0.0)))
        except (ValueError, TypeError):
            batch_rejected += 1
            continue

        if not date_str or not desc or amount == 0.0:
            batch_rejected += 1
            continue

        sig = (date_str, desc.lower().strip(), round(amount, 2))
        if sig in existing_txs or sig in seen_in_batch:
            batch_duplicates += 1
            continue

        seen_in_batch.add(sig)
        tx_id = f"tx_{uuid.uuid4().hex[:12]}"
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

    total_duplicate_count = (duplicate_rows or 0) + batch_duplicates
    total_rejected_count = (rejected_rows or 0) + batch_rejected
    actual_total_rows = total_rows if total_rows is not None else (accepted_count + total_duplicate_count + total_rejected_count)

    cursor.execute("""
    INSERT INTO imports (
        id, user_id, file_name, total_rows, accepted_rows, rejected_rows,
        duplicate_rows, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        import_id, user_id, file_name, actual_total_rows, accepted_count, total_rejected_count, total_duplicate_count, now_iso
    ))

    db.commit()
    return {
        "import_id": import_id,
        "total_rows": actual_total_rows,
        "accepted_count": accepted_count,
        "rejected_count": total_rejected_count,
        "duplicate_count": total_duplicate_count,
        "file_name": file_name,
        "created_at": now_iso
    }


AMBIGUOUS_CATEGORIES = {"uncategorized", "transfer", "other", "payment", "p2p"}
SPLIT_HINTS = ("split", "group", "iou", "settle", "gpay", "upi")


def extract_counterparty(description: str) -> str:
    import re
    text = (description or "").strip()
    handle = re.search(r"([a-zA-Z0-9._-]{3,}@[a-zA-Z0-9]+)", text)
    if handle:
        return handle.group(1).lower()
    upi = re.search(r"upi[/:\s]+([a-zA-Z0-9._-]+)", text, re.IGNORECASE)
    if upi:
        return upi.group(1).lower()
    return normalize_merchant_name_lite(text)


def normalize_merchant_name_lite(desc: str) -> str:
    import re
    clean = re.sub(r"\b(?:tx_|syn_tx_|imp_|rec_|id_|\d{4}-\d{2}-\d{2}|\d+)\b", "", desc or "", flags=re.IGNORECASE)
    clean = re.sub(r"[\*\#\-\_]+", " ", clean).strip()
    return clean.lower() if clean else (desc or "unknown").strip().lower()


def time_of_day_bucket(transaction_date: str, raw_data: Optional[str] = None) -> str:
    hour = None
    minute = 0
    text = transaction_date or ""
    if "T" in text and len(text) >= 16:
        try:
            hour = int(text[11:13])
            minute = int(text[14:16])
        except Exception:
            hour = None
    if hour is None and raw_data:
        try:
            payload = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
            if isinstance(payload, dict) and payload.get("hour") is not None:
                hour = int(payload["hour"])
                minute = int(payload.get("minute") or 0)
        except Exception:
            hour = None
    if hour is None:
        return "Unspecified"
    minutes = hour * 60 + minute
    if 6 * 60 <= minutes < 11 * 60:
        return "Morning Commute"
    if 12 * 60 + 30 <= minutes <= 14 * 60 + 30:
        return "Lunch 12:30-2:30 PM"
    if minutes >= 22 * 60 + 30 or minutes <= 2 * 60:
        return "Late-Night 10:30 PM-2:00 AM"
    return "Daytime"


def ticket_size_band(amount: float) -> str:
    if amount < 150:
        return "micro (<₹150)"
    if amount < 500:
        return "small (₹150-500)"
    if amount < 2000:
        return "medium (₹500-2,000)"
    return "large (>₹2,000)"


def cluster_ambiguous_transfers(user_id: str, db) -> List[Dict[str, Any]]:
    """Cluster uncategorized / P2P transfers for 1-tap UPI context stitcher prompts."""
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT id, transaction_date, description, amount, category, raw_data
        FROM transactions
        WHERE user_id = ? AND (direction = 'spending' OR direction = 'debit' OR direction = 'transfer')
        ORDER BY transaction_date DESC
        """,
        (user_id,),
    )
    rows = cursor.fetchall()
    buckets: Dict[str, List[Dict[str, Any]]] = {}
    for r in rows:
        cat = (r["category"] or "Uncategorized").strip()
        if cat.lower() not in AMBIGUOUS_CATEGORIES:
            continue
        amount = float(r["amount"] or 0.0)
        handle = extract_counterparty(r["description"])
        tod = time_of_day_bucket(r["transaction_date"], r["raw_data"])
        band = ticket_size_band(amount)
        key = f"{handle}|{tod}|{band}"
        buckets.setdefault(key, []).append({
            "id": r["id"],
            "transaction_date": r["transaction_date"],
            "description": r["description"],
            "amount": amount,
            "category": cat,
            "counterparty": handle,
            "time_of_day_bucket": tod,
            "ticket_size_band": band,
        })

    prompts = []
    for key, txs in buckets.items():
        if len(txs) < 2:
            continue
        amounts = [t["amount"] for t in txs]
        avg = round(sum(amounts) / len(amounts), 2)
        handle, tod, band = key.split("|")
        likely_split = avg >= 800 and any(h in (txs[0]["description"] or "").lower() for h in SPLIT_HINTS) or (800 <= avg <= 5000 and "upi" in (txs[0]["description"] or "").lower() and len(txs) <= 4)
        if "lunch" in tod.lower() or (90 <= avg <= 250 and "lunch" in tod.lower()):
            suggestion = f"You paid {handle} {len(txs)} times during {tod} averaging ₹{avg:,.0f}. Categorize all as Daily Lunch?"
            suggested_category = "Dining"
        elif "late-night" in tod.lower():
            suggestion = f"{len(txs)} late-night transfers to {handle} averaging ₹{avg:,.0f}. Tag as Late-Night Food?"
            suggested_category = "Dining"
        elif likely_split or avg >= 1500:
            suggestion = f"Was the cluster of {len(txs)} payments to {handle} (avg ₹{avg:,.0f}) a group split bill / IOU?"
            suggested_category = "Transfer"
        else:
            suggestion = f"{len(txs)} similar P2P transfers to {handle} ({tod}, {band}). Categorize together?"
            suggested_category = "Uncategorized"
        cluster_id = f"clu_{uuid.uuid4().hex[:10]}"
        prompts.append({
            "cluster_id": cluster_id,
            "cluster_key": key,
            "counterparty": handle,
            "time_of_day_bucket": tod,
            "ticket_size_band": band,
            "transaction_count": len(txs),
            "transaction_ids": [t["id"] for t in txs],
            "exact_sum": round(sum(amounts), 2),
            "average_amount": avg,
            "suggested_category": suggested_category,
            "prompt": suggestion,
            "likely_split_bill": bool(likely_split or (avg >= 1500 and tod != "Lunch 12:30-2:30 PM")),
            "sample_descriptions": list({t["description"] for t in txs})[:3],
        })
    prompts.sort(key=lambda x: x["transaction_count"], reverse=True)
    return prompts[:12]


def resolve_transaction_cluster(
    user_id: str,
    cluster_key: str,
    category: str,
    db,
    register_iou: bool = False,
    iou_label: Optional[str] = None,
) -> Dict[str, Any]:
    clusters = cluster_ambiguous_transfers(user_id, db)
    match = next((c for c in clusters if c["cluster_key"] == cluster_key), None)
    if not match:
        # Fallback: accept explicit transaction_ids packed into cluster_key as csv prefixed ids
        return {"updated_count": 0, "cluster_key": cluster_key, "iou_registered": False}

    cursor = db.cursor()
    updated = 0
    for tx_id in match["transaction_ids"]:
        cursor.execute(
            """
            UPDATE transactions
            SET category = ?, category_source = 'upi_stitcher'
            WHERE id = ? AND user_id = ?
            """,
            (category, tx_id, user_id),
        )
        updated += cursor.rowcount
    iou_id = None
    if register_iou:
        from backend.services.profile_service import create_user_constraint
        from backend.schemas.profile import UserConstraintCreate
        constraint = create_user_constraint(
            UserConstraintCreate(
                user_id=user_id,
                constraint_type="PENDING_IOU",
                label=iou_label or f"Split bill owed by {match['counterparty']}",
                amount=match["exact_sum"],
                metadata={"cluster_key": cluster_key, "transaction_ids": match["transaction_ids"]},
            ),
            db,
        )
        iou_id = constraint.id
    db.commit()
    return {
        "updated_count": updated,
        "cluster_key": cluster_key,
        "category": category,
        "transaction_ids": match["transaction_ids"],
        "iou_registered": bool(iou_id),
        "iou_constraint_id": iou_id,
    }
