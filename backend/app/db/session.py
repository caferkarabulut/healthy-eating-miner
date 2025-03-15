import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

connection_string = (
    f"mssql+pyodbc://{settings.DB_USER}:{settings.DB_PASSWORD}"
    f"@{settings.DB_SERVER}/{settings.DB_NAME}"
    f"?driver={settings.DB_DRIVER.replace(' ', '+')}"
    f"&Encrypt={settings.ENCRYPT}"
    f"&TrustServerCertificate={settings.TRUST_SERVER_CERT}"
)

engine = create_engine(
    connection_string,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_db_connection() -> bool:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return True
