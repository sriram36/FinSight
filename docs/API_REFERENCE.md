# REST API Specification

The FinSight AI backend exposes an HTTP REST API for statement ingestion, financial profiling, scenario simulation, goal management, multi-system recommendations, and synthetic benchmark execution.

- **Local Base URL:** `http://localhost:8000`
- **Production Base URL:** `https://finsight-api-d84z.onrender.com`
- **Interactive Swagger UI:** `/docs`
- **OpenAPI Schema (JSON):** `/openapi.json`

---

## Standard Error Envelope

When a client or server error occurs, the API returns a structured JSON payload:

```json
{
  "detail": "Descriptive error message specifying the exact constraint violation or missing entity."
}
```

Common status codes:
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Malformed payload, invalid date ordering, or constraint failure.
- `404 Not Found`: Target entity identifier does not exist.
- `422 Unprocessable Entity`: Request body failed Pydantic validation.
- `500 Internal Server Error`: Unhandled server exception.

---

## 1. System Health & Diagnostics

### `GET /health`
Returns operational status, application version, and environment.

**Response (200 OK):**
```json
{
  "status": "ok",
  "app": "FinSight AI",
  "version": "1.0.0",
  "environment": "production"
}
```

---

## 2. Statement Ingestion & CSV Import

### `POST /imports/preview`
Parses an uploaded bank statement CSV file, automatically maps headers to standard schema fields, validates date formats, and returns a structured preview with row-level validation states.

- **Content-Type:** `multipart/form-data`
- **Parameters:**
  - `file`: CSV file content (required).
  - `user_id`: Target user ID (default: `"default_user"`).
  - `column_mapping`: Optional JSON string to manually override detected column names.

**Response (200 OK):**
```json
{
  "total_rows": 48,
  "detected_columns": ["Date", "Description", "Amount", "Type"],
  "column_mapping": {
    "date": "Date",
    "description": "Description",
    "amount": "Amount",
    "direction": "Type"
  },
  "sample_preview": [
    {
      "row_index": 1,
      "mapped_date": "2026-02-15",
      "mapped_description": "Whole Foods Market",
      "mapped_amount": 75.40,
      "mapped_direction": "spending",
      "mapped_category": "Groceries",
      "status": "valid",
      "error": null
    }
  ]
}
```

### `POST /imports/confirm`
Commits a verified set of previewed transactions into persistent storage. Deduplicates against identical existing records (`date`, `description`, `amount`).

**Request Body:**
```json
{
  "user_id": "default_user",
  "file_name": "statement_q1.csv",
  "transactions": [
    {
      "transaction_date": "2026-02-15",
      "description": "Whole Foods Market",
      "amount": 75.40,
      "direction": "spending",
      "category": "Groceries"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "import_id": "imp_7a2b9c1d",
  "accepted_count": 1,
  "rejected_count": 0,
  "duplicate_count": 0
}
```

### `GET /imports`
Returns a reverse-chronological list of all statement imports executed by the user.

- **Query Parameters:** `user_id` (string)

---

## 3. Transaction Management

### `GET /transactions`
Queries user transactions with multi-dimensional filtering, text search, and pagination.

- **Query Parameters:**
  - `user_id`: string (default `"default_user"`)
  - `start_date`: ISO date string (`YYYY-MM-DD`)
  - `end_date`: ISO date string (`YYYY-MM-DD`)
  - `category`: string
  - `direction`: `"spending"` | `"income"`
  - `search`: string (case-insensitive substring search in description and category)
  - `limit`: integer (1–500, default 50)
  - `offset`: integer (default 0)

**Response (200 OK):**
```json
{
  "total": 52,
  "limit": 50,
  "offset": 0,
  "total_spending": 84250.00,
  "total_income": 170000.00,
  "items": [
    {
      "id": "tx_seed_01",
      "user_id": "default_user",
      "transaction_date": "2026-02-20",
      "description": "Apex Global Tech - Direct Deposit",
      "amount": 85000.00,
      "direction": "income",
      "category": "Income",
      "category_source": "auto",
      "created_at": "2026-02-20T00:00:00Z"
    }
  ]
}
```

