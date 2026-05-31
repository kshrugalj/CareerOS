import json
import logging
import time
from typing import Optional

from groq import Groq

from utils.config import settings

logger = logging.getLogger(__name__)

RATE_LIMIT_COOLDOWN = 3600  # skip Groq for 1 hour after a 429


def _mark_rate_limited(error: Exception) -> None:
    """Check if error is a 429 and set cooldown."""
    msg = str(error)
    if "429" in msg or "rate limit" in msg.lower() or "too many requests" in msg.lower():
        until = time.time() + RATE_LIMIT_COOLDOWN
        GroqClient._rate_limited_until = max(GroqClient._rate_limited_until, until)
        remaining = RATE_LIMIT_COOLDOWN
        import re
        m = re.search(r"in (\d+h)?(\d+m)?(\d+s)?", msg)
        if m:
            h = int(m.group(1).rstrip("h")) if m.group(1) else 0
            m2 = int(m.group(2).rstrip("m")) if m.group(2) else 0
            s = int(m.group(3).rstrip("s")) if m.group(3) else 0
            remaining = h * 3600 + m2 * 60 + s
            GroqClient._rate_limited_until = time.time() + remaining + 60
        logger.warning("Groq rate limited — skipping for %.0f seconds", remaining + 60)


class GroqClient:
    _rate_limited_until: float = 0.0

    def __init__(self):
        self.client = Groq(
            api_key=settings.groq_api_key,
            timeout=10.0,
            max_retries=0,
        )
        self.model = settings.groq_model

    def _is_rate_limited(self) -> bool:
        return time.time() < self._rate_limited_until

    def chat_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        response_format: Optional[type] = None,
        temperature: float = 0.7,
    ) -> str:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }

        if response_format:
            kwargs["response_format"] = response_format

        try:
            response = self.client.chat.completions.create(**kwargs)
            return response.choices[0].message.content or ""
        except Exception as e:
            _mark_rate_limited(e)
            logger.error(f"Groq API error: {e}")
            raise

    def structured_output(self, system_prompt: str, user_prompt: str) -> dict:
        response = self.chat_completion(system_prompt, user_prompt)
        response = response.strip()
        if response.startswith("```json"):
            response = response[7:]
        if response.startswith("```"):
            response = response[3:]
        if response.endswith("```"):
            response = response[:-3]
        return json.loads(response.strip())

    def batch_match_titles(
        self, desired_title: str, job_titles: list[str]
    ) -> list[dict]:
        """Batch classify job titles against a desired title using Groq.

        Falls back to keyword matching if Groq is unavailable.
        Splits into chunks of 200 to avoid token limits.
        """
        if not job_titles:
            return []

        if self._is_rate_limited():
            logger.info("Groq rate limited — skipping batch title matching")
            return []

        system_prompt = (
            "You are a job title matcher. Given a user's desired role and a list of "
            "job titles, determine how relevant each title is to the user's intent. "
            "Consider seniority level, domain, and role equivalence. "
            "Examples: 'intern' matches 'Summer Associate' and 'Graduate Trainee'; "
            "'senior engineer' matches 'Staff Engineer' and 'Lead Developer'; "
            "'product manager' matches 'Product Owner' and 'Technical Product Manager'. "
            "Return a JSON array of objects with keys: title, score (0.0-1.0), "
            "match ('yes'|'partial'|'no'), reason."
        )

        CHUNK = 200
        all_results = []

        for i in range(0, len(job_titles), CHUNK):
            chunk = job_titles[i : i + CHUNK]
            user_prompt = f"Desired title: {desired_title}\nJob titles: {chunk}"
            try:
                result = self.structured_output(system_prompt, user_prompt)
                if isinstance(result, list):
                    all_results.extend(result)
            except Exception as e:
                logger.debug("Groq batch chunk failed (%d-%d): %s", i, i + len(chunk), e)
                if self._is_rate_limited():
                    logger.warning("Groq rate limited — stopping early after chunk %d", i // CHUNK + 1)
                    break

        # If no results and we haven't exhausted the cooldown check, skip remaining
        if not all_results and self._is_rate_limited():
            logger.info("Groq rate limited — all chunks skipped")

        if all_results:
            logger.info("Groq matched %d titles in %d chunks", len(all_results), (len(job_titles) + CHUNK - 1) // CHUNK)
            return all_results

        logger.warning("Groq batch title matching all chunks failed — using keyword fallback")
        return []
