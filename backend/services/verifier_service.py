import re
from typing import Dict, Any, List
from backend.schemas.verifier import VerificationResult

# Numbers representing standard calendar periods, years or common UI intervals
ALLOWED_LITERALS = {1, 2, 3, 4, 5, 7, 10, 14, 15, 21, 28, 30, 31, 60, 90, 180, 365, 2024, 2025, 2026, 2027}

def extract_numeric_tokens(text: str) -> List[Dict[str, Any]]:
    # Regex matching currency amounts, percentages, and decimals
    # Matches: ₹130.00, 30.0%, 900.00, 1,500
    pattern = r'(?:[₹\$]\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)|([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)\s*%)'
    # Also find standalone decimals or floats:
    fallback_pattern = r'([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)'

    tokens = []
    seen_spans = set()

    for m in re.finditer(pattern, text):
        raw_val = m.group(1) or m.group(2)
        if raw_val:
            num = float(raw_val.replace(",", ""))
            tokens.append({"token": m.group(0), "value": num})
            seen_spans.add((m.start(), m.end()))

    # Fallback scan for standalone monetary numbers with commas or decimals
    for m in re.finditer(fallback_pattern, text):
        start, end = m.start(), m.end()
        if any(s <= start and end <= e for s, e in seen_spans):
            continue
        raw_val = m.group(1)
        num = float(raw_val.replace(",", ""))
        tokens.append({"token": m.group(0), "value": num})

    return tokens

def verify_recommendation_claims(
    text: str,
    evidence: Dict[str, Any],
    tolerance: float = 0.015  # 1.5% tolerance
) -> VerificationResult:
    tokens = extract_numeric_tokens(text)

    # Flatten numeric values from evidence
    evidence_nums: Dict[str, float] = {}
    for k, v in evidence.items():
        if isinstance(v, (int, float)):
            evidence_nums[k] = float(v)

    matched = []
    unsupported = []

    for item in tokens:
        val = item["value"]
        # Skip small calendar literals or common count words unless matching evidence
        if int(val) in ALLOWED_LITERALS and val == int(val) and val not in evidence_nums.values():
            continue

        best_match_key = None
        min_diff = 999999.0

        for ek, ev in evidence_nums.items():
            diff = abs(val - ev)
            max_allowed = max(0.5, ev * tolerance)
            if diff <= max_allowed:
                if diff < min_diff:
                    min_diff = diff
                    best_match_key = ek

        if best_match_key:
            matched.append({
                "token": item["token"],
                "value": val,
                "evidence_key": best_match_key,
                "evidence_value": evidence_nums[best_match_key]
            })
        else:
            unsupported.append({
                "token": item["token"],
                "value": val
            })

    is_verified = (len(unsupported) == 0)
    if is_verified:
        notes = f"All {len(matched)} numeric claims verified against backend evidence."
    else:
        notes = f"Verification failed: {len(unsupported)} unsupported numeric claims detected ({[u['value'] for u in unsupported]})."

    return VerificationResult(
        is_verified=is_verified,
        matched_claims=matched,
        unsupported_claims=unsupported,
        tolerance_used=tolerance,
        notes=notes
    )
