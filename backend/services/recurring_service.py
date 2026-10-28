import re
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional

KNOWN_SUBSCRIPTION_KEYWORDS = [
    "netflix", "spotify", "prime", "amazon prime", "youtube", "hotstar", "disney",
    "gym", "fitness", "rent", "mortgage", "broadband", "wifi", "airtel", "jio",
    "electricity", "water", "gas", "insurance", "lic", "emi", "loan", "apple",
    "google storage", "cloud", "aws", "github", "chatgpt", "openai"
]

def normalize_merchant_name(desc: str) -> str:
    # Strip transaction IDs, dates, special chars
    clean = re.sub(r'\b(?:tx_|syn_tx_|imp_|rec_|id_|\d{4}-\d{2}-\d{2}|\d+)\b', '', desc, flags=re.IGNORECASE)
    clean = re.sub(r'[\*\#\-\_]+', ' ', clean).strip()
    return clean.title() if clean else desc.strip().title()

def detect_recurring_from_ledger(user_id: str, db) -> List[Dict[str, Any]]:
    cursor = db.cursor()

    # Fetch all expense transactions ordered by date ascending
    cursor.execute("""
    SELECT id, transaction_date, description, amount, category
    FROM transactions
    WHERE user_id = ? AND (direction = 'spending' OR direction = 'debit')
    ORDER BY transaction_date ASC
    """, (user_id,))
    rows = cursor.fetchall()

    merchant_txs = defaultdict(list)
    for r in rows:
        norm_name = normalize_merchant_name(r["description"])
        merchant_txs[norm_name].append({
            "id": r["id"],
            "date": r["transaction_date"],
            "amount": float(r["amount"]),
            "category": r["category"],
            "raw_desc": r["description"]
        })

    detected_items = []
    now_iso = datetime.now(timezone.utc).isoformat()
    now_date = datetime.now(timezone.utc).date()

    for merchant, txs in merchant_txs.items():
        is_known_sub = any(k in merchant.lower() for k in KNOWN_SUBSCRIPTION_KEYWORDS)

        # Candidate if 2+ transactions or known subscription
        if len(txs) >= 2 or (len(txs) == 1 and is_known_sub):
            txs_sorted = sorted(txs, key=lambda x: x["date"])
            dates = []
            for t in txs_sorted:
                try:
                    dates.append(datetime.strptime(t["date"], "%Y-%m-%d").date())
                except Exception:
                    pass

            intervals = []
            for i in range(1, len(dates)):
                diff = (dates[i] - dates[i-1]).days
                intervals.append(diff)

            # Determine frequency
            frequency = "monthly"
            confidence = 0.7
            if intervals:
                avg_interval = sum(intervals) / len(intervals)
                if 25 <= avg_interval <= 35:
                    frequency = "monthly"
                    confidence = 0.95
                elif 5 <= avg_interval <= 9:
                    frequency = "weekly"
                    confidence = 0.90
                elif 80 <= avg_interval <= 100:
                    frequency = "quarterly"
                    confidence = 0.85
                elif is_known_sub:
                    frequency = "monthly"
                    confidence = 0.80
            elif is_known_sub:
                confidence = 0.75

            # Latest transaction amount
            latest_tx = txs_sorted[-1]
            latest_amount = latest_tx["amount"]
            last_date = dates[-1] if dates else now_date

            # Calculate next due date
            if frequency == "weekly":
                next_due = last_date + timedelta(days=7)
            elif frequency == "quarterly":
                next_due = last_date + timedelta(days=90)
            else:
                next_due = last_date + timedelta(days=30)

            # Price hike detection
            price_change = None
            if len(txs_sorted) >= 2:
                prior_amt = txs_sorted[-2]["amount"]
                if round(latest_amount, 2) > round(prior_amt, 2):
                    hike = round(latest_amount - prior_amt, 2)
                    price_change = f"Price increased by ₹{hike:,.2f} (from ₹{prior_amt:,.2f})"

            # Category
            cat = latest_tx["category"] or ("Subscriptions" if is_known_sub else "Miscellaneous")

            # Check if already saved in recurring_items
            cursor.execute("""
            SELECT id, is_confirmed, status FROM recurring_items
            WHERE user_id = ? AND merchant = ?
            """, (user_id, merchant))
            existing = cursor.fetchone()

            item_id = existing["id"] if existing else f"rec_{uuid.uuid4().hex[:12]}"
            is_confirmed = int(existing["is_confirmed"]) if existing else 0
            status = existing["status"] if existing else "active"

            if existing:
                cursor.execute("""
                UPDATE recurring_items
                SET amount = ?, frequency = ?, next_due_date = ?, last_seen_date = ?, category = ?, confidence = ?, notes = ?
                WHERE id = ?
                """, (latest_amount, frequency, next_due.isoformat(), last_date.isoformat(), cat, confidence, price_change, item_id))
            else:
                cursor.execute("""
                INSERT INTO recurring_items (id, user_id, merchant, category, amount, frequency, next_due_date, last_seen_date, status, is_confirmed, confidence, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (item_id, user_id, merchant, cat, latest_amount, frequency, next_due.isoformat(), last_date.isoformat(), status, is_confirmed, confidence, price_change, now_iso))

            amounts = [t["amount"] for t in txs_sorted]
            first_amt = amounts[0]
            price_creep_pct = round(((latest_amount - first_amt) / first_amt) * 100.0, 2) if first_amt else 0.0
            is_phantom = bool(price_change) or price_creep_pct >= 8.0
            draft = None
            if is_phantom:
                reason = f"unnotified price increase from ₹{first_amt:,.2f} to ₹{latest_amount:,.2f} (+{price_creep_pct}%)" if price_change else f"plan rate creep across billing cycles"
                draft = (
                    f"Subject: Immediate Subscription Cancellation & Autopay Revocation — {merchant}\n\n"
                    f"To Customer Support ({merchant}),\n\n"
                    f"Please treat this message as formal notice to immediately cancel my active subscription and revoke any recurring UPI autopay/e-mandate for {merchant}.\n\n"
                    f"Reason: Review of bank statement records identified {reason} (current charge: ₹{latest_amount:,.2f}/{frequency}).\n\n"
                    f"Please confirm termination with immediate effect and verify that no further debits will occur.\n\n"
                    f"Thank you,\n[Account Holder]"
                )
            detected_items.append({
                "id": item_id,
                "merchant": merchant,
                "category": cat,
                "amount": latest_amount,
                "frequency": frequency,
                "last_seen_date": last_date.isoformat(),
                "next_due_date": next_due.isoformat(),
                "is_confirmed": bool(is_confirmed),
                "confidence": confidence,
                "occurrence_count": len(txs),
                "notes": price_change,
                "price_change_note": price_change,
                "status": status,
                "is_phantom_drain": is_phantom,
                "price_creep_pct": price_creep_pct,
                "baseline_amount": first_amt,
                "transaction_ids": [t["id"] for t in txs_sorted],
                "cancellation_draft": draft,
            })

    db.commit()
    # Flag overlapping recurring charges (same merchant family within 3 days)
    by_norm = defaultdict(list)
    for item in detected_items:
        by_norm[item["merchant"].split()[0].lower()].append(item)
    for group in by_norm.values():
        if len(group) < 2:
            continue
        for item in group:
            item["overlapping_recurring"] = True
            item["is_phantom_drain"] = True
    return detected_items

def get_recurring_items(user_id: str, db) -> List[Dict[str, Any]]:
    cursor = db.cursor()
    cursor.execute("""
    SELECT id, user_id, merchant, category, amount, frequency, next_due_date, last_seen_date, status, is_confirmed, confidence, notes, created_at
    FROM recurring_items
    WHERE user_id = ?
    ORDER BY amount DESC
    """, (user_id,))
    rows = cursor.fetchall()
    items = []
    for r in rows:
        is_phantom = bool(r["notes"] and "increased" in str(r["notes"]).lower())
        draft = None
        if is_phantom:
            m_name = r["merchant"]
            draft = (
                f"Subject: Immediate Subscription Cancellation & Autopay Revocation — {m_name}\n\n"
                f"To Customer Support ({m_name}),\n\n"
                f"Please treat this message as formal notice to immediately cancel my active subscription and revoke any recurring UPI autopay/e-mandate for {m_name}.\n\n"
                f"Reason: Review of bank statement records identified an unnotified price increase ({r['notes']}).\n\n"
                f"Please confirm termination with immediate effect and verify that no further debits will occur.\n\n"
                f"Thank you,\n[Account Holder]"
            )
        items.append({
            "id": r["id"],
            "user_id": r["user_id"],
            "merchant": r["merchant"],
            "category": r["category"],
            "amount": float(r["amount"]),
            "frequency": r["frequency"],
            "next_due_date": r["next_due_date"],
            "last_seen_date": r["last_seen_date"],
            "status": r["status"],
            "is_confirmed": bool(r["is_confirmed"]),
            "confidence": float(r["confidence"] or 1.0),
            "notes": r["notes"],
            "created_at": r["created_at"],
            "is_phantom_drain": is_phantom,
            "price_change_note": r["notes"],
            "cancellation_draft": draft,
        })
    return items

def confirm_recurring_item(item_id: str, user_id: str, is_confirmed: bool, db) -> bool:
    cursor = db.cursor()
    cursor.execute("""
    UPDATE recurring_items
    SET is_confirmed = ?
    WHERE id = ? AND user_id = ?
    """, (1 if is_confirmed else 0, item_id, user_id))
    db.commit()
    return cursor.rowcount > 0

def get_upcoming_schedule(user_id: str, horizon_days: int, db) -> Dict[str, Any]:
    items = get_recurring_items(user_id, db)
    now_date = datetime.now(timezone.utc).date()
    cutoff_date = now_date + timedelta(days=horizon_days)

    upcoming = []
    total_upcoming_amount = 0.0

    for it in items:
        if it["status"] != "active":
            continue
        try:
            due = datetime.strptime(it["next_due_date"][:10], "%Y-%m-%d").date()
            if now_date <= due <= cutoff_date:
                days_left = (due - now_date).days
                it_copy = dict(it)
                it_copy["days_remaining"] = days_left
                it_copy["due_date"] = it["next_due_date"]
                upcoming.append(it_copy)
                total_upcoming_amount += float(it["amount"])
        except Exception:
            pass

    upcoming.sort(key=lambda x: x.get("days_remaining", 999))
    rounded_total = round(total_upcoming_amount, 2)

    return {
        "horizon_days": horizon_days,
        "total_upcoming": rounded_total,
        "total_upcoming_amount": rounded_total,
        "count": len(upcoming),
        "items": upcoming,
        "upcoming_items": upcoming
    }
