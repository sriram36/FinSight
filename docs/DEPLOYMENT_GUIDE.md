# Production Deployment Handbook

This runbook specifies operational deployment procedures for FinSight AI across cloud hosting (Render and Vercel) and local containerized infrastructure.

---

## 1. Live Deployment Topology

- **Frontend Client (Vercel):** [https://finsight-wine-tau.vercel.app/](https://finsight-wine-tau.vercel.app/)
- **Backend Service (Render):** [https://finsight-api-d84z.onrender.com/](https://finsight-api-d84z.onrender.com/)

```
               Client Traffic (HTTPS)
                         │
                         ▼
             [ Vercel: Next.js 16 Edge ]
                         │
                         │ REST / JSON (NEXT_PUBLIC_API_BASE_URL)
                         ▼
             [ Render: Docker Web Service ]
                 ├── Uvicorn HTTP Server ($PORT)
                 └── Embedded PostgreSQL 15 Daemon (127.0.0.1:5432)
```

---

## 2. All-in-One Backend Deployment (Render)

The backend is packaged as a unified Docker image (`Dockerfile`) encapsulating both the PostgreSQL 15 relational engine and the Python FastAPI application.

### 2.1 Configuration Runbook
1. Access the [Render Dashboard](https://dashboard.render.com).
2. Select target Web Service: `finsight-api-d84z`.
3. Navigate to **Settings** → **Build & Deploy**:
   - **Environment:** `Docker`
   - **Dockerfile Path:** `./Dockerfile`
   - **Docker Context Directory:** `.`
4. Navigate to **Environment** tab and configure:

| Key | Recommended Value | Purpose |
| :--- | :--- | :--- |
| `APP_ENV` | `production` | Enforces production runtime logging and optimizations. |
| `CORS_ORIGINS` | `https://finsight-wine-tau.vercel.app,http://localhost:3000` | Whitelists the Vercel frontend origin. Can use `*` for broad access. |
| `DATABASE_URL` | *(Leave empty)* | When omitted or pointing to `localhost`, starts the embedded PostgreSQL server. |

5. Trigger **Manual Deploy** → **Deploy latest commit**.

### 2.2 Container Bootstrapping Sequence
1. The container executes `/app/entrypoint.sh`.
2. The PostgreSQL service daemon starts via `/etc/init.d/postgresql start`.
3. Socket availability is polled via `pg_isready` (maximum 30-second timeout).
4. The database `finsight` and user role `finsight_user` (`finsight_secret`) are idempotently provisioned.
5. Uvicorn binds to `0.0.0.0:$PORT` using the port dynamically allocated by Render.
6. FastAPI's lifespan hook executes `init_db()`. If tables are unpopulated, `seed_demo_data()` seeds 52 transactions, 3 goals, and 4 comparative recommendations.

---

## 3. Frontend Client Deployment (Vercel)

The frontend is built on **Next.js 16** with Turbopack and React 19.

### 3.1 Deployment Runbook
1. Access the [Vercel Dashboard](https://vercel.com).
2. Select **Add New...** → **Project** and import `https://github.com/sriram36/FinSight`.
3. Set the build environment variables:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://finsight-api-d84z.onrender.com` | Do not append a trailing slash. |

4. Click **Deploy**. Vercel compiles and caches static assets globally across its edge network.

---

## 4. Local Deployment with Docker Compose

For local development or dedicated VPS hosting:

```bash
# Clone the repository
git clone https://github.com/sriram36/FinSight.git
cd FinSight

# Launch both services in detached mode
docker compose up --build -d
```

- **Frontend Application:** `http://localhost:3000`
- **Backend API & Docs:** `http://localhost:8000/docs`
- **Data Persistence:** Volume mount mapped to `./data/finsight.db`.

---

## 5. Health Monitoring & Operational Verification

### Health Check Endpoint
Query the `/health` endpoint to verify service liveness:
```bash
curl -f https://finsight-api-d84z.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "app": "FinSight AI",
  "version": "1.0.0",
  "environment": "production"
}
```

### Diagnostic Logging
- **Render Service Logs:** Monitored via the Render Dashboard under **Logs**. Shows database initialization, query timing, and Uvicorn access traces.
- **Vercel Runtime Logs:** Monitored via the Vercel Project Dashboard under **Runtime Logs**. Captures client-side fetch errors and rendering metrics.
