import logging
from collections import Counter
from datetime import datetime, timedelta

from models.analytics import AnalyticsMetrics, WeeklyCount, FunnelStage

logger = logging.getLogger(__name__)


class AnalyticsService:
    def compute_metrics(self, applications: list) -> AnalyticsMetrics:
        total = len(applications)
        if total == 0:
            return AnalyticsMetrics()

        status_counts = Counter(a.get("status", "Saved") for a in applications)

        applied_count = sum(
            status_counts[s]
            for s in ["Applied", "OA Received", "OA Completed", "Interview Scheduled",
                       "Interviewing", "Final Round", "Offer"]
        )
        interviews = sum(
            status_counts[s]
            for s in ["Interview Scheduled", "Interviewing", "Final Round"]
        )
        offers = status_counts.get("Offer", 0)
        rejections = status_counts.get("Rejected", 0)
        responses = interviews + offers + rejections

        return AnalyticsMetrics(
            total_applications=total,
            active_applications=sum(
                status_counts[s]
                for s in ["Saved", "Applying", "Applied", "OA Received",
                           "OA Completed", "Interview Scheduled", "Interviewing",
                           "Final Round"]
            ),
            interviews=interviews,
            offers=offers,
            rejections=rejections,
            response_rate=round(responses / total, 2) if total > 0 else 0.0,
            interview_rate=round(interviews / applied_count, 2) if applied_count > 0 else 0.0,
            offer_rate=round(offers / applied_count, 2) if applied_count > 0 else 0.0,
        )

    def weekly_applications(self, applications: list) -> list[WeeklyCount]:
        now = datetime.utcnow()
        weeks = {}
        for i in range(12):
            week_start = now - timedelta(weeks=i, days=now.weekday())
            label = week_start.strftime("%Y-%m-%d")
            weeks[label] = 0

        for app in applications:
            applied_at = app.get("applied_at")
            if applied_at:
                if isinstance(applied_at, datetime):
                    dt = applied_at
                else:
                    continue
                week_label = (dt - timedelta(days=dt.weekday())).strftime("%Y-%m-%d")
                if week_label in weeks:
                    weeks[week_label] += 1

        return [
            WeeklyCount(week=label, count=count)
            for label, count in sorted(weeks.items())
        ]

    def conversion_funnel(self, applications: list) -> list[FunnelStage]:
        stages = ["Saved", "Applied", "Interview", "Offer"]
        counts = {"Saved": 0, "Applied": 0, "Interview": 0, "Offer": 0}

        for app in applications:
            status = app.get("status", "Saved")
            counts["Saved"] += 1
            if status in ["Applied", "OA Received", "OA Completed",
                          "Interview Scheduled", "Interviewing", "Final Round", "Offer"]:
                counts["Applied"] += 1
            if status in ["Interview Scheduled", "Interviewing", "Final Round", "Offer"]:
                counts["Interview"] += 1
            if status == "Offer":
                counts["Offer"] += 1

        return [FunnelStage(stage=s, count=counts[s]) for s in stages]
