import logging
import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from google.cloud import firestore
from pydantic import BaseModel

from api.dependencies import verify_firebase_token
from models.job import Job, JobMatchRequest, JobMatchResponse
from services.job_matching import JobMatcher
from utils.firebase import get_firebase_db
from utils.config import settings
from jobs.ats_connectors import JobDiscoveryService
from services.groq_client import GroqClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/jobs", tags=["Jobs"])
matcher = JobMatcher()
discovery = JobDiscoveryService()
groq_client = GroqClient()


def _keyword_score(job_title: str, job_description: str, resume_words: set) -> float:
    """Fast keyword-based match score (no AI calls). Title weighted 3x."""
    if not resume_words:
        return 0.0
    title = job_title.lower()
    description = job_description.lower()
    text = f"{title} {title} {title} {description}"
    matches = sum(1 for w in resume_words if w in text)
    return min(round(matches / max(len(resume_words), 1) * 1.5, 2), 1.0)


def _title_match_score(desired_title: str, job_title: str) -> float:
    """Score 0.0–1.0 for how well a job title matches the desired title query."""
    d = desired_title.lower().strip()
    j = job_title.lower().strip()

    if not d:
        return 1.0
    if d == j:
        return 1.0
    if d in j:
        return 0.95
    if j in d:
        return 0.85

    d_words = d.split()
    j_words = j.split()

    matches = 0
    for dw in d_words:
        for jw in j_words:
            if dw in jw or jw in dw:
                matches += 1
                break

    if not d_words:
        return 1.0

    ratio = matches / len(d_words)
    if ratio >= 0.5:
        return 0.5 + (ratio * 0.4)
    return 0.0


def _is_us_location(location: str) -> bool:
    """Check if a job location is US-based."""
    if not location:
        return True  # assume US if no location given (remote-first)
    loc = location.lower()
    # Check non-US indicators FIRST to avoid matching ", ca" in "canada"
    non_us = [
        "uk", "united kingdom", "london", "germany", "berlin", "france",
        "paris", "australia", "sydney", "melbourne", "india", "bangalore",
        "mumbai", "canada", "toronto", "vancouver", "netherlands", "amsterdam",
        "sweden", "stockholm", "denmark", "copenhagen", "norway", "oslo",
        "switzerland", "zurich", "singapore", "japan", "tokyo", "spain",
        "madrid", "barcelona", "italy", "milan", "ireland", "dublin",
        "brazil", "sao paulo", "poland", "warsaw", "south korea", "seoul",
    ]
    if any(nu in loc for nu in non_us):
        return False
    # Then check US indicators
    us_indicators = [
        "united states", "usa", "u.s.", "u.s.a",
        ", ca,", ", ny,", ", tx,", ", wa,", ", il,", ", fl,", ", ma,", ", ga,",
        ", or,", ", co,", ", va,", ", nc,", ", az,", ", md,", ", mn,", ", pa,",
        ", nj,", ", oh,", ", mi,", ", ut,", ", wi,", ", mo,", ", in,", ", tn,",
        "new york", "san francisco", "seattle", "chicago", "austin",
        "los angeles", "boston", "denver", "portland", "miami",
        "atlanta", "palo alto", "mountain view", "menlo park",
    ]
    if any(indicator in loc for indicator in us_indicators):
        return True
    # Detect US by state-only location like "CA", "NY,", "CA, USA"
    us_state_abbr = [
        " ca", " ny", " tx", " wa", " il", " fl", " ma", " ga",
        " or", " co", " va", " nc", " az", " md", " mn", " pa",
        " nj", " oh", " mi", " ut", " wi", " mo", " in", " tn",
    ]
    if any(abbr in f" {loc.replace(',', ' ')}" for abbr in us_state_abbr):
        return True
    return True  # default assume US if no non-US indicator found


class JobSearchRequest(BaseModel):
    skills: list[str]
    title: str


