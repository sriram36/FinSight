import pytest

def test_kfs_audit_empty_file_fails(client):
    res = client.post(
        "/documents/audit-kfs",
        files={"file": ("empty.txt", b"", "text/plain")},
        data={"user_id": "default_user"}
    )
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()


def test_kfs_audit_flat_rate_and_bounce_traps(client):
    loan_text = """
    PERSONAL LOAN SANCTION LETTER & KEY FACT STATEMENT
    Sanctioned Amount: Rs 1,00,000
    Tenure: 12 Months
    Interest Rate: 12.5% flat interest rate p.a.
    Processing Fee: 3.0% + GST
    Bounce Charge: Rs 750 for every failed NACH/ECS debit.
    Foreclosure Charge: 5% foreclosure penalty applies if closed before 6 months.
    """
    res = client.post(
        "/documents/audit-kfs",
        files={"file": ("sanction_letter.txt", loan_text.encode("utf-8"), "text/plain")},
        data={"user_id": "default_user"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "trap_score" in data
    assert data["trap_score"] >= 50
    assert data["risk_level"] in ["HIGH_RISK", "PREDATORY"]
    assert data["effective_apr_note"] is not None
    assert "effective reducing apr" in data["effective_apr_note"].lower()
    
    categories = [f["category"] for f in data["flags"]]
    assert "APR Trap" in categories
    assert "Bounce & Penal Trap" in categories
    assert "Prepayment Penalty" in categories


def test_kfs_audit_clean_transparent_loan(client):
    clean_text = """
    RETAIL FLOATING RATE LOAN AGREEMENT
    Annual Percentage Rate (APR): 10.25% p.a. reducing balance.
    Processing Fee: 0.5%
    Cooling-off Period: 3 days to return principal with zero penalty.
    Foreclosure Charges: NIL as per RBI retail guidelines.
    Bounce Penalty: Rs 150.
    """
    res = client.post(
        "/documents/audit-kfs",
        files={"file": ("clean_loan.txt", clean_text.encode("utf-8"), "text/plain")},
        data={"user_id": "default_user"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["trap_score"] <= 35
    assert data["risk_level"] in ["TRANSPARENT", "MODERATE_RISK"]
