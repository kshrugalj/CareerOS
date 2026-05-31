from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    firebase_service_account_path: str = ""
    firebase_project_id: str = ""
    firebase_web_api_key: str = ""
    groq_api_key: str = ""
    groq_model: str = "llama-4-maverick"
    max_jobs_per_run: int = 100
    score_threshold: float = 0.70
    remote_only: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
