from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta
import logging

from app.db.session import get_db
from app.db.models import MealLog, UserStreak
from app.core.security import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/logs", tags=["logs"])


def update_user_streak(db: Session, user_id: int, log_date: date):
    """Streak güncelleme mantığı"""
    today = log_date
    yesterday = today - timedelta(days=1)
    
    streak = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()
    
    if not streak:
        streak = UserStreak(user_id=user_id, current_streak=1, max_streak=1, last_logged_date=today)
        db.add(streak)
    else:
        if streak.last_logged_date == today:
            # Bugün zaten güncellendi
            return streak
        elif streak.last_logged_date == yesterday:
            # Streak devam ediyor
            streak.current_streak += 1
        else:
            # Streak kırıldı veya ilk kez
            streak.current_streak = 1
        
        if streak.current_streak > streak.max_streak:
            streak.max_streak = streak.current_streak
        streak.last_logged_date = today
    
    db.commit()
    return streak


@router.post("")
def add_log(
    meal_id: int,
    portion: float = 1.0,
    log_date: date = date.today(),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Yemek logu ekle (transaction-safe, streak güncellemeli)"""
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
        
        # Streak güncelle
        streak = update_user_streak(db, user_id, log_date)
        
        logger.info(f"Meal log added: user={user_id}, meal={meal_id}, date={log_date}, streak={streak.current_streak}")
        return {"ok": True, "log_id": log.id, "streak": streak.current_streak}
    except Exception as e:
        db.rollback()
        logger.error(f"Meal log failed: user={user_id}, meal={meal_id}, error={str(e)}")
        raise HTTPException(status_code=500, detail="Öğün kaydedilemedi")

@router.get("")
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
