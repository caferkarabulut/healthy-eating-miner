from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
import logging

from app.db.session import get_db
from app.db.models import MealLog
from app.core.security import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/logs", tags=["logs"])

@router.post("/")
def add_log(
    meal_id: int,
    portion: float = 1.0,
    log_date: date = date.today(),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Yemek logu ekle (transaction-safe)"""
    try:
        log = MealLog(
            user_id=user_id,
            meal_id=meal_id,
            portion=portion,
            log_date=log_date
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        logger.info(f"Meal log added: user={user_id}, meal={meal_id}, date={log_date}")
        return {"ok": True, "log_id": log.id}
    except Exception as e:
        db.rollback()
        logger.error(f"Meal log failed: user={user_id}, meal={meal_id}, error={str(e)}")
        raise HTTPException(status_code=500, detail="Öğün kaydedilemedi")

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
