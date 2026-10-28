# FinSight Gap Fixes & UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 6 spec gaps identified in the deep gap analysis and polish every view to a breathable, non-congested production-quality UI.

**Architecture:** Backend fixes are additive — no existing APIs or schemas are removed. UI polish follows the existing Tailwind/shadcn pattern but reduces density with more whitespace, card breathing room, and cleaner hierarchy. All 62 tests must remain green.

**Tech Stack:** Next.js 15 App Router, FastAPI, SQLite (dev), Python 3.11+, Tailwind CSS, shadcn/ui, lucide-react

**Spec:** `C:/Users/kolli/.gemini/antigravity/brain/a4641682-a8a0-470f-9148-a0ff721c576e/deep-gap-analysis.md`

## Global Constraints

- Never break existing pytest suite — 62 tests must pass after every task
- TypeScript `--noEmit` must pass after every frontend task
- Do NOT remove or rename any existing API endpoint
- Do NOT alter Research Lab files (`research_service.py`, `research-view.tsx`, `research.py`)
- All amounts displayed in ₹ Indian Rupee format
- Tailwind only — no new CSS framework dependencies
- `evidence_bundle` must be present on every insight card returned by backend
- `BEHAVIORAL_CAP` constraint enforcement must be non-breaking (existing constraints with no cap set → zero cap = no enforcement = existing behaviour preserved)

## Review Focus

1. `BEHAVIORAL_CAP` with amount=0 — must not divide-by-zero or break safe-to-spend
2. Monte Carlo with very small std_dev (all spend same amount daily) — survival should be ~100%
3. KFS auditor receiving non-PDF / empty file — must return 400 not 500
4. Chat affordability reply with zero active constraints — must not crash when iterating violations list
5. UI: dark mode contrast — all new text colours must pass WCAG 4.5:1

---

## Task 1: BEHAVIORAL_CAP Enforcement in safe-to-spend & stress test

**Files:**
- Modify: `backend/services/profile_service.py` (lines 312–371, `calculate_true_safe_to_spend`)
- Modify: `backend/services/affordability_service.py` (lines 143–267, `run_cashflow_stress_test`)
- Modify: `backend/tests/test_affordability.py` (add behavioral cap test)

**Interfaces:**
- Consumes: `list_user_constraints()` already imported
- Produces: `SafeToSpendResponse` now includes `behavioral_cap_violations: list[dict]`; `run_cashflow_stress_test` adds `BEHAVIORAL_CAP` type entries to `constraint_violations`

- [ ] **Step 1: Add behavioral_cap_violations field to SafeToSpendResponse schema**

In `backend/schemas/profile.py`, add to `SafeToSpendResponse`:
```python
behavioral_cap_violations: List[Dict[str, Any]] = Field(default_factory=list)
```

- [ ] **Step 2: Enforce BEHAVIORAL_CAP in calculate_true_safe_to_spend**

After `safe_today` is computed in `profile_service.py`, add:
```python
behavioral_caps = [c for c in constraints if c.constraint_type == "BEHAVIORAL_CAP" and c.amount > 0]
behavioral_cap_violations = []
for cap in behavioral_caps:
    # cap.amount = weekly rupee cap; derive daily limit
    daily_cap = round(cap.amount / 7.0, 2)
    # compare against predicted essential burn daily rate (proxy for recent velocity)
    recent_daily = essential_burn / max(1, days_until_inflow)
    if recent_daily > daily_cap:
        overage = round(recent_daily - daily_cap, 2)
        behavioral_cap_violations.append({
            "constraint_id": cap.id,
            "label": cap.label,
            "weekly_cap": cap.amount,
            "daily_cap": daily_cap,
            "current_daily_velocity": round(recent_daily, 2),
            "overage_per_day": overage,
            "message": f"Velocity ₹{recent_daily:,.0f}/day exceeds your '{cap.label}' cap of ₹{daily_cap:,.0f}/day (₹{cap.amount:,.0f}/week)."
        })
```
Return `behavioral_cap_violations` in `SafeToSpendResponse`.

- [ ] **Step 3: Enforce BEHAVIORAL_CAP in run_cashflow_stress_test**

