# FinSight AI — Complete Product Requirements Document

**Evidence-grounded personal finance decision support**

- **Version:** 1.0
- **Status:** Working baseline for team review
- **Date:** 22 October 2026
- **Product type:** Responsive web application + research evaluation module
- **Primary stack:** Next.js, TypeScript, FastAPI, PostgreSQL/Supabase, scikit-learn, Azure OpenAI
- **Working name:** FinSight AI — name not finalized

> Product-facing functionality and research evaluation are deliberately separated.


---

# 1. Executive Summary

FinSight AI is a responsive personal-finance website that helps users understand their spending, make better-informed purchase decisions, and work toward financial goals. It imports transaction histories, organizes spending, builds a transparent profile, provides evidence-grounded recommendations, and lets users inspect the calculations behind the advice.

The product has two clearly separated modes. Personal Finance Mode supports a user’s own CSV-uploaded or manually entered transactions. Research Lab Mode uses the approved synthetic PersonaLedger study dataset to reproduce and inspect the research experiments. Results from the synthetic benchmark must never be presented as if they describe a live user.


> **Product promise**
> Help people understand what changed, what choices they have, and why a recommendation was made—without asking them to trust unsupported AI claims.

The project’s differentiating product experience is the combination of inspectable evidence, pre-purchase affordability checks, protected spending preferences, goal-conflict warnings, and follow-up on whether recommendations worked. AI-generated language is not the source of truth for calculations: the backend computes financial values deterministically and validates any displayed claims.

# 2. Product Vision and Positioning

## 2.1 Vision

Build a personal-finance decision companion that helps users move from “Where did my money go?” to “What are my options, what happens if I choose one, and what evidence supports that conclusion?”

## 2.2 Positioning

FinSight AI is not a payments app, bank, broker, lending platform, or replacement for a qualified financial professional. It is a user-controlled decision-support website that works from uploaded or manually entered financial records.

## 2.3 Value proposition

- Understand spending changes in plain language and trace them to relevant transactions.
- See the evidence and calculations behind every recommendation.
- Test a purchase or savings scenario before acting.
- Protect spending categories the user considers non-negotiable.
- Track whether a suggested action was followed and what happened afterward.
- Explore the research behind AI personalization and evidence-grounded explanations in a separate Research Lab.

# 3. Problem Statement

Many personal-finance tools help users record or categorize transactions, display charts, and set budgets. Those capabilities are useful but do not always answer the practical questions users face: Why did my available money change? Can I make this purchase without disrupting my goal? Which categories are flexible? Why is the AI recommending this action? Did the advice help me?

A conversational AI may sound confident while misreading a transaction, inventing a number, ignoring a user’s protected priority, or repeating a generic recommendation. FinSight AI addresses this by separating financial computation from language generation, making evidence inspectable, adding constraint checks, and tracking outcomes cautiously.

# 4. Goals, Non-Goals, and Success Criteria

## 4.1 Product goals

- Provide a usable end-to-end web experience for importing, reviewing, and understanding transactions.
- Calculate profiles, budgets, goal progress, and scenarios deterministically in the backend.
- Generate helpful recommendations with verifiable evidence and cautious language.
- Allow users to set goals and protect essential spending categories.
- Offer pre-purchase affordability estimates with visible assumptions and missing-data warnings.
- Preserve the research implementation: four configurations, profile perturbation, claim verification, and automated evaluation.
- Make user data private by default and provide deletion/export controls.

## 4.2 Non-goals for the first release

- No direct bank login, UPI integration, Account Aggregator integration, or payment execution.
- No automatic stock selection, trading, loan underwriting, tax filing, or regulated investment advice.
- No claim that an anomaly is confirmed fraud or identity theft.
- No guarantee that a recommendation will cause savings or improve financial well-being.
- No training or fine-tuning of a new LLM as a prerequisite.
- No production-grade compliance certification without a separate security/legal review.
- No attempt to implement every backlog idea in the first version.

## 4.3 Success criteria


|Area|Initial success criterion|
|---|---|

|Import|A valid CSV can be previewed, validated, imported, and mapped to a user without silent row loss.|

|Calculations|Backend calculations match independently tested examples for totals, baseline, percentage changes, and scenarios.|

|Evidence|Every numeric claim displayed as verified references a backend value and passes defined validation rules.|

|User value|A user can answer “what changed?”, inspect a recommendation, and simulate a purchase without leaving the app.|

|Preferences|Protected categories are never proposed as reduction targets unless the user explicitly changes that protection.|

|Research integrity|The Research Lab reports denominators, configurations, dataset version, prompts/model identifiers, and experiment settings.|

|Security|User A cannot access User B’s data; secrets are not exposed in client code, logs, or repository.|

|Reliability|Malformed model output, missing data, and provider failures result in safe fallback messages rather than invented values.|



# 5. Target Users and Personas


|Persona|Needs|Key experience|
|---|---|---|

|Student / early-career user|Understand day-to-day spending, stretch limited income, save for a device or emergency fund.|Upload transactions, see where money went, check affordability, set a modest goal.|

|Salary earner|Balance bills, discretionary spending, savings, subscriptions, and upcoming purchases.|Cash-flow summary, goal projections, protected essentials, evidence-grounded recommendations.|

|Goal-oriented saver|Know whether a goal is feasible under current behavior and which trade-offs are available.|Goal feasibility, what-if comparisons, decision boundary, follow-up.|

|Researcher / mentor|Inspect system behavior, compare configurations, and review experiment validity.|Research Lab with A/B/B-ablation/C comparisons, perturbations, metrics, and limitations.|



The first release is primarily designed for a single individual using a desktop or mobile browser. Household sharing, advisers, and group accountability are later extensions.

# 6. Product Principles

- Evidence before prose: calculate first; explain second.
- User control: recommendations are suggestions, not automatic actions.
- No invented precision: if inputs are missing, show “estimate unavailable” or ask for the missing value.
- Respect constraints: protected categories and goals are explicit rules, not optional prompt guidance.
- Separate facts and inference: label observed numbers, estimates, assumptions, and possible explanations distinctly.
- One source of truth: the backend owns financial math, profiles, access checks, and verification.
- Research honesty: distinguish benchmark reference results from results generated by the current application.

