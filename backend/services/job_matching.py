import json
import logging

from models.job import JobMatchResponse
from services.groq_client import GroqClient

logger = logging.getLogger(__name__)

MATCHING_SYSTEM_PROMPT = """You are an AI job matching system. Analyze a candidate's resume against a job posting.
Return ONLY valid JSON with this exact schema:
{
  "score": 0.0,
  "matched_skills": ["skill1"],
  "missing_skills": ["skill2"],
  "reasoning": "Brief explanation of the score"
}

Score rules:
- 0.00-1.00 scale
- Consider skills match, experience years, education fit, and title alignment
- 0.90+ means excellent fit
- 0.70-0.89 means good fit
- 0.50-0.69 means moderate fit
- Below 0.50 means poor fit
Do NOT include markdown formatting or code blocks."""


class JobMatcher:
    def __init__(self):
        self.groq = GroqClient()

    def match(
        self,
        job_title: str,
        job_description: str,
        resume_text: str,
    ) -> JobMatchResponse:
        user_prompt = f"""Job Title: {job_title}

Job Description:
{job_description}

Resume:
{resume_text}

Analyze the match between this candidate and this job. Return score, matched_skills, missing_skills, and reasoning."""

        data = self.groq.structured_output(
            system_prompt=MATCHING_SYSTEM_PROMPT,
            user_prompt=user_prompt,
        )
        return JobMatchResponse(**data)
