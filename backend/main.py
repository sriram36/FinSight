from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.database import init_db
from backend.routers import health, imports, transactions, profile, goals, scenarios, recommendations, research

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Evidence-grounded personal finance decision support and research evaluation API.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
)

app.include_router(health.router)
app.include_router(imports.router)
app.include_router(transactions.router)
app.include_router(profile.router)
app.include_router(goals.router)
app.include_router(scenarios.router)
app.include_router(recommendations.router)
app.include_router(research.router)







@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API. Visit /docs for OpenAPI documentation.",
        "version": settings.APP_VERSION
    }