# 7. Scope and Feature Priorities


|Priority|Meaning|Features|
|---|---|---|

|P0 — MVP required|Needed for a credible, usable project demonstration.|CSV/manual transactions; categorization and correction; dashboard; profile; evidence-grounded recommendation; claim verification; goals/protected preferences; affordability simulator; Research Lab; data deletion; tests.|

|P1 — Strong follow-up|Adds important usefulness once the end-to-end flow works.|Natural-language finance intents; “What changed since last visit”; financial decision replay; 21-day micro-experiments; recommendation follow-up/outcome record; export/share evidence card.|

|P2 — Future backlog|Interesting, but not necessary for the first stable release.|Nudge frequency adaptation; 48-hour regret check; family-friendly share mode; financial time capsule; privacy-preserving accountability buddy; recommendation self-challenge; sensitivity map UI; multi-strategy recommendation comparison.|




> **Scope guardrail**
> Do not delay the working core product to build experimental or social features. Deliver a reliable transaction → profile → recommendation → evidence flow first.

# 8. Functional Requirements

## FR-01 — Onboarding and Demo Mode

The app provides a short onboarding flow explaining what data is needed, what the system does, and what it cannot guarantee. Users may explore an explicitly labelled synthetic demo before uploading personal data.

- Users can enter the product using a supported authentication method or a clearly limited local demo mode.
- Demo data is visually labelled as synthetic.
- The user must not confuse research benchmark results with their own financial outcomes.

## FR-02 — Transaction Import and Manual Entry

Users can import a CSV statement or add a transaction manually. The import flow includes file validation, field mapping, preview, validation errors, duplicate detection, and a final confirmation before persistence.

- Required normalized fields: date, description/merchant, amount, direction/type; category can be inferred or selected.
- Support configurable CSV column mappings rather than assuming every bank exports the same schema.
- Use a documented sign convention. Do not combine transfers, card payments, refunds, income, and spending blindly.
- Show imported, accepted, skipped, and rejected row counts with reasons.
- Provide a downloadable sample CSV.
- Manual entry must allow editing/deleting the record afterward.

## FR-03 — Transaction Categorization

The system maps transactions to a stable spending taxonomy. The research configuration uses the 17 categories described in the source project documentation; the personal-finance product may include an “Uncategorized” state so the user can correct low-confidence predictions.

- Use the Random Forest + TF-IDF categorizer only when a valid trained artifact and matching preprocessing configuration are present.
- If confidence is weak or the category is unsupported, ask the user to select a category rather than guessing.
- Users can override categories; corrections should be retained for their own records.
- Do not claim research classifier metrics automatically transfer to user-uploaded bank statements.

## FR-04 — Dashboard and “What Changed?”

The dashboard summarizes the selected period and highlights only changes that matter: spending changes, goal progress, upcoming user-entered obligations, unresolved imports, and recommendation changes.

- Period selector: current month, previous month, and custom range.
- Totals distinguish spending, income, transfers, and payments where data allows.
- Show category totals and comparisons with a consistent period-normalization rule.
- “Since last visit” should compare persisted snapshots and show only material deltas; if there is no earlier snapshot, show a first-visit state.

## FR-05 — Personal Spending Profile

For each category, display historical baseline, recent spending pace, change relative to baseline, and recurring-pattern indicators where supported.

- Show the dates used to calculate each profile.
- Allow the user to inspect the underlying transactions.
- Handle zero or near-zero baselines without division-by-zero or misleading percentages.
- Clearly label estimated or incomplete recurring patterns.

## FR-06 — Recommendations

The product-facing default is the structured evidence-grounded recommendation (System C). The research area can invoke all four configurations: System A (rule-based), System B (personalized AI), B-ablation (unstructured explanation), and System C (structured, evidence-grounded explanation).

- Recommendations should be actionable, limited in number, and phrased as suggestions.
- A recommendation includes target category, action, reason, relevant evidence, assumptions/limitations, and expected impact only where the backend has calculated a defensible estimate.
- No recommendation should imply guaranteed savings or make investment/credit decisions.
- If evidence is insufficient, the system must say so rather than forcing a recommendation.

## FR-07 — Grounded Evidence Cards and Claim Verification

Each recommendation includes a “View evidence” control. The evidence view presents the baseline, recent value, period lengths, change calculation, and the transactions or aggregate records supporting the recommendation.

- All displayed numeric claims must be derived from backend-generated evidence values.
- The verifier checks category, period, source evidence identifiers, and numeric values using tolerances appropriate to rounding.
- If verification fails, the app must suppress the unsupported claim, regenerate with a bounded retry policy, or show a safe fallback.
- A “verified” badge means the displayed claim matched the specified data/calculation; it does not mean the advice is guaranteed to be beneficial.

## FR-08 — “Can I Afford This?” Simulator

Users enter a proposed purchase amount and optional purchase date. The simulator estimates the effect on available funds, near-term bills, a user-entered buffer, and savings goals. The UI must explain which inputs are known and which are missing.

- The user must provide or confirm an available balance; imported transaction history alone is not guaranteed to reveal actual current bank balance.
- Subtract known upcoming obligations, user-selected minimum buffer, and reserved goal contributions to estimate safely available funds.
- Show the post-purchase estimate and the impact on one or more goals where sufficient data exists.
- If the information is incomplete, return a qualified estimate and list missing inputs.
- Do not present the result as a credit decision or a guarantee of affordability.

## FR-09 — Goals, Protected Categories, and Conflict Detection

Users can create a savings goal with a target amount and date, and mark categories or specific obligations as protected. The engine checks whether the requested target is feasible given the available data and current constraints.

- A protected category is excluded from discretionary-reduction recommendations by deterministic backend logic.
- If a goal conflicts with protected categories or current available surplus, explain the shortfall and show feasible alternatives.
- The system cannot silently override a protected preference. The user must explicitly edit or remove the constraint.
- Goal calculations must state assumptions and use backend arithmetic.

## FR-10 — Natural-Language Finance Interface (P1)

A limited natural-language interface makes the product more convenient without allowing a general LLM to perform unrestricted actions. It translates user requests into structured intents and routes them to known backend functions.


|Example request|Structured intent|Expected handling|
|---|---|---|

