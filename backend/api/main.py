import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.routes import resume, jobs, cover_letters, applications, analytics, auth
from utils.firebase import get_firebase_db
from services.jobhive_client import jobhive_client
from jobs.ats_connectors import CURATED_COMPANIES
from services.cache import get_cached_jobs, set_cached_jobs

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

DISABLE_WARMUP = os.environ.get("DISABLE_WARMUP", "").lower() in ("true", "1", "yes")


async def warmup_ats_cache():
    """Prefetch and cache jobs from all ATS companies on startup."""
    logger.info("Starting ATS cache warmup for %d companies...", len(CURATED_COMPANIES))
    from jobs.ats_connectors import JobDiscoveryService
    discovery = JobDiscoveryService()
    semaphore = asyncio.Semaphore(10)

    async def warmup_one(name, provider, token):
        cached = await get_cached_jobs(name, provider)
        if cached is not None:
            return
        async with semaphore:
            connector = discovery._build_connector(name, provider, token)
            try:
                jobs = await connector.fetch_jobs()
                await set_cached_jobs(name, provider, [j.model_dump(mode="json") for j in jobs])
                logger.info("Warmup: cached %d jobs from %s (%s)", len(jobs), name, provider)
            except Exception as e:
                logger.warning("Warmup failed for %s: %s", name, e)

    await asyncio.gather(*[warmup_one(n, p, t) for n, p, t in CURATED_COMPANIES])
    logger.info("ATS cache warmup complete")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        get_firebase_db()
        logger.info("Firebase initialized")
    except Exception as e:
        logger.warning(f"Firebase not available at startup: {e}")

    if DISABLE_WARMUP:
        logger.info("DISABLE_WARMUP=true — skipping jobhive and ATS warmup (low-memory mode)")
    else:
        asyncio.create_task(jobhive_client.start_warmup())
        logger.info("Jobhive warmup started in background")

        asyncio.create_task(warmup_ats_cache())
        logger.info("ATS cache warmup started in background")

    yield


app = FastAPI(
    title="CareerOS API",
    version="3.0.0",
    description="AI-Powered Job Search & Application Tracking Platform",
    lifespan=lifespan,
)

# Allow specific origins; add your Vercel URL after deploying
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Append Vercel/production frontend URL if set
_frontend_url = os.environ.get("FRONTEND_URL", "")
if _frontend_url:
    ALLOWED_ORIGINS.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(jobs.router)
app.include_router(cover_letters.router)
app.include_router(applications.router)
app.include_router(analytics.router)


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url.path}: {exc}")
    return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "3.0.0"}

