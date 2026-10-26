# MASTER ARCHITECTURAL REFACTOR PROMPT: FinSight AI Product Flow Transformation

## 1. Role & Objective
You are a Staff Full-Stack Product Engineer and Systems Architect working inside the `FinSight-main` repository (Next.js App Router frontend in `app/` and `components/`, FastAPI backend in `backend/`).

Our goal is to transform FinSight from a fragmented "12-tab financial dashboard" into an **Unbiased Financial Defense & Pre-Decision Intelligence Co-Pilot** designed to beat commercial apps like Navi/Jupiter. 

CRITICAL RULE: **You MUST strictly preserve the Research Lab flow** (`backend/routers/research.py`, `backend/services/research_service.py`, `components/views/research-view.tsx`, `docs/RESEARCH_LAB.md`, and `backend/tests/test_research_lab.py`) and all existing deterministic verification capabilities (`backend/services/verifier_service.py`). Do NOT break existing pytest suites in `backend/tests/`—update and expand them cleanly.

---

## 2. Core Product Philosophy Shift
Stop treating FinSight as a passive post-mortem expense tracker. Refactor the user journey around **4 Core Product Pillars + The Research Lab**:

1. **Pillar 1: True Safe-to-Spend & Persistent Constraint Memory** (Replaces static budgets/balances)
2. **Pillar 2: Counterfactual Decision Simulator ("Can I Afford This?" + EMI/Loan Stress-Test)**
3. **Pillar 3: Evidence-Verified Behavioral Autopsy (Spending Change Attribution, UPI Context Stitcher, & Phantom Drain/IOU Hunter)**
4. **Pillar 4: Constraint-Aware Verified AI Co-Pilot (`chat_service.py` + `verifier_service.py`)**
5. **Pillar 5: Research Lab (Preserved & Expanded to benchmark the new engines)**

---

## 3. Step-by-Step Backend Refactoring Plan (`backend/`)

### Step 3.1: Persistent Constraint Memory Engine (`backend/services/profile_service.py` & `backend/schemas/profile.py`)
1. Extend the database models in `backend/database.py` and schemas in `backend/schemas/profile.py` to support **Persistent User Constraints** (`UserConstraint` model/JSONB store):
   - Constraint types: `HARD_FLOOR` (minimum emergency balance buffer), `FIXED_OBLIGATION` (rent, hostel/mess fee, family remittance with due date), `BEHAVIORAL_CAP` (e.g., max late-night orders/week), and `PENDING_IOU` (split bills owed to the user).
2. In `backend/services/profile_service.py` and `backend/services/budget_service.py`, implement `calculate_true_safe_to_spend(user_id)`:
   - Formula: `Raw Balance - Unpaid Fixed Obligations - Hard Floor - Predicted Essential Burn Until Next Inflow / Remaining Days in Cycle`.
   - Expose this in `backend/routers/profile.py` and `backend/routers/health.py` as the primary headline metric: `safe_to_spend_today`, `raw_balance`, `locked_by_constraints`, and `runway_days_remaining`.

### Step 3.2: Smart UPI Context Stitcher & IOU Detector (`backend/services/import_service.py` & `backend/routers/transactions.py`)
1. Upgrade `backend/services/import_service.py` to solve the "Blind UPI Transfer" problem:
   - Cluster uncategorized/P2P transfers by `time_of_day_bucket` (Morning Commute, Lunch 12:30-2:30 PM, Late-Night 10:30 PM-2:00 AM), `ticket_size_band`, and `merchant/UPI_handle_frequency`.
   - Create an endpoint `GET /api/transactions/context-prompts` in `backend/routers/transactions.py` that returns 1-tap disambiguation clusters (e.g., *"You paid X 14 times between 1-2 PM averaging ₹110. Categorize all as Daily Lunch?"* or *"Was this ₹2,400 transaction a group split bill?"*).
   - Add a `POST /api/transactions/resolve-cluster` endpoint that batch-updates matching transactions and optionally registers a `PENDING_IOU` constraint if it was a split bill.

### Step 3.3: Upgrade Counterfactual Decision Simulator (`backend/services/affordability_service.py`, `backend/services/forecast_service.py`, `backend/routers/scenarios.py`)
1. Upgrade `backend/services/affordability_service.py` and `backend/schemas/scenario.py` so that when a user simulates a purchase (one-time or EMI) or income shock:
   - Run a **Deterministic Cash-Flow Stress Test** over the next 30–90 days using the user's historical daily spending velocity (`forecast_service.py`), recurring mandates (`recurring_service.py`), and active `UserConstraints`.
   - Return:
     - `survival_probability` (0–100%)
     - `constraint_violations`: Exact list of which personal constraints break and on what date (e.g., *"Breaches ₹3,000 Hard Floor on Day 18 due to upcoming rent"*).
     - `counterfactual_alternatives`: Concrete mathematical alternatives (e.g., *"Delay purchase by 11 days"*, *"Split into 3-month no-cost EMI"*, or *"Cut evening food velocity by ₹55/day for 3 weeks"*).