|“How much did I spend on food last month?”|query_spending; category=Dining/Food mapping; period=previous month|Run a read-only backend query and explain the result.|

|“I spent ₹450 on Swiggy yesterday.”|add_transaction; amount=450; merchant=Swiggy; date=resolved date; direction=expense|Show a confirmation preview before creating the transaction.|

|“Save ₹1 lakh in 8 months, but protect food.”|create_goal; amount=100000; deadline=8 months; protected_category=Food|Preview and confirm goal and constraint.|

|“What if I reduce shopping by 20%?”|simulate_scenario; category=Retail; delta=-20%|Run a deterministic scenario calculation and return assumptions/results.|



Unsupported or ambiguous requests must trigger a clarification or safe refusal. Any write operation—including adding/editing a transaction, creating a goal, or changing a protected preference—requires user confirmation.

## FR-11 — Financial Decision Replay (P1)

The user can ask “Why did my savings change?” and see an evidence-led breakdown of contributing category changes and relevant transactions. The feature must describe correlations/contributions rather than claim causation unless the evidence genuinely supports it.

## FR-12 — 21-Day Micro-Experiments and Outcome Tracking (P1)

A user may opt into a time-limited experiment such as “try no more than two food-delivery orders each week for 21 days.” The app tracks the user-defined target and later summarizes observed spending/behavior. Experiments are opt-in and easy to stop.

- Show baseline, target, experiment period and measurement method at setup.
- Track outcomes without claiming the intervention caused the result.
- Do not send notifications by default; notification frequency is user-controlled.
- The system should distinguish not attempted, incomplete, completed, and not measurable outcomes.

## FR-13 — Research Lab

The Research Lab is for the project team/mentors, not part of the default everyday-user workflow. It loads the approved synthetic research dataset, runs or reads experiment outputs, compares the four configurations, and displays evaluation metrics with numerator, denominator, model/prompt/dataset metadata, and relevant limitations.

- Support dataset import/validation and show row/user counts generated by the current import, not hard-coded assumptions.
- Support user/profile selection and history/holdout visualization.
- Support side-by-side A, B, B-ablation, and C results from the same eligible profile.
- Support the controlled perturbation experiment: neutralize the original highest-deviation category, force another category to +150% deviation, and record the resulting recommendation.
- Show current run results separately from reference results reported in the supplied paper.
- Do not expose synthetic benchmark outcomes as a real user's financial data.

## FR-14 — Candidate Anomaly Review

Anomaly signals are optional and explicitly exploratory. The source project describes heuristic small-amount/card-testing-like patterns and per-user statistical outliers, but the selected dataset lacks ground-truth fraud labels for the studied subset.

- Label results “candidate anomaly” or “unusual transaction,” never “confirmed fraud.”
- Show the reason and source transaction(s).
- Let the user mark “expected,” “incorrect,” or “needs review.”
- Never block payments, accuse a user, or trigger an external financial action.

## FR-15 — Export, Preferences, and Data Control

- Allow users to export their transaction data in a documented CSV format.
- Allow deletion of individual transactions, imports, goals, and the account/data subject to documented retention constraints.
- Allow users to edit categories, protected preferences, goals and notification settings.
- Offer an exportable evidence summary for a recommendation; redact account identifiers and include the date range and assumptions.

# 9. Primary User Journeys

## 9.1 First-time user


```text
Open website → choose demo or sign in → read privacy/data note → upload CSV or add sample transactions → preview/mapping → confirm import → review dashboard → inspect profile → view recommendation and evidence.
```

## 9.2 Check a purchase


```text
Open “Can I Afford This?” → enter purchase amount/date → confirm balance, obligations and buffer → calculate projected remainder → view goal impact/assumptions → save scenario or discard.
```

## 9.3 Understand a recommendation


```text
Open recommendation → read action and reason → open “View evidence” → inspect baseline/recent amount and source transactions → see verification status → accept, dismiss, or mark not relevant.
```

## 9.4 Set a goal with a protected category


```text
Create savings goal → enter amount and target date → protect categories → run feasibility check → view required monthly saving and any shortfall → confirm goal or revise constraints.
```

## 9.5 Research demonstration


```text
Open Research Lab → select the approved dataset/run → inspect split → run A/B/B-ablation/C → run perturbation → review recommendation distribution, responsiveness, validation proxy and evidence verification.
```

# 10. Information Architecture and UI (4 Core Pillars + Research Lab)

FinSight AI transforms fragmented multi-tab financial dashboards into **4 Core Closed-Loop Product Pillars + The Academic Research Lab**, eliminating the "12-tab feature soup" problem while preserving full depth through contextual sub-tab navigation:

| Pillar / Core View | Sub-Tabs & Integrated Modules | Primary Product Defense Capability |
|---|---|---|
| **Pillar 1: Command Center (`overview-view.tsx`)** | `Command Center`, `Ledger Transactions`, `Smart Budgets`, `Profile Invariants` | Computes **True Safe-to-Spend Today (₹/day)** vs. raw bank balance; manages active **Constraint Memory** (`HARD_FLOOR`, `FIXED_OBLIGATION`, `BEHAVIORAL_CAP`, `PENDING_IOU`); triggers **Smart UPI Context Stitcher** for 1-tap disambiguation. |
| **Pillar 2: Decision Simulator (`simulate-view.tsx`)** | `Decision Sandbox`, `30-Day Forecast`, `Savings Goals` | **"Can I Afford This?" Pre-Purchase & EMI Cash-Flow Stress-Tester**; deterministically calculates survival probability (0–100%), pinpoints constraint breaches, visualizes Before vs. After runway bars, and generates mathematical counterfactual alternatives. |
| **Pillar 3: Behavioral Autopsy (`review-view.tsx`)** | `Root-Cause Autopsy`, `Phantom Drains`, `Candidate Anomalies`, `Verified Insights` | **"Why Am I Broke?" Spending Change Attribution Delta Engine** (Frequency Drift vs. Ticket-Size Inflation); **Late-Night Velocity Firewall** (10:30 PM–2:00 AM micro-bleeds); **Phantom Drain & Price Creep Hunter**; mandatory **Evidence Verification Badges** linking to cited transaction receipts. |
| **Pillar 4: AI CFO Co-Pilot (`chat-view.tsx`)** | `Conversational Assistant`, `Live Constraint Memory Panel` | Conversational financial copilot that reads and writes persistent constraints, operates directly on verified database records, and cites verifiable transaction receipts with automated claim verification. |
| **Pillar 5: Synthetic Research Laboratory (`research-view.tsx`)** | `Benchmark Evaluation`, `Temporal Split`, `Perturbation Runner`, `Defense Engine Metrics` | **Preserved academic evaluation lab**: PersonaLedger 1,000-row benchmark across 10 profiles (seed `42`), 70/30 temporal holdouts, +150% perturbation studies, and live Defense Engine benchmarking (Claim Faithfulness, Constraint Satisfaction, UPI Clustering). |

