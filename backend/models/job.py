from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Job(BaseModel):
    id: Optional[str] = None
    title: str
    company: str
    location: str = ""
    apply_url: str
    careers_url: str = ""
    source: str = ""
    ats_provider: str = ""
    verified_company_link: bool = True
    description: str = ""
    score: float = 0.0
    score_rationale: str = ""
    created_at: Optional[datetime] = None


class JobMatchRequest(BaseModel):
    job_title: str
    job_description: str
    resume_text: str = ""


class JobMatchResponse(BaseModel):
    score: float
    matched_skills: list[str]
    missing_skills: list[str]
    reasoning: str


class CoverLetterRequest(BaseModel):
    company: str
    job_title: str
    job_description: str
    resume_text: str
    style: str = "formal"


class CoverLetterResponse(BaseModel):
    cover_letter: str
    version: int = 1
