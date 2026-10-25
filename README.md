<div align="center">
  <img src="public/logo.svg" alt="FinSight AI Logo" width="120" height="120" />
  <h1>FinSight AI</h1>
  <p><strong>Evidence-grounded personal finance decision support and reproducible research evaluation platform.</strong></p>

  <p>
    <a href="https://finsight-wine-tau.vercel.app/"><img src="https://img.shields.io/badge/Live%20Demo-Vercel%20Frontend-black?style=for-the-badge&logo=vercel" alt="Live Demo" /></a>
    <a href="https://finsight-api-d84z.onrender.com/docs"><img src="https://img.shields.io/badge/Live%20API-Render%20FastAPI-46E3B7?style=for-the-badge&logo=render&logoColor=black" alt="Live API" /></a>
  </p>

  <p>
    <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16.4-black?logo=next.js" alt="Next.js 16" /></a>
    <a href="https://fastapi.tiangolo.com"><img src="https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white" alt="FastAPI" /></a>
    <a href="https://www.postgresql.org"><img src="https://img.shields.io/badge/Database-PostgreSQL%20%26%20SQLite-336791?logo=postgresql&logoColor=white" alt="PostgreSQL & SQLite" /></a>
    <a href="https://docs.pytest.org"><img src="https://img.shields.io/badge/Tests-34%20Passed-brightgreen?logo=pytest&logoColor=white" alt="Pytest" /></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  </p>
</div>

---

## 📚 Deep-Dive Technical Documentation

For an exhaustive examination of the platform's mathematics, architecture, and empirical methodology, consult the dedicated guides:

| Document | Focus & Highlights |
| :--- | :--- |
| **[System Architecture & Core Invariants](docs/ARCHITECTURE.md)** | Period-normalized math ($B/D_b \times D_r$), zero-baseline safety, claim verifier AST parser, 4-tier recommendation engine. |
| **[PersonaLedger & Synthetic Research Lab](docs/RESEARCH_LAB.md)** | 1,000-row synthetic benchmark, 10 financial personas, zero-leakage 70/30 temporal holdout, $+150\%$ controlled perturbation protocol. |
| **[REST API Reference Specification](docs/API_REFERENCE.md)** | Complete endpoint specifications, request/response schemas, query parameters, and error codes for all 14 endpoints. |
| **[Production Deployment Handbook](docs/DEPLOYMENT_GUIDE.md)** | Step-by-step guides for All-in-One Docker on Render, Vercel edge deployment, Docker Compose, and environment variables. |

---

## 📌 GitHub Repository Details & Tags

* **Short Description:**
  > Evidence-grounded personal finance decision support platform with deterministic math, strict claim verification, and synthetic research evaluation.
