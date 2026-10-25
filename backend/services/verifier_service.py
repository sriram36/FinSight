import re
from typing import Dict, Any, List
from backend.schemas.verifier import VerificationResult

CURRENCY_EVIDENCE_KEYS = {
    "recent_amount", "baseline_amount", "expected_impact", "monthly_impact",
    "recent_daily_pace", "baseline_daily_pace", "diff_pace", "reallocation_amount",
    "total_spent", "purchase_amount", "available_balance", "post_purchase_balance",
    "emergency_buffer", "emergency_fund_target", "total_income", "total_spending",
    "net_savings", "target_amount", "current_amount", "remaining_amount", "latest_amount"
}
PERCENTAGE_EVIDENCE_KEYS = {
    "percentage_deviation", "target_reduction", "threshold", "delta_percentage", "profile_delta", "savings_rate_pct"
}
COUNT_EVIDENCE_KEYS = {
    "transaction_count", "period_days", "baseline_days", "recent_days"
}

def extract_numeric_tokens(text: str) -> List[Dict[str, Any]]:
    # 1. Strip entity identifiers (e.g. syn_tx_0072, tx_seed_123, imp_456, rec_789)
    # so transaction ID digits are never extracted as numerical claims.
    clean_text = re.sub(r'\b(?:tx_|syn_tx_|imp_|rec_|pref_|goal_)[a-zA-Z0-9_]+\b', '', text)

    # 2. Strip explicit calendar ISO dates (YYYY-MM-DD)
    clean_text = re.sub(r'\b\d{4}-\d{2}-\d{2}\b', '', clean_text)

    # 3. Identify temporal calendar literals immediately adjacent to time units (e.g. "30 days", "2 months", "2026")
    temporal_spans = set()
    for m in re.finditer(r'\b([0-9]+)\s*(?:day|days|month|months|week|weeks|year|years)\b', clean_text, re.IGNORECASE):
        temporal_spans.add((m.start(1), m.end(1)))
    for m in re.finditer(r'\b(202[4-9]|203[0-5])\b', clean_text):
        temporal_spans.add((m.start(1), m.end(1)))

    tokens = []
    seen_spans = set()

    # Pattern for explicit currency: ₹1,200.50, $45.00
    currency_pattern = r'[₹\$]\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)'
    for m in re.finditer(currency_pattern, clean_text):
        num = float(m.group(1).replace(",", ""))
        tokens.append({"token": m.group(0), "value": num, "unit": "currency"})
        seen_spans.add((m.start(), m.end()))

    # Pattern for explicit percentages: 25%, 38.7%
    percentage_pattern = r'([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)\s*%'
    for m in re.finditer(percentage_pattern, clean_text):
        num = float(m.group(1).replace(",", ""))
        tokens.append({"token": m.group(0), "value": num, "unit": "percentage"})
        seen_spans.add((m.start(), m.end()))

    # Pattern for standalone numbers (counts, unadorned figures)
    number_pattern = r'\b([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)\b'
    for m in re.finditer(number_pattern, clean_text):
        start, end = m.start(1), m.end(1)
        if any(s <= start and end <= e for s, e in seen_spans):
            continue
        if (start, end) in temporal_spans:
            continue
        raw_val = m.group(1)
        num = float(raw_val.replace(",", ""))
        tokens.append({"token": m.group(0), "value": num, "unit": "number"})

    return tokens

def is_unit_compatible(token_unit: str, evidence_key: str) -> bool:
    """Enforce unit discipline: currency claims cannot match percentages or counts."""
    if token_unit == "currency":
        return evidence_key in CURRENCY_EVIDENCE_KEYS
    elif token_unit == "percentage":
        return evidence_key in PERCENTAGE_EVIDENCE_KEYS
    elif token_unit == "number":
        # Unadorned number can match count keys, or currency/percentage if units were implicit
        return True
    return True

def verify_recommendation_claims(
    text: str,
    evidence: Dict[str, Any],
    tolerance: float = 0.01  # ±1.0% tolerance per CONSTRAINTS.md
) -> VerificationResult:
    tokens = extract_numeric_tokens(text)

    # Flatten numeric values from evidence
    evidence_nums: Dict[str, float] = {}
    for k, v in evidence.items():
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            evidence_nums[k] = float(v)

    matched = []
    unsupported = []

    for item in tokens:
        val = item["value"]
        token_unit = item["unit"]

        best_match_key = None
        min_diff = float("inf")

        for ek, ev in evidence_nums.items():
            if not is_unit_compatible(token_unit, ek):
                continue

            diff = abs(val - ev)
            max_allowed = max(0.01, abs(ev) * tolerance)
            if diff <= max_allowed:
                if diff < min_diff:
                    min_diff = diff
                    best_match_key = ek

        if best_match_key:
            matched.append({
                "token": item["token"],
                "value": val,
                "unit": token_unit,
                "evidence_key": best_match_key,
                "evidence_value": evidence_nums[best_match_key]
            })
        else:
            unsupported.append({
                "token": item["token"],
                "value": val,
                "unit": token_unit
            })

    is_verified = (len(unsupported) == 0)
    if is_verified:
        notes = f"All {len(matched)} numeric claims verified against backend evidence within {tolerance*100:.1f}% tolerance."
    else:
        unsupported_desc = [f"{u['token']} ({u['value']})" for u in unsupported]
        notes = f"Verification failed: {len(unsupported)} unsupported numeric claims detected: {', '.join(unsupported_desc)}."

    return VerificationResult(
        is_verified=is_verified,
        matched_claims=matched,
        unsupported_claims=unsupported,
        tolerance_used=tolerance,
        notes=notes
    )
