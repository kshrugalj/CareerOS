from pydantic import BaseModel
from typing import Optional


class AnalyticsMetrics(BaseModel):
    total_applications: int = 0
    active_applications: int = 0
    interviews: int = 0
    offers: int = 0
    rejections: int = 0
    response_rate: float = 0.0
    interview_rate: float = 0.0
    offer_rate: float = 0.0


class WeeklyCount(BaseModel):
    week: str
    count: int


class FunnelStage(BaseModel):
    stage: str
    count: int
