from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    DB_SERVER: str
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    DB_DRIVER: str = "ODBC Driver 18 for SQL Server"
    ENCRYPT: str = "yes"
    TRUST_SERVER_CERT: str = "yes"

    JWT_SECRET: str
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MIN: int = 1440

    OPENAI_API_KEY: str = ""
    AI_TIMEOUT_SECONDS: int = 30

    AI_RATE_LIMIT_PER_MINUTE: int = 10
    AI_RATE_LIMIT_PER_HOUR: int = 50

    ENV: str = "development"
    DEBUG: bool = True

    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def is_production(self) -> bool:
        return self.ENV == "production"

    @property
    def allowed_origins(self) -> list:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
