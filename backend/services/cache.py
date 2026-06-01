import logging
from datetime import datetime, timedelta, timezone

from utils.firebase import get_firebase_db

logger = logging.getLogger(__name__)

CACHE_TTL_MINUTES = 15
CACHE_COLLECTION = "cache_ats_jobs"


def _cache_key(company: str, provider: str) -> str:
    key = f"{company.lower().replace(' ', '_')}_{provider.lower()}"
    key = "".join(c for c in key if c.isalnum() or c in "_")
    return key


async def get_cached_jobs(company: str, provider: str) -> list[dict] | None:
    def _sync_get():
        db = get_firebase_db()
        return db.collection(CACHE_COLLECTION).document(_cache_key(company, provider)).get()

    try:
        import asyncio
        loop = asyncio.get_running_loop()
        doc = await loop.run_in_executor(None, _sync_get)
        if not doc.exists:
            return None
        data = doc.to_dict()
        fetched_at = data.get("fetched_at")
        if not fetched_at:
            return None
        if isinstance(fetched_at, str):
            fetched_at = datetime.fromisoformat(fetched_at)
        if datetime.now(timezone.utc) - fetched_at > timedelta(minutes=CACHE_TTL_MINUTES):
            logger.info("Cache expired for %s (%s)", company, provider)
            return None
        logger.info("Cache HIT for %s (%s) — %d jobs", company, provider, len(data.get("jobs", [])))
        return data.get("jobs", [])
    except Exception as e:
        logger.warning("Cache read error for %s (%s): %s", company, provider, e)
        return None


async def set_cached_jobs(company: str, provider: str, jobs: list[dict]) -> None:
    def _sync_set(payload_jobs):
        db = get_firebase_db()
        db.collection(CACHE_COLLECTION).document(_cache_key(company, provider)).set({
            "company": company,
            "provider": provider,
            "jobs": payload_jobs,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        })

    try:
        MAX_BYTES = 900_000  # Firestore limit is 1MB, leave room for metadata
        import json
        payload = json.dumps(jobs, default=str).encode()
        if len(payload) > MAX_BYTES:
            # Truncate to fit — binary search for the right count
            lo, hi = 0, len(jobs)
            while lo < hi:
                mid = (lo + hi + 1) // 2
                if len(json.dumps(jobs[:mid], default=str).encode()) <= MAX_BYTES:
                    lo = mid
                else:
                    hi = mid - 1
            jobs = jobs[:lo]
            logger.info("Truncated %s (%s) cache to %d jobs (size limit)", company, provider, lo)
        
        import asyncio
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, lambda: _sync_set(jobs))
        logger.info("Cached %d jobs for %s (%s)", len(jobs), company, provider)
    except Exception as e:
        logger.warning("Cache write error for %s (%s): %s", company, provider, e)

