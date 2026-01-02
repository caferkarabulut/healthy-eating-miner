# Configuration Settings
from pydantic_settings import BaseSettings

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
    ACCESS_TOKEN_EXPIRE_MIN: int = 60
    
    OPENAI_API_KEY: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