In `affordability_service.py`, after the hard-floor violation check inside the day loop, add:
```python
for cap in [c for c in constraints if c.constraint_type == "BEHAVIORAL_CAP" and c.amount > 0]:
    daily_cap = cap.amount / 7.0
    if daily_burn > daily_cap and first_breach_day is None:
        violations.append({
            "constraint_type": "BEHAVIORAL_CAP",
            "label": cap.label,
            "amount": cap.amount,
            "breach_day": i + 1,
            "breach_date": dkey,
            "projected_balance": round(balance, 2),
            "message": f"Daily burn ₹{daily_burn:,.0f} exceeds BEHAVIORAL_CAP '{cap.label}' (₹{cap.amount:,.0f}/week = ₹{daily_cap:,.0f}/day).",
        })
        break  # one violation per cap per stress test run
```

- [ ] **Step 4: Write test for BEHAVIORAL_CAP enforcement**

In `backend/tests/test_affordability.py`, add:
```python
def test_behavioral_cap_violation_in_stress_test(db):
    # Insert a BEHAVIORAL_CAP constraint (₹700/week = ₹100/day)
    # Insert transactions giving daily burn >> ₹100
    # Run affordability; assert constraint_violations contains BEHAVIORAL_CAP entry
```

- [ ] **Step 5: Run pytest and confirm all pass**

```
python -m pytest backend/tests/ -v
```
Expected: all 62+ pass

- [ ] **Step 6: Commit**

```
git add backend/services/profile_service.py backend/services/affordability_service.py backend/schemas/profile.py backend/tests/test_affordability.py
git commit -m "feat: enforce BEHAVIORAL_CAP in safe-to-spend and stress test"
```

---

## Task 2: Monte Carlo / Probabilistic Survival Model

**Files:**
- Modify: `backend/services/affordability_service.py` (`run_cashflow_stress_test`)
- Modify: `backend/schemas/scenario.py` (add `survival_p10`, `survival_p90` optional fields)
- Modify: `backend/tests/test_affordability.py` (add probabilistic test)

**Interfaces:**
- Consumes: existing `daily_burn` from `forecast_service`
- Produces: `AffordabilityResponse` gains `survival_p10: float | None`, `survival_p90: float | None`; `survival_probability` becomes the median (P50)

- [ ] **Step 1: Add numpy import and P10/P90 fields to AffordabilityResponse schema**

In `backend/schemas/scenario.py`:
```python
survival_p10: Optional[float] = None
survival_p90: Optional[float] = None
```

- [ ] **Step 2: Replace single-path survival with bootstrap Monte Carlo**

Replace the day-loop survival calculation in `run_cashflow_stress_test` with:
```python
import numpy as np

N_SIMULATIONS = 300
# Estimate std_dev from historical daily spend variance (use 30% of daily_burn as fallback)
cursor = db.cursor() if hasattr(db, 'cursor') else None
daily_std = daily_burn * 0.30  # conservative estimate; refine if more data available

# Run N_SIMULATIONS paths
rng = np.random.default_rng(seed=42)
daily_samples = rng.normal(loc=daily_burn, scale=max(1.0, daily_std), size=(N_SIMULATIONS, horizon))
daily_samples = np.clip(daily_samples, 0, daily_burn * 3)  # cap outliers

survival_rates = []
for sim_idx in range(N_SIMULATIONS):
    sim_balance = float(available_balance)
    sim_ok = 0
    for i in range(horizon):
        day = today + timedelta(days=i)
        dkey = day.isoformat()
        if day == buy_on:
            sim_balance -= lump
        sim_balance -= float(daily_samples[sim_idx, i])
        if dkey in events_by_day:
            sim_balance += events_by_day[dkey]
        if floor_amt <= 0 or sim_balance >= floor_amt:
            sim_ok += 1
    survival_rates.append(sim_ok / horizon)

survival_array = np.array(survival_rates)
survival = round(float(np.median(survival_array)) * 100.0, 1)
p10 = round(float(np.percentile(survival_array, 10)) * 100.0, 1)
p90 = round(float(np.percentile(survival_array, 90)) * 100.0, 1)
```
Return `survival`, `p10`, `p90`.

- [ ] **Step 3: Pass p10/p90 through to AffordabilityResponse**

In `evaluate_affordability`, extract `p10` and `p90` from stress result and assign to response fields.

- [ ] **Step 4: Add test for probabilistic survival**

