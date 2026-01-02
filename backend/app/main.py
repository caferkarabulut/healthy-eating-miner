# FastAPI Main Application
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine
from app.db.base import Base
from app.routers.auth import router as auth_router
from app.routers.logs import router as logs_router
from app.routers.favorites import router as favorites_router
from app.routers.meals import router as meals_router
from app.routers.ai import router as ai_router
from app.routers.user import router as user_router
from app.routers.analysis import router as analysis_router
from app.routers.profile import router as profile_router

app = FastAPI(title="Healthy Eating API")

# CORS - Next.js frontend için
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# tabloları oluştur (ilk çalıştırmada)
Base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(logs_router)
app.include_router(favorites_router)
app.include_router(meals_router)
app.include_router(ai_router)
app.include_router(user_router)
app.include_router(analysis_router)
app.include_router(profile_router)

@app.get("/")
def root():
    return {"ok": True, "service": "Healthy Eating API"}
