import logging
import io

import PyPDF2
from docx import Document

from models.candidate import CandidateProfile
from services.groq_client import GroqClient

logger = logging.getLogger(__name__)

LOCATION_OPTIONS = [
    "Remote",
    "United States",
    "Canada",
    "United Kingdom",
    "Germany",
    "France",
    "Australia",
    "India",
    "Singapore",
    "Japan",
    "Netherlands",
    "Spain",
    "Ireland",
    "Sweden",
    "Denmark",
    "Norway",
    "Brazil",
    "Mexico",
    "Switzerland",
    "Italy",
    "Poland",
    "South Korea",
]

RESUME_PARSE_SYSTEM_PROMPT = f"""You are a resume parsing AI. Extract structured information from resumes.
Return ONLY valid JSON with this exact schema:
{{
  "skills": ["skill1", "skill2"],
  "titles": ["current or most recent title"],
  "experience_years": 0.0,
  "education": ["degree, institution"],
  "preferences": {{
    "desired_titles": [],
    "remote": true,
    "locations": [],
    "min_salary": 0
  }}
}}

Parse everything you can from the resume text. For preferences, infer from context if not explicitly stated.
For the "locations" field, ONLY use values from this approved list: {', '.join(LOCATION_OPTIONS)}.
If a location in the resume doesn't exactly match, use the closest city from the list. Use "Remote" if the role is remote.
Do NOT include markdown formatting or code blocks."""


def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        return text.strip()
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        raise ValueError(f"Failed to parse PDF: {e}")


def extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        doc = Document(io.BytesIO(file_bytes))
        text = "\n".join(p.text for p in doc.paragraphs)
        return text.strip()
    except Exception as e:
        logger.error(f"DOCX extraction failed: {e}")
        raise ValueError(f"Failed to parse DOCX: {e}")


def extract_text_from_txt(content: str) -> str:
    return content.strip()


class ResumeParser:
    def __init__(self):
        self.groq = GroqClient()

    def extract_text(self, file_bytes: bytes, filename: str) -> str:
        ext = filename.lower().split(".")[-1]
        if ext == "pdf":
            return extract_text_from_pdf(file_bytes)
        elif ext == "docx":
            return extract_text_from_docx(file_bytes)
        elif ext == "txt":
            return extract_text_from_txt(file_bytes.decode("utf-8", errors="ignore"))
        else:
            raise ValueError(f"Unsupported file type: .{ext}")

    def parse(self, resume_text: str) -> CandidateProfile:
        data = self.groq.structured_output(
            system_prompt=RESUME_PARSE_SYSTEM_PROMPT,
            user_prompt=f"Parse this resume:\n\n{resume_text}",
        )
        return CandidateProfile(**data)