```python
def test_monte_carlo_survival_returns_p10_p90(db):
    req = AffordabilityRequest(user_id="default_user", purchase_amount=1000.0, available_balance=100000.0)
    result = evaluate_affordability(req, db)
    assert result.survival_p10 is not None
    assert result.survival_p90 is not None
    assert 0.0 <= result.survival_p10 <= result.survival_p90 <= 100.0
```

- [ ] **Step 5: Run pytest**

```
python -m pytest backend/tests/ -v
```
Expected: all pass

- [ ] **Step 6: Commit**

```
git add backend/services/affordability_service.py backend/schemas/scenario.py backend/tests/test_affordability.py
git commit -m "feat: monte carlo probabilistic survival (P10/P50/P90) in stress test"
```

---

## Task 3: KFS / Fine-Print PDF Auditor (skeleton endpoint)

**Files:**
- Create: `backend/routers/documents.py`
- Modify: `backend/main.py` (register router)
- Modify: `backend/tests/test_documents.py` (new test file)

**Interfaces:**
- Produces: `POST /api/documents/audit-kfs` accepts multipart file upload, returns `trap_score: int (0-100)`, `flags: list[{rule, finding, severity}]`, `effective_apr_note: str | None`, `summary: str`

- [ ] **Step 1: Write test for KFS auditor endpoint**

```python
# backend/tests/test_documents.py
def test_kfs_audit_returns_trap_score(client):
    # Upload a plain-text "loan agreement" with 24% APR mention
    content = b"Effective APR: 24% per annum. Bounce charge: ₹500. Foreclosure lock-in: 12 months."
    response = client.post("/api/documents/audit-kfs",
        files={"file": ("loan.txt", content, "text/plain")},
        data={"user_id": "default_user"})
    assert response.status_code == 200
    data = response.json()
    assert "trap_score" in data
    assert 0 <= data["trap_score"] <= 100
    assert isinstance(data["flags"], list)

def test_kfs_audit_empty_file_returns_400(client):
    response = client.post("/api/documents/audit-kfs",
        files={"file": ("empty.txt", b"", "text/plain")},
        data={"user_id": "default_user"})
    assert response.status_code == 400
```

- [ ] **Step 2: Implement `backend/routers/documents.py`**

Rules-based pattern matching on extracted text:
- APR patterns: search for "flat rate", "reducing balance", "APR", "%"; compare flat vs reducing
- Bounce charge: search for "bounce", "dishonour"; flag if > ₹250
- Foreclosure lock-in: search for "lock-in", "prepayment", "foreclosure fee"
- Processing fee: search for "processing", "GST"; extract % if found
- Room rent sub-limit (health insurance): search for "room rent", "sub-limit"

Score: start at 0, add 15 per flag found, cap at 100.

```python
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
router = APIRouter(prefix="/documents", tags=["Documents"])

@router.post("/audit-kfs")
async def audit_kfs(file: UploadFile = File(...), user_id: str = Form("default_user")):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    # decode and pattern match
    ...
    return {"trap_score": score, "flags": flags, "summary": summary, "effective_apr_note": apr_note}
```

- [ ] **Step 3: Register router in backend/main.py**

```python
from backend.routers import documents
app.include_router(documents.router, prefix="/api")
```

- [ ] **Step 4: Run pytest**

```
python -m pytest backend/tests/test_documents.py -v
```
Expected: 2 tests pass

- [ ] **Step 5: Commit**

```
git add backend/routers/documents.py backend/main.py backend/tests/test_documents.py
git commit -m "feat: KFS fine-print auditor endpoint POST /api/documents/audit-kfs"
```

---

## Task 4: Named Constraint Labels in Chat Affordability Reply + BEHAVIORAL_CAP Chat Enforcement

**Files:**
- Modify: `backend/services/chat_service.py` (affordability_check branch ~L202–265, constraint_write branch ~L142–200)

**Interfaces:**
- Consumes: `aff_result.constraint_violations` (already returned by `evaluate_affordability`)
- Produces: `deterministic_reply` includes named violation labels; `constraint_write` for BEHAVIORAL_CAP checks subsequent spend

- [ ] **Step 1: Add named violation labels to affordability chat reply**

