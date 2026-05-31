from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TimelineEvent(BaseModel):
    old_status: str
    new_status: str
    timestamp: datetime


class CoverLetterEntry(BaseModel):
    content: str
    style: str
    version: int
    created_at: datetime


class Application(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    job_id: str = ""
    job_title: str = ""
    company: str = ""
    job_url: str = ""
    status: str = "Saved"
    applied_at: Optional[datetime] = None
    last_updated: Optional[datetime] = None
    notes: str = ""
    recruiter_name: str = ""
    recruiter_email: str = ""
    interview_dates: list[datetime] = []
    timeline: list[TimelineEvent] = []
    cover_letters: list[CoverLetterEntry] = []


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    recruiter_name: Optional[str] = None
    recruiter_email: Optional[str] = None
    interview_dates: Optional[list[datetime]] = None


class ApplicationStatusCount(BaseModel):
    saved: int = 0
    applying: int = 0
    applied: int = 0
    oa_received: int = 0
    oa_completed: int = 0
    interview_scheduled: int = 0
    interviewing: int = 0
    final_round: int = 0
    offer: int = 0
    rejected: int = 0
    withdrawn: int = 0
