import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import verify_firebase_token
from models.job import CoverLetterRequest, CoverLetterResponse
from services.cover_letter import CoverLetterGenerator
from utils.firebase import get_firebase_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cover-letters", tags=["Cover Letters"])
generator = CoverLetterGenerator()


@router.post("/generate", response_model=CoverLetterResponse)
async def generate_cover_letter(
    request: CoverLetterRequest,
    user_id: str = Depends(verify_firebase_token),
):
    try:
        letter = generator.generate(
            company=request.company,
            job_title=request.job_title,
            job_description=request.job_description,
            resume_text=request.resume_text,
            style=request.style,
        )
    except Exception as e:
        logger.error(f"Cover letter generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate cover letter")

    return CoverLetterResponse(cover_letter=letter, version=1)