## 10.1 Design direction

- Calm, trustworthy finance interface: warm neutral backgrounds, deep navy text, restrained teal/cyan accents, high-contrast charts, and clear spacing.
- Desktop-first information density with responsive mobile behavior; no horizontal overflow in tables on small screens.
- Use an evidence card pattern with “Recommendation,” “Why,” “Evidence,” “Assumptions,” “Verification,” and “What could change this advice?” sections.
- Avoid aggressive gamification, shame-based copy, fake confidence percentages, or red warning colors for ordinary spending changes.
- All charts need labels, keyboard-accessible controls, text equivalents, and readable color contrast.
- Provide loading, empty, stale, partial-data, verification-failed, and provider-unavailable states.

# 11. Technical Architecture


```text
Browser (Next.js)
  → FastAPI REST API (authentication/authorization)
      → Import and normalization service
      → Categorization service (scikit-learn, when applicable)
      → Deterministic profile/calculation engine
      → Recommendation orchestrator (A, B, B-ablation, C)
      → Evidence and claim verifier
      → Scenario/goal engine
      → Research evaluation service
      → PostgreSQL (managed through Supabase)
      → Azure OpenAI Responses API (server-side only)
```

The backend is the source of truth for financial calculations, access control, evidence references and evaluation metrics. The frontend may render outputs and request scenarios, but it must not be trusted to calculate authoritative totals or bypass validation. The LLM adapter must be swappable so model/deployment changes do not require rewriting business logic.

## 11.1 Recommended technology stack


|Layer|Choice|Reason / implementation boundary|
|---|---|---|

|Primary coding agent|Cursor|Use for repository-level implementation, multi-file changes, debugging, terminal execution and test-driven fixes.|


|Frontend|Next.js App Router + TypeScript|Product website, routing, forms, protected pages and interactive views.|

|UI system|Tailwind CSS + shadcn/ui|Consistent reusable components and responsive styling.|

|Data fetching/validation|TanStack Query; React Hook Form; Zod|Server-state caching, form handling and runtime validation at the client boundary.|

|Charts|Recharts|Accessible-enough interactive financial trends; add text tables for key values.|

|Backend|Python 3.12+ + FastAPI + Pydantic|API validation, deterministic calculations, model orchestration and research logic.|

|ORM/migrations|SQLAlchemy 2 + Alembic|Typed database access and versioned schema changes.|

|Data science|pandas + NumPy + scikit-learn|Dataset processing, profile features and existing categorization experiment.|

|Database/Auth|Supabase PostgreSQL + Supabase Auth|Managed Postgres and sign-in; server validates user tokens and enforces ownership.|

|LLM|Azure OpenAI Responses API, deployment configured by environment|Generate recommendation/explanation language and structured intent. Confirm the selected deployment supports required API/features.|

|Testing|pytest + FastAPI TestClient + Playwright|Unit, API, regression, security-boundary and end-to-end testing.|

|CI/version control|GitHub + GitHub Actions|Pull-request checks, test runs and controlled releases.|

|Deployment|Vercel frontend; Azure Container Apps or another Python-compatible host for FastAPI; Supabase Postgres|Keep frontend and Python deployment choices suited to each workload.|



## 11.2 AI development workflow

- Implement the frontend component system from this PRD with production-quality, responsive components.
- Connect the frontend to the repository, implement the FastAPI API, and connect real endpoints.
- Implement one feature at a time, including tests and a concise summary of changed files.
- Require review of database schema, authentication, financial formulas, prompts, and LLM verification code.
- Never paste API keys, raw user bank statements, or unredacted sensitive data into third-party prompts.

# 12. Backend Calculation and Recommendation Rules

## 12.1 Transaction semantics

Normalize imported records into explicit types such as spending, income, transfer, refund, payment/credit and unknown. Raw signed amounts alone are insufficient to safely infer every transaction meaning; use statement metadata and allow correction. Research-mode processing must preserve the paper’s sign convention: positive values represent spending and negative values represent payments/credits in the studied dataset.

## 12.2 Profile calculations

Product-mode comparisons must normalize periods so unequal window lengths are not compared as if they were equal. Let baseline spending total be B over D_b days, and recent spending total be R over D_r days. Use baseline daily pace = B / D_b, recent daily pace = R / D_r, and a period-normalized baseline for the recent window = (B / D_b) × D_r. Percentage deviation = ((R − normalized baseline) / normalized baseline) × 100 only when the baseline exceeds a configured positive minimum. Otherwise label the category as new/low-baseline and do not show a misleading percentage.

For strict research reproduction, retain the exact formulas and window definitions used by the supplied study code/paper. Product-mode calculation enhancements must not silently alter research-mode metrics.

## 12.3 System A — Rule baseline

Research-mode rule: a category is eligible when recent spending pace exceeds 1.25 times its personal baseline, excluding “Other” and “Payment”, consistent with the supplied project documentation. If no category qualifies, return “No category crossed the threshold.” If multiple categories qualify, use a documented deterministic tie-break.

## 12.4 System B — Personalized AI

Build a compact structured user profile in backend code and send only task-relevant fields to the configured LLM. Require an allowed category and machine-readable output. The model may choose and phrase a recommendation; it must not calculate source financial facts from raw transactions.

## 12.5 B-ablation — Unstructured explanation

Research-only condition that uses the same personalized profile/setup as System B but requests free-text explanation without the mandatory evidence-field structure. Preserve this condition because it is needed to compare unstructured explanation with structured grounding.

