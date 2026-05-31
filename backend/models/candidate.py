from pydantic import BaseModel
from typing import Optional


class Preferences(BaseModel):
    desired_titles: list[str] = []
    remote: bool = True
    locations: list[str] = []
    min_salary: float = 0.0


class CandidateProfile(BaseModel):
    skills: list[str] = []
    titles: list[str] = []
    experience_years: float = 0.0
    education: list[str] = []
    preferences: Preferences = Preferences()


class ResumeUploadResponse(BaseModel):
    resume_text: str
    profile: CandidateProfile


class ResumeParseError(BaseModel):
    detail: str
