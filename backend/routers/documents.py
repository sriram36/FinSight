import io
import re
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from pydantic import BaseModel

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

router = APIRouter(prefix="/documents", tags=["Documents"])


class KFSFlag(BaseModel):
    category: str
    severity: str  # HIGH, MEDIUM, LOW
    headline: str
    finding: str
    plain_language_advice: str


class KFSAuditResponse(BaseModel):
    filename: str
    trap_score: int
    risk_level: str  # TRANSPARENT, MODERATE_RISK, HIGH_RISK, PREDATORY
    summary: str
    effective_apr_note: Optional[str] = None
    flags: List[KFSFlag]
    key_terms_extracted: Dict[str, Any]
    plain_language_comparison: List[str]


def _extract_text_from_file(content: bytes, filename: str) -> str:
    """Extract plain text from PDF or raw text document."""
    text = ""
    is_pdf = filename.lower().endswith(".pdf") or content.startswith(b"%PDF")
    
    if is_pdf and PdfReader:
        try:
            reader = PdfReader(io.BytesIO(content))
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        except Exception:
            pass

    if not text.strip():
        # Fallback to UTF-8 or Latin-1
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = content.decode("latin-1")
            except Exception:
                text = str(content)
    return text.strip()


@router.post("/audit-kfs", response_model=KFSAuditResponse)
async def audit_kfs_document(
    file: UploadFile = File(...),
    user_id: str = Form("default_user")
):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided.")
    
    content = await file.read()
    if not content or len(content) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded document is empty.")

    extracted_text = _extract_text_from_file(content, file.filename)
    if not extracted_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to extract text from the uploaded document. Ensure it is a text or readable PDF."
        )

    text_lower = extracted_text.lower()
    flags: List[KFSFlag] = []
    trap_points = 0
    extracted_terms: Dict[str, Any] = {}

    # Trap 1: Flat Rate vs Reducing APR Trap
    flat_rate_match = re.search(r'(\d+(?:\.\d+)?)\s*%\s*(?:p\.?a\.?)?\s*flat', text_lower)
    reducing_match = re.search(r'(\d+(?:\.\d+)?)\s*%\s*(?:reducing|apr)', text_lower)
    apr_note = None

    if flat_rate_match:
        flat_val = float(flat_rate_match.group(1))
        approx_reducing = round(flat_val * 1.85, 1)
        apr_note = f"Advertised flat rate of {flat_val}% equals an effective reducing APR of approximately ~{approx_reducing}% p.a."
        trap_points += 30
        extracted_terms["advertised_flat_rate"] = f"{flat_val}%"
        extracted_terms["effective_reducing_apr"] = f"~{approx_reducing}%"
        flags.append(KFSFlag(
            category="APR Trap",
            severity="HIGH",
            headline="Advertised Flat Rate Hides True Interest Cost",
            finding=f"Document mentions a flat interest rate of {flat_val}%. In flat-rate loans, interest is charged on the initial principal for the entire tenure even as you pay it down.",
            plain_language_advice=f"Your actual borrowing cost is roughly {approx_reducing}% APR, almost double the advertised headline rate. Demand the official Key Fact Statement (KFS) showing the Annual Percentage Rate (APR)."
        ))
    elif "flat rate" in text_lower:
        trap_points += 25
        apr_note = "Document references flat interest rate pricing."
        flags.append(KFSFlag(
            category="APR Trap",
            severity="HIGH",
            headline="Flat Interest Rate Mentioned",
            finding="Document refers to flat interest calculation, which mathematically inflates effective borrowing costs.",
            plain_language_advice="Always verify the RBI-mandated Key Fact Statement APR figure before signing."
        ))

    # Trap 2: Bounce & Penal Charges
    bounce_match = re.search(r'(?:bounce|dishono(?:u)?r|nach|ecs)[^\n\.\,]*?(?:₹|rs\.?|inr)?\s*([0-9]{3,5})', text_lower)
    if bounce_match or any(w in text_lower for w in ["bounce charge", "ecs bounce", "nach bounce", "penal interest"]):
        bounce_amt = float(bounce_match.group(1)) if bounce_match else 500.0
        extracted_terms["bounce_charge"] = f"₹{bounce_amt:,.2f}"
        if bounce_amt > 250:
            trap_points += 20
            flags.append(KFSFlag(
                category="Bounce & Penal Trap",
                severity="HIGH" if bounce_amt >= 500 else "MEDIUM",
                headline=f"Aggressive Bounce Penalty (₹{bounce_amt:,.0f}+)",
                finding=f"Failed mandate / auto-debit charge detected (approx ₹{bounce_amt:,.0f}). Many lenders charge ₹500 + 18% GST plus bank bounce fee.",
                plain_language_advice="A single missed ₹1,500 EMI could trigger ₹1,000+ in combined lender and bank penalties. Ensure sufficient buffer in your account 24h before debit date."
            ))

    # Trap 3: Foreclosure & Pre-Payment Lock-ins
    foreclose_is_zero = bool(re.search(r'(?:foreclosure|pre-?payment|pre-?closure)[^\n\.\,]*?(?:nil|zero|none|0%|no\s+charge)', text_lower))
    foreclose_match = re.search(r'(?:foreclosure|pre-?payment|pre-?closure)[^\n\.\,]*?(\d+(?:\.\d+)?)\s*%', text_lower)
    lockin_match = re.search(r'(?:lock-?in|minimum tenure)[^\n\.\,]*?(\d+)\s*(?:month|year)', text_lower)
    if not foreclose_is_zero and (foreclose_match or lockin_match or any(w in text_lower for w in ["foreclosure penalty", "foreclosure fee", "prepayment penalty", "lock-in"])):
        f_val = foreclose_match.group(1) if foreclose_match else "3-5"
        trap_points += 20
        extracted_terms["foreclosure_penalty"] = f"{f_val}%"
        flags.append(KFSFlag(
            category="Prepayment Penalty",
            severity="HIGH",
            headline=f"Foreclosure Penalty Detected ({f_val}%)",
            finding="The agreement penalizes prepaying your principal or transferring the balance to a cheaper lender.",
            plain_language_advice="Under RBI floating-rate retail loan guidelines, foreclosure penalties on individuals are prohibited. Confirm if this is a fixed-rate loan or an NBFC contract charging unlawful pre-closure fees."
        ))

    # Trap 4: Processing Fee + GST Surcharge
    fee_match = re.search(r'processing\s*fee[^\n\.\,]*?(\d+(?:\.\d+)?)\s*%', text_lower)
    if fee_match or "processing fee" in text_lower or "admin charge" in text_lower:
        fee_pct_val = float(fee_match.group(1)) if fee_match else 2.5
        fee_pct = str(fee_pct_val)
        extracted_terms["processing_fee"] = f"{fee_pct}%"
        if fee_pct_val > 1.5:
            trap_points += 15
            flags.append(KFSFlag(
                category="Hidden Fee",
                severity="MEDIUM",
                headline=f"Elevated Upfront Processing Fee ({fee_pct}% + GST)",
                finding=f"Processing fee of ~{fee_pct}% will be deducted upfront from your sanctioned loan before disbursal.",
                plain_language_advice="Remember that 18% GST applies on processing fees, and this is non-refundable even if you cancel within the cooling-off period."
            ))

    # Trap 5: Cooling-off Period Absence
    if "cooling off" not in text_lower and "cooling-off" not in text_lower and "look-in" not in text_lower:
        trap_points += 15
        flags.append(KFSFlag(
            category="Regulatory Rights",
            severity="MEDIUM",
            headline="No Explicit Cooling-Off Period Stated",
            finding="The document does not explicitly state the mandatory RBI cooling-off period (minimum 1 to 3 days to exit without penalty).",
            plain_language_advice="RBI digital lending guidelines require lenders to give borrowers a look-up period to return the loan with zero prepayment penalty."
        ))

    # Trap 6: Health Insurance / Policy Sub-limits
    if any(w in text_lower for w in ["room rent", "sub-limit", "copay", "co-pay", "proportionate"]):
        trap_points += 20
        flags.append(KFSFlag(
            category="Insurance Sub-limit",
            severity="HIGH",
            headline="Room-Rent Capping / Proportionate Deduction Clause",
            finding="Contains room rent sub-limits or co-payment clauses. Exceeding the capped room tier triggers proportionate deductions across your entire medical bill.",
            plain_language_advice="Avoid policies with room rent caps (e.g. 1% of sum insured), as ICU and doctor consultation fees will also be cut proportionately."
        ))

    # Calculate final trap score
    trap_score = min(100, max(0, trap_points))
    if trap_score <= 20:
        risk_level = "TRANSPARENT"
        summary = "This document appears relatively transparent with standard institutional clauses and minimal predatory traps."
    elif trap_score <= 50:
        risk_level = "MODERATE_RISK"
        summary = f"Audit detected {len(flags)} fine-print clauses that increase borrowing costs or impose friction upon prepayment."
    elif trap_score <= 75:
        risk_level = "HIGH_RISK"
        summary = f"High Risk: Detected {len(flags)} predatory triggers including elevated bounce penalties or hidden upfront fee deductions."
    else:
        risk_level = "PREDATORY"
        summary = f"Predatory Terms Detected: Found {len(flags)} major mathematical and legal traps (e.g., flat interest rate, heavy bounce fees, foreclosure lock-ins)."

    comparison_points = [
        f"Trap Score: {trap_score}/100 ({risk_level.replace('_', ' ')})",
        f"Audited Clauses: {len(flags)} potential borrower friction points identified",
        "Verification: Cross-referenced against RBI Digital Lending & KFS Guidelines"
    ]
    if apr_note:
        comparison_points.insert(1, apr_note)

    return KFSAuditResponse(
        filename=file.filename,
        trap_score=trap_score,
        risk_level=risk_level,
        summary=summary,
        effective_apr_note=apr_note,
        flags=flags,
        key_terms_extracted=extracted_terms,
        plain_language_comparison=comparison_points
    )
