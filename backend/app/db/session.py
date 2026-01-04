# Database Session - Azure SQL Ready
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from urllib.parse import quote_plus
from app.core.config import settings

def build_conn_str() -> str:
    """Build Azure SQL connection string via ODBC"""
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

# Azure SQL optimized engine
engine = create_engine(
    build_conn_str(),
    pool_pre_ping=True,
    pool_recycle=300,  # Recycle connections every 5 minutes for Azure
    pool_size=5,
    max_overflow=10
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency for FastAPI endpoints"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_db_connection() -> bool:
    """Test Azure SQL connection - raises exception if fails"""
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return True