## 12.6 System C — Structured evidence-grounded explanation

Require structured fields: recommendation, reason, evidence references, expected impact (only if deterministically calculated), and limitations/assumptions. Numerical values must be injected from backend-calculated evidence. If a number cannot be verified, do not display it as a fact.

## 12.7 Recommendation decision boundary

For rule-based recommendations, calculate the point at which the rule would stop firing. For LLM-selected recommendations, do not claim a precise universal decision boundary unless it has been tested by controlled simulation. The interface should say “under the current rule/assumptions” when displaying a threshold.

## 12.8 Affordability and goal feasibility

Calculate affordability from confirmed available balance, known near-term obligations, user-defined emergency buffer, and reserved goal contributions. If a balance or obligation is absent, request it or mark the estimate incomplete. Goal projections are scenarios, not guarantees; state the assumed contribution schedule and do not imply future income is certain.

# 13. NLP / Structured Intent Contract

The optional assistant must convert supported language into structured intents and call existing backend operations. It must not have unrestricted SQL access or directly execute financial actions.


|Intent|Required fields|Action safety|
|---|---|---|

|query_spending|metric, category, date range|Read-only; answer from backend query.|

|compare_periods|metric, category, period A, period B|Read-only; use normalized periods.|

|add_transaction|date, merchant/description, amount, direction, category optional|Always show confirmation before saving.|

|create_goal|target amount, target date, contribution assumptions optional|Preview and confirm before saving.|

|protect_category / unprotect_category|category, desired state|Explicit confirmation; log user change.|

|simulate_purchase|amount, date, available-balance source, obligations/buffer inputs|Calculate only; never execute a purchase.|

|simulate_scenario|scenario type, variables, assumptions|Return outputs and assumptions, not unsupported prediction.|

|explain_recommendation|recommendation ID|Use stored evidence and verification output.|

|what_changed|previous/current snapshot references|Show only validated differences.|




```text
Example schema shape:
{
  "intent": "simulate_purchase",
  "amount": 15000,
  "currency": "INR",
  "purchase_date": "YYYY-MM-DD",
  "missing_inputs": ["available_balance"],
  "requires_confirmation": false
}
```

Use strict schema validation with Pydantic on the API side and a supported structured-output mode for the LLM. Reject unknown categories and invalid amounts. Resolve relative dates using the user’s timezone. If intent classification is uncertain, ask the user instead of executing an action.

# 14. Suggested Database Model


|Table|Key fields|Purpose|
|---|---|---|

|users / auth identity|id, created_at, preferences, locale, timezone|User identity and settings; authentication provider remains authoritative for login.|

|imports|id, user_id, file_name, created_at, row_count, status, validation_summary|Import history and validation report; avoid storing uploaded raw file unless necessary.|

|transactions|id, user_id, transaction_date, description, amount, direction, category, category_source, import_id|Normalized transactions, indexed by user/date.|

|category_mappings|raw_label, normalized_category, mapping_version|Version-controlled raw-to-17-category mapping for research mode.|

|profile_snapshots|id, user_id, period_start/end, features_json, calculation_version, created_at|Historical, reproducible profile snapshots.|

|goals|id, user_id, target_amount, target_date, current_progress, assumptions_json, status|Savings goal definition and progress.|

|user_constraints|id, user_id, constraint_type, name, amount, frequency, due_date, active, metadata_json|Persistent user constraints (HARD_FLOOR, FIXED_OBLIGATION, BEHAVIORAL_CAP, PENDING_IOU).|

|category_preferences|id, user_id, category, is_protected, reason, updated_at|Protected spending constraints.|

|recommendations|id, user_id, profile_snapshot_id, configuration, category, output_json, prompt_version, model_id, created_at|Recommendation output plus provenance.|

|evidence_items|id, recommendation_id, evidence_type, source_ids, numeric_values_json, verifier_status|Traceability of source values and numeric checks.|

|scenarios|id, user_id, scenario_type, input_json, output_json, assumptions_json, created_at|What-if / affordability scenarios.|

|user_experiments|id, user_id, type, baseline_json, target_json, start/end, status, outcome_json|Opt-in micro-experiments and outcome summaries.|

|research_runs|id, dataset_version, split_config, model_id, prompt_version, seed, started_at, completed_at|Reproducibility metadata.|

|research_results|id, run_id, user_key, configuration, recommendation, metrics_json|Research recommendations and per-user evaluation outputs.|

|audit_events|id, user_id, event_type, object_id, timestamp, metadata_redacted|Security-relevant and recommendation-history events.|



Use migrations, foreign keys, appropriate indexes, parameterized queries and per-user access controls. Never expose a Supabase service-role key to the browser. If any table is accessible through a browser-facing schema, configure and test Row Level Security for all relevant operations.

# 15. API Specification


|Method + route|Purpose|Acceptance behavior|
|---|---|---|

|GET /health|Service health|Returns status without disclosing secrets or environment details.|

|POST /imports/preview|Parse/validate CSV|Returns mapped columns, row counts, errors and warnings without persisting transactions.|

|POST /imports/confirm|Persist confirmed import|Requires authenticated user and validated preview token/import state.|

|GET /transactions|List/search/filter transactions|Only returns rows belonging to the authenticated user.|

|POST /transactions|Create transaction|Validates fields and requires user confirmation in the frontend flow.|

|PATCH /transactions/{id}|Edit transaction/category|Checks ownership; logs category override.|

|DELETE /transactions/{id}|Delete transaction|Checks ownership and invalidates dependent profile snapshots as needed.|

|GET /profile/safe-to-spend|True Safe-to-Spend Today|Computes safe daily spend, raw balance, locked constraints, and cycle runway days.|

|GET /profile/constraints|List constraints|Returns active HARD_FLOOR, FIXED_OBLIGATION, BEHAVIORAL_CAP, PENDING_IOU constraints.|

|POST /profile/constraints|Create constraint|Creates or persists new user constraint rule.|

|DELETE /profile/constraints/{id}|Delete constraint|Deactivates or removes a user constraint.|

|GET /transactions/context-prompts|Smart UPI Context Prompts|Returns 1-tap disambiguation clusters for uncategorized/P2P transfers.|