After `deterministic_reply` is built in the `affordability_check` branch (around L258), append:
```python
if aff_result.constraint_violations:
    viol_msgs = [v.get("message", "") for v in aff_result.constraint_violations if v.get("message")]
    if viol_msgs:
        deterministic_reply += "\n\n⚠️ **Constraint Alerts:** " + " | ".join(viol_msgs)
```

- [ ] **Step 2: Check BEHAVIORAL_CAP in affordability_check intent**

Before calling `evaluate_affordability`, load active BEHAVIORAL_CAP constraints and check if purchase exceeds cap:
```python
from backend.services.profile_service import list_user_constraints
active_caps = [c for c in list_user_constraints(user_id, db, active_only=True) if c.constraint_type == "BEHAVIORAL_CAP"]
cap_warnings = []
for cap in active_caps:
    if target_amount and target_amount > cap.amount:
        cap_warnings.append(f"This ₹{target_amount:,.0f} purchase exceeds your '{cap.label}' weekly cap of ₹{cap.amount:,.0f}.")
```
Prepend `cap_warnings` to the reply.

- [ ] **Step 3: Write test for named constraint in chat reply**

In `backend/tests/test_chat_api.py`, add:
```python
def test_chat_affordability_shows_constraint_label(client, db):
    # Seed a HARD_FLOOR constraint
    # Send affordability message
    # Assert reply contains constraint message text
```

- [ ] **Step 4: Run pytest**

```
python -m pytest backend/tests/test_chat_api.py -v
```

- [ ] **Step 5: Commit**

```
git add backend/services/chat_service.py backend/tests/test_chat_api.py
git commit -m "feat: named constraint labels in chat affordability reply + BEHAVIORAL_CAP check"
```

---

## Task 5: Auto-Cancellation Draft for Phantom Drains

**Files:**
- Modify: `backend/services/recurring_service.py` (add `cancellation_draft` field to phantom drain items)
- Modify: `backend/routers/recurring.py` (pass-through — no change needed if field is in service)

**Interfaces:**
- Produces: each recurring item dict gains `cancellation_draft: str | None` — a ready-to-copy plain-text email/message draft

- [ ] **Step 1: Add cancellation_draft to detected recurring items**

In `detect_recurring_from_ledger`, after building each item dict, add:
```python
cancellation_draft = None
if is_phantom:
    cancellation_draft = (
        f"Subject: Cancel / Review Subscription — {merchant}\n\n"
        f"To Whom It May Concern,\n\n"
        f"I would like to cancel or review my subscription with {merchant}. "
        f"I have noticed the charge has {'increased' if price_change else 'been recurring'} "
        f"(latest: ₹{latest_amount:,.2f}{(', up from ₹' + str(txs_sorted[-2]['amount']) + '. Please confirm cancellation and refund if applicable.') if price_change else '.'}) "
        f"Please confirm cancellation and provide confirmation.\n\nThank you."
    )
item["cancellation_draft"] = cancellation_draft
```

- [ ] **Step 2: Confirm the field appears in get_recurring_items response**

`get_recurring_items` returns items from `detect_recurring_from_ledger` directly — verify pass-through works.

- [ ] **Step 3: Run pytest**

```
python -m pytest backend/tests/ -v
```
Expected: all pass

- [ ] **Step 4: Commit**

```
git add backend/services/recurring_service.py
git commit -m "feat: auto-cancellation email draft for phantom drain subscriptions"
```

---

## Task 6: UI Breathability Polish (All 5 Views)

This is the largest task. Polish every view to be less congested:
- More whitespace: `gap-6` → `gap-8`, `p-4` → `p-6`, section spacing `mb-4` → `mb-8`
- Card rhythm: consistent `rounded-2xl` cards with subtle `border border-border/50` and `shadow-sm`
- Typography hierarchy: section titles `text-xs uppercase tracking-widest text-muted-foreground` for labels, `text-2xl font-semibold` for hero numbers
- Remove visual clutter: collapse redundant badge + icon duplications; use one anchor icon per card
- Reduce color noise: max 3 accent colors per view; muted backgrounds for secondary info
- Evidence badges: small `VERIFIED` chip `bg-emerald-500/10 text-emerald-600 text-[10px] font-mono` on autopsy cards
- All new colours: check dark mode — use `/80` or `/60` opacity variants to pass contrast

