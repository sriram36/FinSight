from fastapi import APIRouter
from backend.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "headline_metric": "safe_to_spend_today",
        "headline_fields": [
            "safe_to_spend_today",
            "raw_balance",
            "locked_by_constraints",
            "runway_days_remaining",
        ],
    }