|POST /transactions/resolve-cluster|Resolve transaction cluster|Batch updates categories and optionally creates a PENDING_IOU constraint.|

|GET /research/defense-metrics|Defense Engine Benchmarks|Returns live Claim Verification Faithfulness, Constraint Accuracy, and UPI Coverage.|

|GET /profile|Get current profile|Returns feature values, date windows, formula version and missing-data notes.|

|POST /recommendations/generate|Generate recommendation(s)|Supports default System C; research mode can request A/B/B-ablation/C.|

|GET /recommendations/{id}/evidence|Inspect evidence|Returns backend-calculated values and verification status.|

|POST /scenarios/affordability|Evaluate purchase|Returns remaining estimate, goal impact if computable, assumptions and missing inputs.|

|POST /goals|Create goal|Validates target/date and evaluates conflicts with current constraints.|

|PATCH /preferences/categories/{category}|Change protected state|Explicit user action; invalidates/recomputes affected recommendation state.|

|POST /assistant/intent|Parse supported natural-language request|Returns validated intent; writes require a later confirm endpoint.|

|POST /research/perturbation|Run research perturbation|Returns original/forced category, outputs and tracking metrics.|

|POST /research/evaluate|Evaluate a run|Returns metrics with numerators/denominators and configuration metadata.|

|GET /research/runs/{id}|Read run summary|Shows only requested research run and provenance.|

|GET /recommendations/changes|Compare snapshots|Returns material recommendation/profile changes since last acknowledged view.|



# 16. Non-Functional Requirements


|Quality|Requirement|
|---|---|

|Correctness|Financial totals and percentages are calculated by tested backend functions with clear transaction-type handling.|

|Security|User-owned records are isolated; credentials and model keys are server-side; all sensitive routes enforce authentication/authorization.|

|Privacy|Transmit minimum necessary profile/evidence to the LLM; avoid raw transaction disclosure unless explicitly needed and consented.|

|Reproducibility|Record dataset version, split settings, category-map version, model/deployment ID, prompt version, seed, and run times.|

|Availability|External LLM failure must not break non-AI views, transaction CRUD, profile calculations, or scenarios.|

|Performance|Paginate transaction lists; keep calculations server-side; use bounded timeouts and rate limits for model calls.|

|Accessibility|Keyboard-operable controls, descriptive labels, contrast compliance, focus states and text equivalents for charts.|

|Maintainability|Separate services by responsibility; type schemas; run tests and format/lint checks in CI.|

|Transparency|Show data range, assumptions, limitations and whether the result is a computation, estimate, or AI-written explanation.|



# 17. Security, Privacy, and Responsible Use

- Authentication: Supabase Auth or equivalent; FastAPI validates the incoming user token and authorizes every data access by user ID.
- Database: enable and test Row Level Security where relevant; keep privileged service keys exclusively server-side.
- Secrets: store Azure credentials and database URLs in environment variables/secret manager; never commit .env files.
- Uploads: enforce file-size/type limits, parse safely, validate rows, neutralize spreadsheet formula injection on exports, and avoid retaining raw files unnecessarily.
- LLM privacy: send only the aggregate profile/evidence needed for the current recommendation. Do not send full merchant-level transaction histories by default.
- Logging: avoid logging full transactions, credentials, prompts containing unnecessary sensitive values, or raw model secrets. Log correlation IDs and redacted metadata.
- Data control: support data export and deletion; document any retained research artifacts separately.
- Responsible wording: no shame, no guaranteed outcomes, no confirmed-fraud labels, no autonomous payment or investment decisions.
- Product notice: “This prototype provides decision-support suggestions from imported or synthetic transaction data. It is not professional financial advice and does not guarantee savings or confirm fraud.”

# 18. Product Analytics and Evaluation Metrics

## 18.1 Product metrics


|Metric|Definition|
|---|---|

|Import completion|Share of started import flows that end with a successfully confirmed import.|

|Categorization correction rate|Share of categorized transactions whose category the user changes; treat as a diagnostic, not automatically a failure.|

|Evidence expansion rate|How often users open the evidence view after reading a recommendation.|

|Scenario completion|Share of started affordability scenarios that reach a result.|

|Goal setup completion|Share of started goal flows completed.|

|Recommendation action rate|User explicitly accepted/dismissed/deferred a recommendation; do not infer that opening equals acceptance.|

|Experiment completion|Share of opt-in micro-experiments reaching their end date with measurable data.|

|Verification failure rate|Share of generated claims that fail automated validation before display.|



## 18.2 Research metrics

The Research Lab should retain the source paper’s metrics where implemented and distinguish them from product analytics. Examples include categorization accuracy/precision/recall/F1, category distribution, category agreement, held-out behavioral alignment proxy, forced-signal tracking, disconnected default/category share, numerical evidence consistency, and confidence intervals. Do not call held-out behavioral alignment proof of financial benefit.


|Reference result from supplied paper|Value documented|Display rule|
|---|---|---|

|Dataset sample|300 users; 49,782 transactions; 91 days per user|Show as paper reference and label dataset version; current imports must report their own counts.|

|Random Forest categorization|79.3% accuracy; 84.8% weighted precision; 79.3% weighted recall; 79.9% weighted F1|Do not claim this is newly reproduced until the current implementation runs.|

|Held-out validation|A 75.9% (214/282 eligible); B 74.0% (222/300); C 75.3% (226/300); unstructured ablation 73.3% (220/300)|Clearly label as paper-reported reference results.|

|Perturbation tracking|B 56.3% (169/300); C 66.3% (199/300), comparison reported p=0.012|Show metric definition and denominator.|

|Retail selection|B 46.7% (140/300); C 36.0% (108/300); disconnected Retail default 21% vs 12%|Clarify these are the study’s recommendation-distribution outcomes.|

|Numerical evidence|300/300 after correction of a formatting-related false positive|State that this means numeric verifiability under the implemented checker, not recommendation correctness.|



# 19. Research Lab Specification

The Research Lab reproduces the experimentation described in the project paper. It must not be confused with the consumer interface. Its purpose is transparency and reproducibility.

