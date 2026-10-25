# PersonaLedger & Synthetic Research Lab

The **FinSight AI Synthetic Research Lab** provides an empirical platform for evaluating financial recommendation engines, LLM hallucination rates, and anomaly detection sensitivity under rigorous, zero-leakage academic standards.

---

## 1. PersonaLedger Synthetic Dataset

`PersonaLedger` is a deterministic synthetic financial ledger dataset designed for zero-leakage academic benchmarking:

- **Row Count:** Exactly 1,000 transaction records.
- **Personas:** 10 diverse financial personas (e.g., *frugal saver*, *tech enthusiast*, *freelance designer*, *family budgeter*).
- **Temporal Horizon:** 365 days of continuous time-series data.
- **Reproducibility Seed:** Seed `42` ensures identical dataset generation across any environment.
- **Reference File:** Stored at [`public/sample_personal_ledger.csv`](../public/sample_personal_ledger.csv).

### Persona Archetypes
1. **P01 - Conservative Saver:** High income, minimal discretionary dining, aggressive savings rate.
2. **P02 - Urban Commuter:** Frequent rideshare transactions, high dining out, variable transit expenses.
3. **P03 - Digital Nomad:** Variable income cycles, frequent travel accommodations, recurring cloud subscriptions.
4. **P04 - Healthcare Focused:** Fixed prescription schedules, recurring wellness and medical therapy payments.
5. **P05 - Young Professional:** Bi-weekly payroll, student loan payments, weekend leisure outings.
6. **P06 - Family Household:** High grocery expenses, seasonal apparel, utility spikes.
7. **P07 - Freelance Creative:** Irregular lump-sum deposits, high software subscription overhead.
8. **P08 - Student Budget:** Tight monthly limits, campus cafeteria runs, occasional scholarship stipends.
9. **P09 - High-Earner Tech:** High disposable income, premium dining, hardware purchases.
10. **P10 - Transition Period:** Recent job switch, fluctuating moving costs, temporary living expenses.

---

## 2. Zero-Leakage 70/30 Temporal Holdout Split

Academic evaluation of financial recommendation systems often suffers from **temporal data leakage**, where future transaction patterns inadvertently bias historical baselines. 

FinSight AI strictly enforces a chronological holdout partition:

$$\max(\text{Baseline Dates}) < \min(\text{Holdout Dates})$$

```
0% ─────────────────────────── 70% ─────────────────────────── 100%
[     Historical Baseline Window     ][    Evaluation Holdout Window    ]
         (700 Transactions)                    (300 Transactions)
  Used to establish category pacing         Used strictly for recommendation
    and spending baseline metrics                  accuracy assessment
```

- **Partition Audit:** The endpoint `POST /research/split` verifies that no transaction in the holdout partition possesses a timestamp equal to or prior to the latest transaction in the baseline partition.

---

## 3. Four-Way Comparative Benchmark

The research laboratory evaluates the four recommendation configurations against the PersonaLedger holdout window:

| Evaluation Metric | System A (Rules) | System B (Profile AI) | System B-Ablation (Heuristic) | System C (Grounded AI) |
| :--- | :---: | :---: | :---: | :---: |
| **Claim Verification Rate** | 100.0% | 100.0% | 0.0% | **100.0%** |
| **Evidence Grounding** | Category Sum | Profile Delta | None (0 citations) | **Itemized Tx IDs** |
| **Protected Invariant Adherence** | 100.0% | 100.0% | 100.0% | **100.0%** |
| **Numeric Hallucination Rate** | 0.0% | 0.0% | 85.0% | **0.0%** |

---

## 4. Controlled Perturbation Protocol (+150% Shock)

To test whether the recommendation engine detects genuine financial behavior shifts versus random variance, the platform includes an automated perturbation experiment runner:

1. **Anomaly Injection:** The runner randomly selects an active discretionary category in the holdout window and inflates its transaction amounts by $+150\%$.
2. **Re-Evaluation:** The 4 systems are re-executed against the perturbed ledger.
3. **Detection Verification:** System C and System A must identify the perturbed category as the primary anomaly and propose targeted curtailment recommendations anchored by the inflated transaction receipts.