* **Live Web App:** [https://finsight-wine-tau.vercel.app/](https://finsight-wine-tau.vercel.app/)
* **Live API & OpenAPI Docs:** [https://finsight-api-d84z.onrender.com/docs](https://finsight-api-d84z.onrender.com/docs)
* **GitHub Repository:** [https://github.com/sriram36/FinSight](https://github.com/sriram36/FinSight)
* **Suggested Topics / Tags:**
  `personal-finance` · `fintech` · `ai-finance` · `claim-verification` · `evidence-grounded` · `fastapi` · `nextjs16` · `react19` · `postgresql` · `sqlite` · `reproducible-research` · `synthetic-data` · `docker`

---

## 🌟 Core Philosophies & Invariants

FinSight AI bridges personal finance management and rigorous AI safety research through three core invariants:

1. **Deterministic Financial Math Invariant:**
   LLMs never compute financial totals, daily pacing, or affordability limits. All math is deterministically calculated by backend Python services using period normalization:
   $$\text{Normalized Baseline} = \left(\frac{B}{D_b}\right) \times D_r$$
2. **Strict Numeric Claim Verification:**
   System C AI recommendations must be supported by itemized source transaction IDs. Every numeric token cited in the recommendation text is cross-examined against underlying evidence records within a 1.5% rounding tolerance.
3. **Protected Category Invariants:**
   User-flagged essential categories (e.g., Healthcare, Rent) are strictly shielded. The recommendation engine and simulator are prohibited from proposing cuts to protected essentials.

---

## 🚀 Key Modules

### 1. Personal Finance Workspace
- **Overview Dashboard:** Real cashflow trajectory, available balance, active goal feasibility status, and latest verified recommendation.
- **Transactions Management:** Bank statement CSV import with automatic column mapping, real-time preview, transaction CRUD, pagination, and user category overrides.
- **Spending Profile:** Baseline vs. recent spending comparisons with daily pace analysis and zero-baseline safety protections.
- **Multi-Configuration Recommendations:**
  - **System A:** Deterministic rule baseline (25% threshold + tie-breaker).
  - **System B:** Personalized AI generation conditioned on user spending profile.
  - **System B-Ablation:** Free-form unstructured advice.
  - **System C:** Full evidence-grounded generation with itemized source transaction citations and strict claim verification.
- **"Can I Afford This?" Simulator:** Evaluates prospective purchases against available balance, upcoming obligations, emergency buffer, and active goal commitments.
- **Goals & Protected Invariants:** Goal feasibility calculator with shortfall warnings and category protection toggles.

### 2. Synthetic Research Lab
- **PersonaLedger Dataset:** 1,000 synthetic transactions across 10 personas (seed 42) for zero-leakage academic benchmarking.
- **70/30 Temporal Holdout Split:** Historical baseline window vs. holdout evaluation window with verified absence of temporal leakage ($\max(\text{baseline}) < \min(\text{holdout})$).
- **Controlled Perturbation Runner:** Injects forced spending anomalies ($+150\%$) into holdout categories to test system detection accuracy and claim verification fidelity.

---

## 🛠️ Architecture & Tech Stack

```mermaid
graph TD
    Client[Next.js 16 Web Client / React 19] -->|REST / JSON| API[FastAPI Backend / Python 3.14]
    API --> ServiceProfile[Profile Engine - Deterministic Math]
    API --> ServiceGoal[Goal & Invariant Service]
    API --> ServiceRec[Multi-System Recommendation Orchestrator]
    API --> ServiceVerify[Strict Numeric Claim Verifier]
    API --> ServiceResearch[PersonaLedger Benchmark Runner]
    ServiceProfile --> DB[(SQLite3 - finsight.db)]
    ServiceGoal --> DB
    ServiceRec --> DB
    ServiceVerify --> DB
```

- **Frontend:** Next.js 16 (App Router, Turbopack), React 19, Vanilla Tailwind CSS, Lucide Icons.
- **Backend:** FastAPI, Python 3.14+, Pydantic v2, Python `sqlite3`, `pytest`.
- **Database:** SQLite3 with strict `PRAGMA foreign_keys = ON;` and ACID transactions.

---

## 💻 Local Development Setup

### 1. Prerequisites
- Python 3.11+ (Python 3.14 recommended)
- Node.js 20+ and npm

### 2. Backend Setup
```bash
# Clone the repository
git clone https://github.com/sriram36/FinSight.git
cd FinSight

# Create and activate Python virtual environment
python -m venv .venv
# Windows:
.\.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Run backend test suite (30 tests)
pytest backend/tests/ -v

# Start FastAPI backend server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```
Backend API will be accessible at: `http://localhost:8000` (Interactive docs: `http://localhost:8000/docs`).

### 3. Frontend Setup
In a new terminal window:
```bash
# Install frontend dependencies
npm install

# Run type check
npx tsc --noEmit

# Start Next.js development server
npm run dev
```
Frontend web application will be accessible at: `http://localhost:3000`.

---

## 🚢 Deployment Guide

### Option 1: Docker Compose (Recommended for Full-Stack)

Deploy the entire stack with a single command using Docker:

1. Create a `docker-compose.yml` (already provided in the repository):
```bash
docker compose up --build -d
```
2. Verify services:
- Web UI: `http://localhost:3000`
- API & Docs: `http://localhost:8000/docs`
- SQLite database is persisted in a mounted Docker volume (`./data/finsight.db`).

---

### Option 2: Cloud Deployment (Vercel + Render / Railway / Fly.io)

#### A. Deploy Backend (FastAPI with Docker or Python) on Render:
1. Create a new Web Service pointing to `https://github.com/sriram36/FinSight`.
2. **Environment:** Choose **Docker** (Render uses the root `Dockerfile` or `Dockerfile.backend` automatically).
   *(Alternatively, choose **Python** with build command `pip install -r backend/requirements.txt` and start command `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`)*.
3. Set Environment Variables:
   ```env
   CORS_ORIGINS=https://your-frontend-domain.vercel.app
   APP_ENV=production
   DATABASE_URL=postgres://finsight_user:password@dpg-xxx:5432/finsight
   ```
   *(Supports both Render PostgreSQL and SQLite).*

#### B. Deploy Frontend (Next.js) on Vercel:
1. Import `https://github.com/sriram36/FinSight` into Vercel.
2. Set Environment Variables:
   ```env
   NEXT_PUBLIC_API_BASE_URL=https://your-backend-api.onrender.com
   ```
3. Click **Deploy**. Vercel will build the Next.js static and server components automatically.

---

### Option 3: Self-Hosted Production VPS (Ubuntu / Debian / systemd)

#### 1. Backend Service (`/etc/systemd/system/finsight-api.service`):
```ini
[Unit]
Description=FinSight AI FastAPI Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/var/www/FinSight
ExecStart=/var/www/FinSight/.venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

#### 2. Frontend Production Process (PM2):
```bash
npm run build
pm2 start npm --name "finsight-frontend" -- start
```

#### 3. Reverse Proxy with Nginx:
```nginx
server {
    server_name finsight.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🧪 Test Suite & Quality Verification

All business calculations, API routers, and claim verifiers are covered by automated unit and end-to-end tests:

```bash
# Run all 30 tests
pytest backend/tests/ -v

# Run end-to-end user journey test
pytest backend/tests/test_e2e_flow.py -v

# Run research benchmark and perturbation test
pytest backend/tests/test_research_lab.py -v

# Run TypeScript static analysis
npx tsc --noEmit
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