**Files:**
- Modify: `components/views/overview-view.tsx` (Command Center hero + constraint pills + UPI stitcher)
- Modify: `components/views/simulate-view.tsx` (Decision Simulator result cards, P10/P90 display)
- Modify: `components/views/review-view.tsx` (Attribution cards, evidence badges, late-night panel)
- Modify: `components/views/chat-view.tsx` (message bubbles, constraint sidebar, followup chips)
- Modify: `components/finsight-shell.tsx` (sidebar nav items — breathable spacing)

**Interfaces:**
- Consumes: existing API types; new `survival_p10`, `survival_p90` from Task 2; `behavioral_cap_violations` from Task 1; `cancellation_draft` from Task 5
- Produces: all views render without TypeScript errors

### overview-view.tsx changes
- Hero card: large `text-4xl font-bold` Safe-to-Spend number centred, with `text-sm text-muted-foreground` sub-labels. Remove double-stacked icon rows.
- Constraint pills: horizontal scrollable row, each pill `px-3 py-1.5 rounded-full text-sm`. Spacious `gap-3`.
- UPI stitcher: full-width card with `p-6`, action buttons `mt-4 flex gap-3`.
- Stats grid: `grid-cols-2 md:grid-cols-4 gap-6`. Remove dense inner padding.

### simulate-view.tsx changes
- Result card: show verdict as large `text-3xl font-bold` colour-coded number.
- Add P10/P90 survival band display: `"Survival Range: {p10}% – {p90}%"` in a subtle info chip.
- Timeline chart: increase `min-h-[160px]` → `min-h-[200px]`.
- Constraint violations: each violation gets its own card `p-4 rounded-xl border-destructive/30`.

### review-view.tsx changes
- Attribution cards: `p-6 rounded-2xl`, frequency/ticket split shown as two `text-sm` rows, NOT a cramped table.
- Evidence badge: small `VERIFIED ✓` chip aligned top-right of each card.
- Late-night panel: full-width banner with gradient `bg-gradient-to-r from-orange-500/5 to-red-500/5`.
- Phantom drain: show `cancellation_draft` in a collapsible `<details>` block.

### chat-view.tsx changes
- Message bubbles: `max-w-[75%]`, `p-4 rounded-2xl`, more vertical `gap-4` between messages.
- Constraint sidebar (if present): `p-4 rounded-xl bg-muted/40` with `gap-2` between pills.
- Suggested followups: horizontal scroll `flex gap-2 overflow-x-auto pb-1`.

### finsight-shell.tsx changes
- Nav items: `py-2.5 px-3` → `py-3 px-4`, `gap-2` → `gap-3`.
- Group titles: `text-[10px] uppercase tracking-widest` with `mt-6 mb-2` spacing.
- Bottom safe area: add `pb-6` to sidebar footer.

- [ ] **Step 1: Polish overview-view.tsx**

Apply spacing and typography changes described above. Add `behavioral_cap_violations` warning banner if present.

- [ ] **Step 2: Polish simulate-view.tsx**

Add P10/P90 survival band display. Use new `AffordabilityResponse` fields. Increase card spacing.

- [ ] **Step 3: Polish review-view.tsx**

Add evidence `VERIFIED` badge to attribution cards. Show `cancellation_draft` in collapsible block. Increase card spacing.

- [ ] **Step 4: Polish chat-view.tsx and finsight-shell.tsx**

Apply nav spacing and message bubble changes.

- [ ] **Step 5: TypeScript check**

```
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 6: Commit**

```
git add components/views/overview-view.tsx components/views/simulate-view.tsx components/views/review-view.tsx components/views/chat-view.tsx components/finsight-shell.tsx
git commit -m "ui: breathable spacing, evidence badges, P10/P90 display, phantom drain drafts"
```

---

## Task 7: Full Integration Verification

**Files:** none new — verification only

- [ ] **Step 1: Run full pytest**

```
python -m pytest backend/tests/ -v --tb=short
```
Expected: all tests pass (62+)

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

- [ ] **Step 3: Next.js build**

```
npm run build
```
Expected: clean build

- [ ] **Step 4: Commit (if any minor fixes needed)**

```
git commit -am "fix: integration verification fixes"
```

- [ ] **Step 5: Final commit message**

```
git commit --allow-empty -m "chore: all gap fixes and UI polish complete — 62+ tests green"
```

