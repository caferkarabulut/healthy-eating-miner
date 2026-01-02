# FastAPI Main Application
from fastapi import FastAPI
from app.db.session import engine
from app.db.base import Base
from app.routers.auth import router as auth_router
from app.routers.logs import router as logs_router
from app.routers.favorites import router as favorites_router

app = FastAPI(title="Healthy Eating API")

# tabloları oluştur (ilk çalıştırmada)
Base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(logs_router)
app.include_router(favorites_router)

@app.get("/")
def root():
    return {"ok": True, "service": "Healthy Eating API"}
