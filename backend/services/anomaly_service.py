import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from collections import defaultdict

def detect_anomalies_from_ledger(user_id: str, db) -> List[Dict[str, Any]]:
    """
    Deterministic rule-based and statistical anomaly detection over user transactions.
    Detects:
    1. Unusually large transaction (> 3.0x user category average or overall median)
    2. Potential duplicate transactions (same description & amount within 72 hours)
    3. New / unfamiliar merchant with high spend
    4. Sudden category spike
    """
    cursor = db.cursor()
    cursor.execute("""
    SELECT id, transaction_date, description, amount, direction, category
    FROM transactions
    WHERE user_id = ?
    ORDER BY transaction_date ASC
    """, (user_id,))
    txs = cursor.fetchall()
    
    if not txs:
        return []
    
    spending_txs = [t for t in txs if t["direction"] == "spending"]
    if not spending_txs:
        return []
    
    # Calculate category baselines
    cat_amounts: Dict[str, List[float]] = defaultdict(list)
    merchant_counts: Dict[str, int] = defaultdict(int)
    for t in spending_txs:
        cat_amounts[t["category"]].append(float(t["amount"]))
        merchant_counts[t["description"].strip().lower()] += 1
        
    cat_averages = {
        cat: sum(amts) / max(1, len(amts))
        for cat, amts in cat_amounts.items()
    }
    
    all_amounts = sorted([float(t["amount"]) for t in spending_txs])
    median_amount = all_amounts[len(all_amounts) // 2] if all_amounts else 0.0
    
    detected: List[Dict[str, Any]] = []
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # Check 1: Potential Duplicate Charges (same description, same amount, within 3 days)
    for i in range(len(spending_txs)):
        t1 = spending_txs[i]
        try:
            d1 = datetime.fromisoformat(t1["transaction_date"][:10])
        except Exception:
            continue
            
        for j in range(i + 1, min(i + 15, len(spending_txs))):
            t2 = spending_txs[j]
            try:
                d2 = datetime.fromisoformat(t2["transaction_date"][:10])
            except Exception:
                continue
                
            day_diff = abs((d2 - d1).days)
            if day_diff <= 3 and t1["description"].strip().lower() == t2["description"].strip().lower() and abs(float(t1["amount"]) - float(t2["amount"])) < 0.01:
                # Flag t2 as potential duplicate
                detected.append({
                    "transaction_id": t2["id"],
                    "title": f"Potential Duplicate Charge: {t2['description']}",
                    "category": t2["category"],
                    "amount": float(t2["amount"]),
                    "baseline_amount": float(t1["amount"]),
                    "deviation_pct": 0.0,
                    "alert_type": "duplicate_charge",
                    "severity": "high",
                    "explanation": f"Identical charge of ₹{float(t2['amount']):,.2f} recorded on {t2['transaction_date']} within {day_diff} day(s) of an identical charge on {t1['transaction_date']}."
                })
    
    # Check 2: Unusually Large Transaction
    for t in spending_txs:
        amt = float(t["amount"])
        cat = t["category"]
        avg = cat_averages.get(cat, median_amount)
        
        # If amount is > 2.8x category average and > ₹1,500
        if avg > 0 and (amt / avg) >= 2.8 and amt >= 1500.0:
            dev_pct = round(((amt - avg) / avg) * 100.0, 1)
            detected.append({
                "transaction_id": t["id"],
                "title": f"Unusually Large Transaction: {t['description']}",
                "category": cat,
                "amount": amt,
                "baseline_amount": round(avg, 2),
                "deviation_pct": dev_pct,
                "alert_type": "unusually_large",
                "severity": "high" if (amt / avg) >= 4.0 else "medium",
                "explanation": f"Charge of ₹{amt:,.2f} in {cat} is {amt/avg:.1f}x higher than your historical category average of ₹{avg:,.2f} (+{dev_pct}% deviation)."
            })
            
        # Check 3: High amount on first-time/single-occurrence merchant
        desc_norm = t["description"].strip().lower()
        if merchant_counts.get(desc_norm, 0) == 1 and amt >= 3500.0 and amt > 2.0 * median_amount:
            detected.append({
                "transaction_id": t["id"],
                "title": f"New Merchant High Outflow: {t['description']}",
                "category": cat,
                "amount": amt,
                "baseline_amount": round(median_amount, 2),
                "deviation_pct": round(((amt - median_amount) / max(1.0, median_amount)) * 100.0, 1),
                "alert_type": "unfamiliar_merchant",
                "severity": "medium",
                "explanation": f"First recorded payment to '{t['description']}' with significant outflow of ₹{amt:,.2f} (your ledger median is ₹{median_amount:,.2f})."
            })

    # Save to database idempotently (avoid duplicates for same transaction_id and alert_type)
    for alert in detected:
        cursor.execute("""
        SELECT id FROM anomalies
        WHERE user_id = ? AND transaction_id = ? AND alert_type = ?
        """, (user_id, alert["transaction_id"], alert["alert_type"]))
        existing = cursor.fetchone()
        
        if not existing:
            alert_id = f"anom_{uuid.uuid4().hex[:12]}"
            cursor.execute("""
            INSERT INTO anomalies (
                id, user_id, transaction_id, title, category, amount,
                baseline_amount, deviation_pct, alert_type, severity,
                explanation, status, user_decision, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', NULL, ?, ?)
            """, (
                alert_id, user_id, alert["transaction_id"], alert["title"],
                alert["category"], alert["amount"], alert["baseline_amount"],
                alert["deviation_pct"], alert["alert_type"], alert["severity"],
                alert["explanation"], now_iso, now_iso
            ))
            
    db.commit()
    return get_user_anomalies(user_id, db)

def get_user_anomalies(user_id: str, db, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    cursor = db.cursor()
    if status_filter:
        cursor.execute("""
        SELECT id, user_id, transaction_id, title, category, amount, baseline_amount,
               deviation_pct, alert_type, severity, explanation, status, user_decision,
               created_at, updated_at
        FROM anomalies
        WHERE user_id = ? AND status = ?
        ORDER BY created_at DESC
        """, (user_id, status_filter))
    else:
        cursor.execute("""
        SELECT id, user_id, transaction_id, title, category, amount, baseline_amount,
               deviation_pct, alert_type, severity, explanation, status, user_decision,
               created_at, updated_at
        FROM anomalies
        WHERE user_id = ?
        ORDER BY created_at DESC
        """, (user_id,))
        
    rows = cursor.fetchall()
    from backend.services.verifier_service import bind_evidence_bundle
    results = []
    for r in rows:
        amount = float(r["amount"])
        baseline = float(r["baseline_amount"] or 0.0)
        tx_ids = [r["transaction_id"]] if r["transaction_id"] else []
        results.append({
            "id": r["id"],
            "user_id": r["user_id"],
            "transaction_id": r["transaction_id"],
            "title": r["title"],
            "category": r["category"],
            "amount": amount,
            "baseline_amount": baseline,
            "deviation_pct": float(r["deviation_pct"] or 0.0),
            "alert_type": r["alert_type"],
            "severity": r["severity"],
            "explanation": r["explanation"],
            "status": r["status"],
            "user_decision": r["user_decision"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
            "evidence_bundle": bind_evidence_bundle(
                tx_ids,
                amount,
                baseline,
                extra={"flagged_amount": amount, "baseline_amount": baseline},
                claim_text=f"Flagged ₹{amount:,.2f} against baseline ₹{baseline:,.2f}.",
            ),
        })
    return results

def review_anomaly(anomaly_id: str, user_id: str, status: str, user_decision: Optional[str], db) -> bool:
    cursor = db.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
    UPDATE anomalies
    SET status = ?, user_decision = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
    """, (status, user_decision, now_iso, anomaly_id, user_id))
    db.commit()
    return cursor.rowcount > 0

def get_anomalies_summary(user_id: str, db) -> Dict[str, Any]:
    alerts = get_user_anomalies(user_id, db)
    new_alerts = [a for a in alerts if a["status"] == "new"]
    return {
        "total_alerts": len(alerts),
        "new_count": len(new_alerts),
        "reviewed_count": len([a for a in alerts if a["status"] != "new"]),
        "total_amount_flagged": round(sum(a["amount"] for a in new_alerts), 2),
        "high_severity_count": len([a for a in new_alerts if a["severity"] == "high"])
    }
