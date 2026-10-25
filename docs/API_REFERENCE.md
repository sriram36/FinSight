# FinSight AI: REST API Reference Specification

Base URL: `http://localhost:8000` (Local) / `https://finsight-api-d84z.onrender.com` (Production)

---

## 1. System & Health

### `GET /health`
Returns system operational health, application version, and active runtime environment.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "app": "FinSight AI",
  "version": "1.0.0",
  "environment": "production"
}
```

---

## 2. Transactions & Imports

### `POST /imports/preview`
Multipart form upload of bank statement CSV. Automatically detects and maps columns (`Date`, `Description`, `Amount`, `Category`, `Direction`).

**Form Data:**
- `file`: CSV file (max 10MB)
- `user_id`: Target user ID (default: `"default_user"`)
- `column_mapping` (optional): JSON string overriding automatic header detection.

**Response (200 OK):**
```json
{
  "total_rows": 120,
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
      "mapped_description": "Trader Joe's",
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
Commits validated preview rows into the persistent transactions table.

**Request Body:**
```json
{
  "user_id": "default_user",
  "file_name": "chase_statement_feb.csv",
  "transactions": [
    {
      "transaction_date": "2026-02-15",
      "description": "Trader Joe's",
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
  "import_id": "imp_9a8b7c6d5e",
  "accepted_count": 1,
  "rejected_count": 0,
  "duplicate_count": 0
}
```

### `GET /transactions`
Paginated search and filter query for user transactions.

**Query Parameters:**
- `user_id`: string (default `"default_user"`)
- `start_date`: string (ISO `YYYY-MM-DD`)
- `end_date`: string (ISO `YYYY-MM-DD`)
- `category`: string
- `direction`: `"spending"` | `"income"`
- `search`: string (case-insensitive description search)
- `limit`: integer (1–500, default 50)
- `offset`: integer (default 0)

---

## 3. Spending Profile & Mathematical Analysis

### `GET /profile`
Calculates period-normalized spending metrics, daily pacing, and category deltas across baseline and recent observation windows.

**Query Parameters:**
- `user_id`: string (default `"default_user"`)
- `baseline_start`: ISO Date
- `baseline_end`: ISO Date
- `recent_start`: ISO Date
- `recent_end`: ISO Date

**Response (200 OK):**
```json
{
  "user_id": "default_user",
  "baseline_days": 60,
  "recent_days": 30,
  "total_baseline_spending": 45000.00,
  "total_recent_spending": 24500.00,
  "net_daily_pace_delta": 45.20,
  "categories": [
    {
      "category": "Dining",
      "baseline_spending": 8000.00,
      "normalized_baseline": 4000.00,
      "recent_spending": 5800.00,
      "delta_amount": 1800.00,
      "delta_percentage": 45.0,
      "is_protected": false
    }
  ]
}
```

---

## 4. Recommendations & Evidence Grounding

### `POST /recommendations/generate`
Executes multi-system recommendation generation across Systems A, B, B-ablation, and C.

**Request Body:**
```json
{
  "user_id": "default_user",
  "recent_days": 30,
  "baseline_days": 60
}
```

### `GET /recommendations/{id}/evidence`
Fetches the granular itemized source transactions that substantiate a System C recommendation.

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
      "id": "tx_seed_01",
      "transaction_date": "2026-02-18",
      "description": "Trattoria Pasta & Wine Bar",
      "amount": 3450.00,
      "category": "Dining"
    }
  ]
}
```

---

## 5. Scenario Simulation & Goals

### `POST /scenarios/affordability`
Evaluates prospective purchase viability against balance, pending obligations, emergency buffers, and active goals.

**Request Body:**
```json
{
  "user_id": "default_user",
  "amount": 45000.00,
  "category": "Shopping",
  "description": "MacBook Pro Monitor",
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
