# Database Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from urllib.parse import quote_plus
from app.core.config import settings

def build_conn_str() -> str:
    odbc = (
        f"DRIVER={{{settings.DB_DRIVER}}};"
        f"SERVER={settings.DB_SERVER};"
        f"DATABASE={settings.DB_NAME};"
        f"UID={settings.DB_USER};"
        f"PWD={settings.DB_PASSWORD};"
        f"Encrypt={settings.ENCRYPT};"
        f"TrustServerCertificate={settings.TRUST_SERVER_CERT};"
    )
    return "mssql+pyodbc:///?odbc_connect=" + quote_plus(odbc)

engine = create_engine(build_conn_str(), pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
