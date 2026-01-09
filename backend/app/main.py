# FastAPI Main Application
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import logging
import time

from app.db.session import engine, SessionLocal
from app.db.base import Base
from app.routers.auth import router as auth_router
from app.routers.logs import router as logs_router
from app.routers.favorites import router as favorites_router
from app.routers.meals import router as meals_router
from app.routers.ai import router as ai_router
from app.routers.user import router as user_router
from app.routers.analysis import router as analysis_router
from app.routers.profile import router as profile_router
from app.routers.progress import router as progress_router
from app.routers.engagement import router as engagement_router
from app.core.config import settings

# Logging setup
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Healthy Eating API",
    debug=settings.DEBUG
)

# CORS - config'den al
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    
    # Log only in debug mode or for errors
    if settings.DEBUG or response.status_code >= 400:
        logger.info(
            f"{request.method} {request.url.path} - {response.status_code} - {process_time:.3f}s"
        )
    
    return response


# Global Exception Handler - FAZ 10.4.4
from fastapi.responses import JSONResponse
from app.db.models import ErrorLog

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Tüm beklenmeyen hataları yakala, logla ve kullanıcıya düzgün mesaj döndür"""
    error_message = str(exc)[:1000]  # Max 1000 karakter
    endpoint = f"{request.method} {request.url.path}"
    
    # Error log'a kaydet
    try:
        db = SessionLocal()
        error_log = ErrorLog(
            user_id=None,  # JWT'den çıkarılabilir ama basit tutalım
            endpoint=endpoint,
            error_message=error_message
        )
        db.add(error_log)
        db.commit()
        db.close()
    except:
        pass  # Log kaydetme başarısız olsa bile kullanıcıya cevap dön
    
    logger.error(f"Unhandled exception at {endpoint}: {error_message}")
    
    return JSONResponse(
        status_code=500,
        content={"error": True, "message": "Bir hata oluştu. Lütfen tekrar deneyin."}
    )


# ⚠️ ALEMBIC MIGRATIONS - create_all kaldırıldı
# Tablo değişiklikleri için: alembic revision --autogenerate -m "description"
# Uygulamak için: alembic upgrade head

app.include_router(auth_router)
app.include_router(logs_router)
app.include_router(favorites_router)
app.include_router(meals_router)
app.include_router(ai_router)
app.include_router(user_router)
app.include_router(analysis_router)
app.include_router(profile_router)
app.include_router(progress_router)
app.include_router(engagement_router)


@app.get("/")
def root():
    return {"ok": True, "service": "Healthy Eating API"}


@app.get("/health")
def health_check():
    """
    Health check endpoint.
    Returns: ok / degraded based on DB connection.
    """
    from sqlalchemy import text
    
    status = "ok"
    db_status = "ok"
    
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception as e:
        db_status = "error"
        status = "degraded"
        logger.error(f"Health check DB error: {e}")
    
    
    return {
        "status": status,
        "timestamp": datetime.now().isoformat(),
        "environment": settings.ENV,
        "services": {
            "database": db_status,
            "api": "ok"
        }
    }


@app.get("/health/db")
def db_health_check():
    """
    Dedicated database health check for Azure SQL.
    Returns: {"db": "ok"} if connection successful.
    """
    from app.db.session import test_db_connection
    
    try:
        test_db_connection()
        return {
            "db": "ok",
            "server": settings.DB_SERVER,
            "database": settings.DB_NAME,
            "message": "Azure SQL connection successful"
        }
    except Exception as e:
        logger.error(f"Azure SQL connection failed: {e}")
        return {
            "db": "error",
            "server": settings.DB_SERVER,
            "database": settings.DB_NAME,
            "error": str(e)
        }