### `POST /transactions`
Manually records an individual transaction.

### `PATCH /transactions/{id}`
Updates a transaction's category (marking `category_source = "manual_override"`), description, or amount.

### `DELETE /transactions/{id}`
Permanently removes a transaction record.

---

## 4. Spending Profile & Time-Series Analytics

### `GET /profile`
Executes period-normalized spending analysis across baseline and recent calendar observation windows.

- **Query Parameters:**
  - `user_id`: string (default `"default_user"`)
  - `baseline_start`: ISO date
  - `baseline_end`: ISO date
  - `recent_start`: ISO date
  - `recent_end`: ISO date

**Response (200 OK):**
```json
{
  "user_id": "default_user",
  "baseline_days": 60,
  "recent_days": 30,
  "total_baseline_spending": 68400.00,
  "total_recent_spending": 42125.00,
  "net_daily_pace_delta": 264.17,
  "categories": [
    {
      "category": "Dining",
      "baseline_spending": 14200.00,
      "normalized_baseline": 7100.00,
      "recent_spending": 9850.00,
      "delta_amount": 2750.00,
      "delta_percentage": 38.73,
      "is_protected": false
    }
  ]
}
```

---

## 5. Multi-System Recommendation Engine

### `POST /recommendations/generate`
Generates comparative recommendations across Systems A, B, B-ablation, and C based on profile dynamics.

**Request Body:**
```json
{
  "user_id": "default_user",
  "recent_days": 30,
  "baseline_days": 60
}
```

### `GET /recommendations`
Retrieves generated recommendations for the user.

### `GET /recommendations/{id}/evidence`
Returns the itemized source transaction records and structured arithmetic proof supporting a System C recommendation.

**Response (200 OK):**
```json
{
  "recommendation_id": "rec_seed_4a2c",
  "configuration": "system_c",
  "category": "Dining",
  "claimed_impact": 4200.00,
  "is_verified": true,
  "source_transactions": [
    {
      "id": "tx_seed_19",
      "transaction_date": "2026-02-06",
      "description": "Trattoria Pasta & Wine Bar",
      "amount": 3450.00,
      "category": "Dining"
    }
  ]
}
```

---

## 6. Scenario Simulation & Goals

### `POST /scenarios/affordability`
Simulates a prospective purchase against cashflow, safety buffers, and active goal commitments.

**Request Body:**
```json
{
  "user_id": "default_user",
  "amount": 45000.00,
  "category": "Shopping",
  "description": "4K UltraFine Studio Display",
  "current_balance": 120000.00,
  "emergency_buffer": 50000.00
}
```

**Response (200 OK):**
```json
{
  "verdict": "comfortable",
  "post_purchase_balance": 75000.00,
  "buffer_intact": true,
  "disrupted_goals": [],
  "explanation": "Purchase is within discretionary limits and leaves emergency reserve buffer intact."
}
```

### `GET /goals` | `POST /goals` | `DELETE /goals/{id}`
Full CRUD management for target savings goals with feasibility computation.

### `GET /goals/preferences/categories` | `PATCH /goals/preferences/categories/{category}`
Lists and updates category invariant toggles (`is_protected = 0 | 1`) and non-negotiable rationales.

---

## 7. Synthetic Research Laboratory

### `GET /research/audit`
Returns cryptographic provenance, row counts, and date range of the PersonaLedger synthetic benchmark dataset.

### `POST /research/split`
Executes zero-leakage 70/30 temporal holdout partitioning and verifies absence of forward leakage.

### `POST /research/benchmark`
Runs all 4 recommendation systems against the holdout partition, outputting claim verification rates, grounding precision, and invariant adherence metrics.

### `POST /research/perturbation`
Injects an automated $+150\%$ inflation shock into a selected holdout category to evaluate anomaly detection sensitivity.
