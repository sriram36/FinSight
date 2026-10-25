# FinSight AI: Production Deployment Handbook

This guide details deployment options for **FinSight AI**, with a special focus on zero-cost cloud hosting using **Render** (All-in-One Docker Backend with embedded PostgreSQL) and **Vercel** (Next.js Frontend).

---

## 1. Cloud Architecture (Live Environments)

- **Frontend (Vercel):** [https://finsight-wine-tau.vercel.app/](https://finsight-wine-tau.vercel.app/)
- **Backend (Render):** [https://finsight-api-d84z.onrender.com/](https://finsight-api-d84z.onrender.com/)

```
                 Internet
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌──────────────────┐    ┌───────────────────────────────────┐
│ Vercel           │    │ Render                            │
│ Next.js 16 Edge  │    │ Single Docker Web Service         │
│ (React 19 App)   │    │ ├── Uvicorn FastAPI Server ($PORT)│
└─────────┬────────┘    │ └── Embedded PostgreSQL 15 Daemon │
          │             └───────────────────────────────────┘
          │ REST / JSON (NEXT_PUBLIC_API_BASE_URL)
          └─────────────────────►
```

---

## 2. All-in-One Backend Container on Render

The backend utilizes a self-contained Docker image ([Dockerfile](../Dockerfile)) that bundles **both** PostgreSQL 15 and Python/FastAPI into a single process tree governed by [entrypoint.sh](../entrypoint.sh).

### Deployment Steps:
1. Open [Render Dashboard](https://dashboard.render.com).
2. Select your Web Service: `finsight-api-d84z`.
3. In **Settings** → **Build & Deploy**:
   - **Environment:** `Docker`
   - **Dockerfile Path:** `./Dockerfile`
   - **Docker Context:** `.`
4. In **Environment**:
   - `APP_ENV`: `production`
   - `CORS_ORIGINS`: `https://finsight-wine-tau.vercel.app,http://localhost:3000` *(or `*`)*
   - `DATABASE_URL`: *(Leave blank to use the internal embedded PostgreSQL, or provide an external PostgreSQL URL)*
5. Click **Manual Deploy** → **Deploy latest commit**.

### Bootstrapping Lifecycle:
1. Container starts and invokes `/app/entrypoint.sh`.
2. PostgreSQL server starts via `/etc/init.d/postgresql start`.
3. The script waits for database socket readiness via `pg_isready`.
4. Role `finsight_user` and database `finsight` are idempotently created.
5. Uvicorn binds to the dynamic `$PORT` injected by Render.
6. FastAPI startup hook calls `init_db()`, executing `seed_demo_data()` to populate 52 transactions, 3 goals, and 4 recommendations if the database is fresh.

---

## 3. Frontend Deployment on Vercel

The frontend is built on **Next.js 16** with Turbopack and React 19.

### Deployment Steps:
1. Open [Vercel Dashboard](https://vercel.com).
2. Import repository `https://github.com/sriram36/FinSight`.
3. Configure Environment Variables:
   - `NEXT_PUBLIC_API_BASE_URL`: `https://finsight-api-d84z.onrender.com`
4. Click **Deploy**.

---

## 4. Local Deployment with Docker Compose

Run the entire full-stack application locally with persistent data:

```bash
# Clone the repository
git clone https://github.com/sriram36/FinSight.git
cd FinSight

# Launch both services in detached mode
docker compose up --build -d
```

- **Frontend:** `http://localhost:3000`
- **Backend API & Swagger Docs:** `http://localhost:8000/docs`
- **Data Persistence:** SQLite database stored in `./data/finsight.db`.