- Dataset audit: version, subset, row count, user count, date range, positive/negative event count, duplicates, missing values, category coverage and mapping version.
- Temporal split viewer: show historical/profile period and final 30-day holdout for each selected user.
- Four-way comparison: A rule-based; B personalized LLM; B-ablation unstructured explanation; C structured evidence-grounded explanation.
- Perturbation runner: neutralize the original highest-deviation category; choose a different target category using a documented seed; set it to +150% deviation; rerun B/C and measure forced-signal tracking and default-category behavior.
- Evidence verifier report: list total claims, verified claims, unsupported claims, errors and corrected false-positive cases where relevant.
- Metric export: CSV/JSON with numerator, denominator, metric definition and run metadata.
- Caution labels: synthetic data, selected sample, one model/run limitations, behavioral proxy limitation, and no human evaluation.

# 20. Acceptance Criteria and Definition of Done


|ID|Acceptance criterion|
|---|---|

|AC-01|A valid CSV is previewed before persistence; invalid records have actionable explanations.|

|AC-02|Import summary reconciles source rows into accepted/rejected/duplicate counts.|

|AC-03|Income, spending, transfers, refunds and payments are distinguished under a documented convention.|

|AC-04|Profile calculations show time boundaries and pass unit tests for zero baselines and unequal windows.|

|AC-05|A recommendation exposes its supporting evidence and calculation window.|

|AC-06|An unsupported numeric model claim is not shown as verified; the failure is logged with redacted data.|

|AC-07|Protected categories are not selected as targets without an explicit user change.|

|AC-08|Affordability estimate lists assumptions and refuses to imply certainty when balance/bill data is missing.|

|AC-09|A user can create a goal, see feasibility/shortfall, and inspect assumptions.|

|AC-10|Research Lab can run or display all four configurations and the controlled perturbation outcome.|

|AC-11|Paper reference results are visually distinguished from newly generated results.|

|AC-12|Automated tests verify temporal leakage is absent: changing held-out transactions does not affect a recommendation generated from an unchanged historical profile.|

|AC-13|User A cannot read, edit, or delete User B’s records through the API or direct exposed database paths.|

|AC-14|The main flows work on desktop and mobile widths with keyboard-accessible controls.|

|AC-15|The deployed application has no hard-coded secrets, no default shared credentials, and has a clear research/financial disclaimer.|



# 21. Testing Strategy

## 21.1 Unit tests

- CSV parser, column mapping, date parsing and invalid amount handling.
- Category mapper coverage, unknown-label fallback and user override.
- Sign-convention handling, refunds, transfers, payments and duplicate detection.
- Baseline/recent pace calculations, zero-baseline handling and period normalization.
- 25% System A threshold and deterministic tie-breaks.
- Goal feasibility, protected preferences and purchase simulator calculations.
- Evidence validation with currency separators, rounding and missing values.

## 21.2 Integration tests

- Authenticated CSV import and transaction CRUD.
- Recommendation generation for all four configurations using mocked LLM responses.
- Malformed/schema-invalid LLM response handling and bounded retry/fallback.
- Evidence verifier detection of incorrect figures and unsupported categories.
- Research perturbation determinism under a fixed seed.
- Data isolation between users and deletion cascades/retention semantics.

## 21.3 End-to-end tests

- Onboard/demo → import CSV → inspect dashboard → view recommendation evidence.
- Create protected category and verify recommendation guardrail.
- Run affordability simulation with complete and incomplete inputs.
- Run Research Lab comparison and export metrics.
- Use narrow viewport and keyboard-only navigation for main user flows.

# 22. Development Plan


|Phase|Work|Exit criteria|
|---|---|---|

|0. Foundation|Create GitHub repo, environments, lint/test setup, frontend shell, FastAPI health endpoint, DB migration.|App boots locally; CI runs.|

|1. Data ingestion|CSV preview/import, manual transactions, validation summaries, category correction.|Import acceptance criteria pass.|

|2. Financial engine|Period normalization, spending profile, goals, protected categories, deterministic scenarios.|Calculation tests pass.|

|3. Recommendation engine|A, B, B-ablation, C configuration orchestration; LLM schema validation; evidence service.|End-to-end recommendation with safe fallback.|

|4. User product views|Dashboard, transactions, profile, recommendations/evidence, affordability and goal pages.|Main demo flow works with real APIs.|

|5. Research Lab|Dataset audit, temporal split, experiment runner, perturbation, evaluation metrics.|Can rerun a documented experiment and export results.|

|6. P1 experiences|Natural-language intents, what changed, decision replay, micro-experiment follow-up.|Optional P1 acceptance checks pass.|

|7. Hardening and demo|Security review, accessibility checks, tests, deployment, README, seed/demo dataset and recording.|Definition of Done met; secrets/data protections checked.|



Recommended order: finish one vertical slice—import → profile → one recommendation → evidence verification—before building many isolated screens. Keep each phase in Git commits and review the AI-generated diff before merging.

# 23. Risks and Mitigations


|Risk|Impact|Mitigation|
|---|---|---|

|Synthetic data differs from real users|Product behavior may not generalize.|Keep research mode and personal mode separate; show synthetic-data limitations.|

|LLM invents or misstates figures|User receives misleading advice.|Backend-computed evidence, strict schemas, claim validation, bounded retries and safe fallback.|

|CSV formats vary|Import failures or wrong categorization.|Column mapping, preview, explicit sign/type normalization and correction UI.|

|Balance or bill information missing|Affordability estimates may be unreliable.|Request confirmed inputs; surface assumptions and missing-data warnings.|

|Profile changes produce unstable outputs|User loses trust.|Version prompts/configuration, deterministic seed for perturbation, run tests and show relevant uncertainty.|

|Feature bloat|Core workflow remains unfinished.|Gate features with P0/P1/P2; defer social/notification extras.|

|Cross-user data exposure|Severe privacy failure.|Server-side ownership checks, RLS/least privilege, automated isolation tests and secret management.|

|False-positive anomaly flags|Users may be alarmed.|Label as candidate anomalies, explain reasons, never state confirmed fraud.|

|Reference results presented as new results|Research integrity issue.|Separate paper-reported numbers from current run outputs in both DB and UI.|

|AI builder generates brittle code|Security, integration or maintenance defects.|Use generated code as a draft; enforce code review, migrations, tests and explicit ownership boundaries.|



# 24. Backlog: Additional User-Facing Ideas

