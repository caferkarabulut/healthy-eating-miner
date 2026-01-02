from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date

from app.db.session import get_db
from app.db.models import MealLog
from app.core.security import get_current_user_id

router = APIRouter(prefix="/logs", tags=["logs"])

@router.post("/")
def add_log(
    meal_id: int,
    portion: float = 1.0,
    log_date: date = date.today(),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    log = MealLog(
        user_id=user_id,
        meal_id=meal_id,
        portion=portion,
        log_date=log_date
    )
    db.add(log)
    db.commit()
    return {"ok": True}

@router.get("/")
def get_logs(
    log_date: date,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    logs = db.query(MealLog).filter(
        MealLog.user_id == user_id,
        MealLog.log_date == log_date
    ).all()

    return logs


@router.delete("/{log_id}")
def delete_log(
    log_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Öğün kaydını sil"""
    log = db.query(MealLog).filter(
        MealLog.id == log_id,
        MealLog.user_id == user_id
    ).first()
    
    if log:
        db.delete(log)
        db.commit()
        return {"ok": True}
    
    return {"ok": False, "error": "Log bulunamadı"}
