"""EcoSphere backend configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings — all values from .env or environment."""

    SECRET_KEY: str = "change-me"
    DATABASE_URL: str = "sqlite:///./ecosphere.db"
    CORS_ORIGINS: str = "http://localhost:5173"
    TOKEN_EXPIRE_MINUTES: int = 30
    # Algorithm for JWT signing
    JWT_ALGORITHM: str = "HS256"

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
