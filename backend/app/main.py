# FastAPI Main Application
from fastapi import FastAPI
from app.db.session import engine
from app.db.base import Base
from app.routers.auth import router as auth_router
from app.routers.logs import router as logs_router
from app.routers.favorites import router as favorites_router
from app.routers.meals import router as meals_router
from app.routers.ai import router as ai_router
from app.routers.user import router as user_router

app = FastAPI(title="Healthy Eating API")

# tabloları oluştur (ilk çalıştırmada)
Base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(logs_router)
app.include_router(favorites_router)
app.include_router(meals_router)
app.include_router(ai_router)
app.include_router(user_router)

@app.get("/")
def root():
    return {"ok": True, "service": "Healthy Eating API"}