### Step 3.4: Root-Cause Behavioral Autopsy & Phantom Drain Hunter (`backend/services/review_service.py`, `backend/services/anomaly_service.py`, `backend/services/recurring_service.py`)
1. Upgrade `backend/services/review_service.py` to run a **Spending Change Attribution (Delta Engine)** comparing the current period against the baseline period:
   - Decompose spending increases into **Frequency Drift** (ordering more often) vs. **Ticket-Size Inflation** (buying more expensive items) vs. **Time-of-Day Vulnerability** (e.g., Late-Night 10 PM–2 AM micro-bleeds).
2. Upgrade `backend/services/recurring_service.py` to detect **Phantom Drains & Price Creep**:
   - Flag recurring merchants where the debit amount drifted upward (e.g., subscription price hike) or overlapping recurring charges.
3. **Mandatory Evidence Binding (`backend/services/verifier_service.py`):**
   - Every single insight card returned by `review_service.py`, `anomaly_service.py`, `recommendation_service.py`, and `chat_service.py` MUST include an `evidence_bundle` (`transaction_ids`, `exact_sum`, `baseline_sum`, `delta_pct`, and `verification_status: VERIFIED` validated by `verifier_service.py`).

### Step 3.5: Preserve & Connect the Research Lab (`backend/services/research_service.py` & `backend/routers/research.py`)
1. Keep all existing endpoints and logic in `backend/routers/research.py` and `backend/services/research_service.py` intact.
2. Add a new evaluation benchmark card/metric to the Research Lab that measures:
   - **Claim Verification Faithfulness Rate** (from `verifier_service.py`)
   - **Constraint Satisfaction Accuracy** (from `affordability_service.py`)
   - **UPI Context Clustering Coverage** (% of ambiguous transfers resolved)

---

## 4. Step-by-Step Frontend Refactoring Plan (`components/` & `app/`)

### Step 4.1: Streamline Navigation Shell (`components/finsight-shell.tsx`)
Refactor the sidebar/navigation in `components/finsight-shell.tsx` from 12 scattered tabs into **5 Cohesive Product Modes** (do not delete the underlying view files; compose them cleanly as sub-tabs or unified sections inside the 5 primary views):
1. **`Command Center` (`overview-view.tsx`)**:
   - Top Hero Banner: **True Safe-to-Spend Today (₹/day)** prominently contrasted against Raw Bank Balance, showing `Locked in Constraints` and `Days of Liquidity Runway`.
   - Interactive **Active Constraint Memory Pills** (users can add/toggle rules like *"Keep ₹3,000 floor"* or *"₹5,000 rent on 5th"* right from the header).
   - **1-Tap Smart UPI Context Stitcher Cards** (to resolve uncategorized clusters and split bills in seconds).
2. **`Decision Simulator` (`simulate-view.tsx`)**:
   - Interactive **"Can I Afford This?" Pre-Purchase & EMI Stress-Tester**.
   - Visual **Before vs. After Cash-Flow Runway Timeline** (showing the exact date a purchase causes the balance line to dip below the red Constraint Floor).
   - integrates `forecast-view.tsx` and `goals-view.tsx` as tabs/panels inside the Simulator so users see how a decision impacts their goals and 30-day forecast.
3. **`Behavioral Autopsy` (`review-view.tsx`)**:
   - **"Why Did My Spending Change?" Root-Cause Delta View** (Frequency Drift vs. Ticket Inflation + Late-Night Velocity Firewall).
   - Embeds `anomalies-view.tsx` and `recurring-view.tsx` (rebranded as **Phantom Drain & Price-Creep Hunter**) and `recommendations-view.tsx` as unified diagnostic sections.
   - **Interactive Evidence Verification Badges**: Clicking `[Verified: 8 Txns | ₹1,940]` on any insight opens a drawer/modal displaying the exact cited rows from `transactions-view.tsx`.
4. **`AI CFO Co-Pilot` (`chat-view.tsx`)**:
   - Conversational interface that displays active constraints in a side panel, lets users add constraints via natural language, runs instant affordability checks, and renders **Verified Claim Badges** on every numerical statement.
5. **`Research Lab` (`research-view.tsx`)**:
   - Keep the full Research Lab UI intact and prominent as the academic/benchmarking showcase of the platform.

---

## 5. Execution Rules & Verification Checklist
1. Inspect `CONSTRAINTS.md`, `AGENTS.md`, `docs/ARCHITECTURE.md`, and `docs/RESEARCH_LAB.md` before writing code so you adhere to all project conventions.
2. Maintain full backward compatibility with SQLite/PostgreSQL in `backend/database.py` (ensure `backend/tests/test_postgres_compatibility.py` passes).
3. Update `backend/seed.py` and `public/sample_personal_ledger.csv` if needed so that out-of-the-box demo data immediately showcases:
   - Late-night UPI micro-bleeds
   - Uncategorized P2P recurring lunch/mess transfers
   - A subscription price creep (Phantom Drain)
   - Active user constraints and a pre-configured "Can I Afford This?" stress-test scenario.
4. Run `pytest` across all files in `backend/tests/` (including `test_research_lab.py`, `test_claim_verifier.py`, `test_affordability.py`, and `test_e2e_flow.py`) and run `npm run build` on the Next.js frontend to verify zero TypeScript or runtime errors.
