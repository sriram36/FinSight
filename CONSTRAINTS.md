# FinSight AI — Project Constraints

**Status:** Active Contract  
**Created:** 2026-10-24  
**Specification:** [FinSight_AI_Complete_PRD.md](file:///d:/FinSight/FinSight_AI_Complete_PRD.md)

---

## 1. Quality Floor (Non-Negotiables)

1. **No Math in LLM:** Financial arithmetic (totals, daily pace, period-normalized baselines, percentage deviations, affordability, goal feasibility) must be calculated deterministically by the Python backend. The LLM is strictly used for language synthesis, not financial calculation.
2. **Evidence Verification:** Every numeric claim displayed with a "Verified" badge must reference a backend-computed evidence value and pass tolerance checks ($\pm 1\%$ rounding). Unverified claims must be flagged and suppressed.
3. **Protected Categories Invariant:** Categories designated as `protected` by the user must never be suggested as reduction targets by any recommendation engine (System A, B, B-ablation, or C).
4. **Environment & Data Separation:** Personal Finance Mode and Research Lab Mode are strictly isolated in storage, routes, and UI presentation. Benchmark results must never be labeled or displayed as real personal finances.
5. **No Secret Leaks:** Credentials (database URLs, Azure OpenAI keys, auth secrets) must reside in environment variables and never be exposed in client code, committed files, or error payloads.
6. **Zero Silent Row Drops:** In CSV import, all rows must be accounted for in the summary (accepted, rejected with reason, duplicate).

---

## 2. Thresholds & Budgets

- **Backend Unit & Integration Test Coverage:** $\ge 85\%$ on calculation and verification services (`profile_service`, `goal_service`, `affordability_service`, `verifier_service`).
- **Frontend Build:** Clean compilation with zero TypeScript errors (`tsc --noEmit`).
- **Accessibility:** WCAG 2.1 AA contrast ratio ($\ge 4.5:1$ for normal text), minimum touch target size $44 \times 44\text{px}$, descriptive ARIA labels for icon-only buttons, keyboard navigable dialogs.
- **API Performance:** Deterministic calculations (profile, affordability, goals) must return in $< 100\text{ms}$. LLM recommendation calls must have bounded timeouts ($\le 10\text{s}$) with fallback to System A rule baseline.