@router.get("/discover")
async def discover_jobs(
    user_id: str = Depends(verify_firebase_token),
    limit: int = Query(default=50, le=100),
    offset: Optional[str] = None,
):
    db = get_firebase_db()
    query = db.collection("jobs").order_by("created_at", direction=firestore.Query.DESCENDING).limit(limit)

    if offset:
        last_doc = db.collection("jobs").document(offset).get()
        if last_doc.exists:
            query = query.start_after(last_doc)

    docs = query.stream()
    jobs = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        jobs.append(data)

    return {"jobs": jobs, "total": len(jobs)}


@router.post("/discover")
async def search_jobs(
    request: JobSearchRequest,
    user_id: str = Depends(verify_firebase_token),
):
    jobs = await discovery.discover_for_skills(request.skills, request.title)
    desired_title = request.title.strip().lower()

    # Optionally score against user's resume if they have one
    db = get_firebase_db()
    candidate_doc = db.collection("candidates").document(user_id).get()
    resume_text = candidate_doc.to_dict().get("resume_text", "") if candidate_doc.exists else ""
    resume_words = set()
    if resume_text:
        resume_words = set(re.findall(r"[a-zA-Z][a-zA-Z0-9+#.]+", resume_text.lower()))

    # Groq batch title matching
    job_titles = [j.title for j in jobs]
    groq_scores = {}
    if desired_title and job_titles:
        try:
            matches = groq_client.batch_match_titles(desired_title, job_titles)
            for m in matches:
                groq_scores[m["title"]] = m.get("score", 0.0)
        except Exception as e:
            logger.warning("Groq matching failed: %s — using keyword fallback", e)

    result_jobs = []
    for job in jobs:
        job_dict = job.model_dump(mode="json")
        if groq_scores:
            job_dict["title_match_score"] = groq_scores.get(job.title, 0.0)
        else:
            job_dict["title_match_score"] = _title_match_score(desired_title, job.title)
        if resume_words:
            job_dict["score"] = _keyword_score(job.title, job.description, resume_words)
        result_jobs.append(job_dict)

    # Filter to US-based jobs only
    result_jobs = [j for j in result_jobs if _is_us_location(j.get("location", ""))]

    # Filter out jobs with low title relevance
    MIN_TITLE_SCORE = 0.3
    result_jobs = [j for j in result_jobs if j["title_match_score"] >= MIN_TITLE_SCORE]

    # Sort: title match first, then keyword score
    result_jobs.sort(
        key=lambda j: (j["title_match_score"], j.get("score", 0)),
        reverse=True,
    )

    logger.info(
        "Search: title=%r skills=%s → %d jobs after Groq title filter (from %d raw)",
        desired_title,
        request.skills,
        len(result_jobs),
        len(jobs),
    )

    return {"jobs": result_jobs, "total": len(result_jobs)}


@router.get("/matches")
async def get_matched_jobs(
    user_id: str = Depends(verify_firebase_token),
    min_score: float = Query(default=0.0, ge=0.0, le=1.0),
    limit: int = Query(default=50, le=100),
):
    db = get_firebase_db()
    docs = (
        db.collection("jobs")
        .where("score", ">=", min_score)
        .order_by("score", direction=firestore.Query.DESCENDING)
        .limit(limit)
        .stream()
    )
    jobs = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        jobs.append(data)

    return {"jobs": jobs, "total": len(jobs)}


@router.post("/match", response_model=JobMatchResponse)
async def match_job(
    request: JobMatchRequest,
    user_id: str = Depends(verify_firebase_token),
):
    # Auto-fetch resume from Firestore if not provided
    resume_text = request.resume_text
    if not resume_text:
        try:
            db = get_firebase_db()
            doc = db.collection("candidates").document(user_id).get()
            if doc.exists:
                resume_text = doc.to_dict().get("resume_text", "")
        except Exception:
            pass

    result = matcher.match(
        job_title=request.job_title,
        job_description=request.job_description,
        resume_text=resume_text,
    )
    return result


@router.get("/sources")
async def get_available_sources():
    return {
        "sources": [
            {"name": "Greenhouse", "type": "ats"},
            {"name": "Lever", "type": "ats"},
            {"name": "Ashby", "type": "ats"},
        ]
    }
