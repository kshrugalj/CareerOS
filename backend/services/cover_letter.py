import logging

from services.groq_client import GroqClient

logger = logging.getLogger(__name__)

COVER_LETTER_SYSTEM_PROMPT = """You are an expert cover letter writer. Generate personalized, ATS-friendly cover letters.
Rules:
- 250-500 words
- Professional, personalized tone
- Reference specific skills from the resume that match the job
- Mention the company by name
- No placeholders like [Your Name]
- Ready to copy-paste into an application form
- No markdown formatting"""


class CoverLetterGenerator:
    def __init__(self):
        self.groq = GroqClient()

    def generate(
        self,
        company: str,
        job_title: str,
        job_description: str,
        resume_text: str,
        style: str = "formal",
    ) -> str:
        style_guide = {
            "formal": "Write in a professional, formal business letter tone.",
            "conversational": "Write in a warm, conversational tone while remaining professional.",
        }.get(style, "Write in a professional, formal business letter tone.")

        user_prompt = f"""Company: {company}
Job Title: {job_title}

Job Description:
{job_description}

Resume:
{resume_text}

Style: {style_guide}

Generate a personalized cover letter for this position."""

        return self.groq.chat_completion(
            system_prompt=COVER_LETTER_SYSTEM_PROMPT,
            user_prompt=user_prompt,
        )
