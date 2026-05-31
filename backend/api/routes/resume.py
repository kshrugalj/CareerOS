import logging

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from google.cloud import firestore

from api.dependencies import verify_firebase_token
from models.candidate import ResumeUploadResponse, CandidateProfile
from services.resume_parser import ResumeParser
from utils.firebase import get_firebase_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/resume", tags=["Resume"])
parser = ResumeParser()


@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str = Depends(verify_firebase_token),
):
    if file.filename is None:
        raise HTTPException(status_code=400, detail="No filename provided")

    file_bytes = await file.read()

    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    try:
        resume_text = parser.extract_text(file_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    profile = parser.parse(resume_text)

    try:
        db = get_firebase_db()
        db.collection("candidates").document(user_id).set({
            "profile": profile.model_dump(),
            "resume_text": resume_text,
            "updated_at": firestore.SERVER_TIMESTAMP,
        })
    except Exception as e:
        logger.error(f"Firebase save failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to save resume")

    return ResumeUploadResponse(resume_text=resume_text, profile=profile)


@router.get("")
async def get_resume(user_id: str = Depends(verify_firebase_token)):
    db = get_firebase_db()
    doc = db.collection("candidates").document(user_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="No resume found")
    data = doc.to_dict()
    return ResumeUploadResponse(
        resume_text=data.get("resume_text", ""),
        profile=CandidateProfile(**data.get("profile", {})),
    )
