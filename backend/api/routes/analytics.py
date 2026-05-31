import logging

from fastapi import APIRouter, Depends

from api.dependencies import verify_firebase_token
from models.analytics import AnalyticsMetrics, WeeklyCount, FunnelStage
from services.analytics import AnalyticsService
from utils.firebase import get_firebase_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analytics", tags=["Analytics"])
analytics_service = AnalyticsService()


@router.get("/metrics", response_model=AnalyticsMetrics)
async def get_analytics_metrics(
    user_id: str = Depends(verify_firebase_token),
):
    db = get_firebase_db()
    docs = (
        db.collection("applications")
        .where("user_id", "==", user_id)
        .stream()
    )
    applications = [doc.to_dict() for doc in docs]

    return analytics_service.compute_metrics(applications)


@router.get("/weekly-applications")
async def get_weekly_applications(
    user_id: str = Depends(verify_firebase_token),
):
    db = get_firebase_db()
    docs = (
        db.collection("applications")
        .where("user_id", "==", user_id)
        .stream()
    )
    applications = [doc.to_dict() for doc in docs]

    return {"weeks": analytics_service.weekly_applications(applications)}


@router.get("/funnel")
async def get_conversion_funnel(
    user_id: str = Depends(verify_firebase_token),
):
    db = get_firebase_db()
    docs = (
        db.collection("applications")
        .where("user_id", "==", user_id)
        .stream()
    )
    applications = [doc.to_dict() for doc in docs]

    return {"funnel": analytics_service.conversion_funnel(applications)}