These ideas are intentionally not required for the first release. They should only be added after the core import → profile → evidence-grounded recommendation → scenario flow is reliable.


|Feature|User benefit|Priority / note|
|---|---|---|

|“Was I Right?” follow-up|Track whether a prior forecast/recommendation aligned with the later observed outcome.|P1/P2; define “right” carefully and do not equate correlation with causation.|

|What Changed Since Last Time|Shows only material deltas since the previous session.|P1; practical, low-risk after snapshots exist.|

|Knows When to Shut Up|Automatically reduces low-value nudge frequency based on dismiss/snooze behavior.|P2; opt-in settings and transparent controls.|

|Exportable “receipt for advice”|Share a readable evidence-backed decision summary with family/adviser.|P1/P2; redact raw merchant details by default.|

|48-hour regret check|Optional follow-up after a large purchase to record satisfaction and offer planning help.|P2; explicit opt-in to avoid intrusive nudges.|

|AI self-challenge / counter-evidence|Checks if the initial recommendation conflicts with income, goals or other evidence.|P2; show disagreement transparently; avoid fake multi-agent consensus.|

|Money Mood Journal|Optional transaction tags (necessary/treat/impulse) and later user-controlled review.|P2; sensitive behavioral data; never shame the user.|

|Ambient-only mode|Compact safe-to-spend summary with minimal notifications.|P2; only calculate safe-to-spend when input data is adequate.|

|Explain-to-family mode|Plain-language, shareable summary, optionally localized.|P2; privacy review before sharing.|

|Financial time capsule|Save the user’s reason for a major decision and resurface it at a relevant milestone.|P2; clearly optional; ensure sensitive notes can be deleted.|

|Privacy-preserving accountability buddy|Share goal/streak status without exposing raw financial data.|P2; requires consent and careful access controls.|



# 25. Deliverables

- Responsive Next.js frontend source and design tokens/components.
- FastAPI backend source with typed schemas and documented routes.
- PostgreSQL schema and Alembic migrations.
- CSV importer, data-quality report, 17-category mapping and categorization artifact/configuration where implemented.
- Deterministic profile/calculation service, goals and affordability simulator.
- Four recommendation configurations with versioned prompts and output schemas.
- Evidence calculation and verification service.
- Research scripts for temporal split, perturbation and evaluation.
- Unit, integration, security-boundary and end-to-end tests.
- Environment example, setup instructions, deployment instructions and user-facing disclaimer.
- Synthetic demo dataset and a clear process to remove it from a real-user view.
- Research report distinguishing source-paper results from newly generated implementation results.

# 26. Handoff Guidelines

Use the following as a project-start instruction. Provide the full PRD for repository planning and implementation.


```text
Build FinSight AI from the attached PRD. Treat the PRD as the source of truth.

Rules:
1. Do not collapse the four research configurations: A, B, B-ablation, C.
2. Separate Personal Finance Mode from Research Lab Mode. Synthetic benchmark results must never appear as a real user’s financial results.
3. Use Next.js + TypeScript for the web interface and FastAPI + Python for the API/research backend. Use PostgreSQL/Supabase for storage/auth, scikit-learn for the documented transaction categorization when the matching artifact exists, and Azure OpenAI from the server only.
4. Implement backend calculations before generating AI explanations. The LLM is not a source of truth for financial numbers.
5. Start with one vertical slice: CSV preview/import → transaction list → profile → System C recommendation → evidence verification.
6. Use mock data only for initial UI scaffolding and mark it as demo data. Do not invent production API responses.
7. Every feature must include loading, empty, error, and partial-data states.
8. Add tests with each backend feature. Do not claim completion without running them.
9. Never place secrets in frontend code or commit them. Enforce per-user access and validate all input.
10. Before writing code, inspect the repo and return a phased plan, proposed file structure, unresolved assumptions and acceptance tests. Then implement Phase 0 and Phase 1 only; wait for review before expanding scope.
```

# 27. Official Technical References

These links document the recommended tools. Check current feature availability, plan limits, model support and deployment options during implementation.

- Cursor documentation: https://cursor.com/docs — repository-aware coding agent and development workflow.
- Next.js documentation: https://nextjs.org/docs — App Router, rendering and frontend architecture.
- FastAPI documentation: https://fastapi.tiangolo.com — Python API implementation and validation.
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security — table grants and row-level access policies.
- Azure OpenAI Responses API: https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/responses — supported models, structured output and function calling.
- OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs — schema-constrained model responses.

# 28. Decisions to Confirm Before Implementation


|Decision|Default in this PRD|What the team should confirm|
|---|---|---|

|Product name|FinSight AI, working title|Choose final name and check trademark/domain availability before public release.|

|Authentication|Supabase Auth|Choose email/password or supported OAuth methods for the first demo.|

|LLM deployment|Azure OpenAI Responses API via environment config|Confirm actual deployment/model access, quota, region and schema support.|

|Research dataset version|The version/subset audited for the paper|Pin exact downloaded files, checksum and selection script in the repository.|

|Category taxonomy|17 categories from supplied project specification|Confirm mapping for user CSV statements and how refunds/transfers are treated.|

|Baseline/recent windows|Normalize product-mode comparisons per day; reproduce the paper’s exact research formulas separately|Freeze formulas and add tests before running evaluation.|

|Real user data|CSV/manual entry only for MVP|No direct bank connection in this release.|

|Notifications|Off by default|Choose whether optional experiment reminders are in the MVP.|

|Deployment target|Vercel + Python-compatible API host + Supabase|Confirm budget, free-tier limitations and environment configuration.|

|Data retention|Delete raw upload after parsing unless retention is needed; keep normalized transactions under user control|Confirm retention and deletion behavior for logs/backup constraints.|



# 29. Final Product Definition


> **Definition**
> FinSight AI is a responsive, evidence-grounded personal-finance decision-support website. It lets users import and understand transactions, inspect an individualized spending profile, receive recommendations supported by verifiable financial evidence, simulate purchase and goal trade-offs, protect essential spending, and track selected outcomes. A separate Research Lab preserves and evaluates the four configurations and perturbation experiments from the supplied paper.

The first release is successful when the end-to-end core is correct, safe, testable and understandable—not when every possible feature has been added.
