# Empirical Research Protocol & PersonaLedger Benchmark

The FinSight AI Research Laboratory provides a standardized, reproducible experimental framework for evaluating financial recommendation engines, numeric hallucination rates, and anomaly detection sensitivity under strict zero-leakage conditions.

---

## 1. Dataset Provenance: PersonaLedger

`PersonaLedger` is a synthetic financial ledger dataset designed to eliminate privacy exposure while maintaining realistic consumer spending characteristics across multiple socioeconomic cohorts.

### 1.1 Generation Parameters
- **Observation Count:** 1,000 discrete transaction records.
- **Temporal Horizon:** 365 calendar days.
- **Cohort Distribution:** 10 archetypal consumer personas (100 transactions each).
- **Determinism:** Governed by random seed `42` to guarantee exact bitwise reproducibility across platforms.
- **Reference Artifact:** [`public/sample_personal_ledger.csv`](../public/sample_personal_ledger.csv).

### 1.2 Persona Taxonomy
1. **Conservative Saver:** High liquidity margin, low discretionary consumption, automated savings flows.
2. **Urban Commuter:** Daily micro-transactions, elevated transit and dynamic rideshare expenses.
3. **Digital Nomad:** Multi-currency accommodations, variable income frequency, recurring SaaS overhead.
4. **Healthcare Focused:** Inflexible medication schedules, recurring therapy and insurance disbursements.
5. **Young Professional:** Regular bi-weekly salary, education loan amortizations, weekend hospitality spend.
6. **Family Household:** High grocery variance, seasonal educational/apparel spikes, elevated utilities.
7. **Freelance Creative:** High-variance lump-sum receivables, irregular working-capital outflows.
8. **Student Budget:** Fixed scholarship/stipend allowances, low discretionary spending ceilings.
9. **High-Earner Tech:** High disposable margin, premium electronics acquisition, experiential hospitality.
10. **Transition Period:** Recent employment relocation, temporary residential costs, moving expenses.

---

## 2. Temporal Partitioning & Leakage Prevention

A primary failure mode in machine learning evaluations of financial systems is **temporal data leakage**, where models or baseline statistics incorporate future information unavailable at the decision timestamp.

### 2.1 Formal Partition Contract
Let $\mathcal{T} = \{t_1, t_2, \dots, t_N\}$ represent the set of all transactions ordered chronologically by timestamp $\tau(t_i)$:

$$\mathcal{T}_{\text{baseline}} = \{t_i \mid i \le 0.70 \times N\}$$

$$\mathcal{T}_{\text{holdout}} = \{t_i \mid i > 0.70 \times N\}$$

The partition is validated by verifying that no temporal overlap exists:

$$\max_{t \in \mathcal{T}_{\text{baseline}}} \tau(t) < \min_{t \in \mathcal{T}_{\text{holdout}}} \tau(t)$$

The endpoint `POST /research/split` executes this check deterministically, returning the exact date ranges and transaction counts for both partitions.

---

## 3. Evaluation Metrics & Benchmark Criteria

The platform evaluates the four recommendation configurations across four primary dimensions:

### 3.1 Claim Verification Rate (CVR)
The proportion of numerical statements in the recommendation that exactly match verifiable records in the evidence payload within the 1.5% margin $\epsilon$:

$$\text{CVR} = \frac{|\{c \in \mathcal{C} \mid \exists e \in \mathcal{E} \text{ s.t. } |c - e| / \max(|e|, 10^{-6}) \le 0.015\}|}{|\mathcal{C}|}$$

Where $\mathcal{C}$ is the set of extracted monetary tokens and $\mathcal{E}$ is the set of ground-truth evidence values.

### 3.2 Evidence Grounding Precision (EGP)
The proportion of proposed actions that explicitly link to valid, identifiable source transaction identifiers:

$$\text{EGP} = \frac{|\mathcal{A}_{\text{grounded}}|}{|\mathcal{A}_{\text{total}}|}$$

### 3.3 Protected Invariant Violation Rate (PIVR)
The frequency with which an engine proposes spending cuts or budget contractions in user-designated protected categories:

$$\text{PIVR} = \frac{|\{a \in \mathcal{A} \mid \text{category}(a) \in \mathcal{P}_{\text{protected}}\}|}{|\mathcal{A}|}$$

FinSight AI enforces $\text{PIVR} = 0.0$ as a strict system constraint.

---

## 4. Controlled Perturbation Experiment (+150% Shock)

To measure the sensitivity of the recommendation pipelines to genuine behavioral shifts versus noise, the platform executes a controlled anomaly injection protocol:

```
[ Unperturbed Holdout (300 txs) ]
               │
               ▼
   Random Discretionary Target Selection (e.g. "Dining")
               │
               ▼
   Multiply Target Amounts by 2.50 (+150% Inflation)
               │
               ▼
[ Perturbed Holdout Window ] ──► Re-run Benchmark Evaluation
                                      │
                                      ▼
                        Sensitivity & Grounding Assessment
```

### Protocol Steps:
1. **Target Selection:** A non-protected discretionary spending category active in the holdout window is selected at random.
2. **Shock Injection:** Every transaction within that category in $\mathcal{T}_{\text{holdout}}$ is scaled by $+150\%$ ($a_{\text{new}} = 2.5 \times a_{\text{old}}$).
3. **Execution:** All four systems re-analyze the holdout partition.
4. **Validation:** 
   - Systems A and C must detect the perturbed category as the primary anomaly.
   - System C must cite the inflated transaction IDs in its evidence payload and accurately reflect the increased monthly impact without hallucinating numbers.
