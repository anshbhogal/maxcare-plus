from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    PII_ENCRYPTION_KEY: str

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Service Discovery (Point to internal mount)
    @property
    def SYMPTOM_CHECKER_URL(self) -> str:
        import os
        port = os.getenv("PORT", "8000")
        return f"http://localhost:{port}/ai-service"

    # Email SMTP Settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@maxcare.local"
    EMAILS_ENABLED: bool = False

    APP_ENV: str = "development"
    CORS_ORIGINS: str = "http://localhost:5173,https://maxcare-plus-frontend.onrender.com"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
