"""
FAZ 10.4 - Streak & Engagement Router
Günlük streak, haftalık özet, akıllı öneri
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from typing import Optional, List

from app.db.session import get_db
from app.db.models import UserStreak, MealLog, Meal, UserGoals
from app.core.security import get_current_user_id

router = APIRouter(prefix="/engagement", tags=["engagement"])


@router.get("/streak")
def get_streak(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Kullanıcının günlük streak bilgisini getir"""
    streak = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()
    
    if not streak:
        # İlk kez streak kontrolü, oluştur
        streak = UserStreak(user_id=user_id, current_streak=0, max_streak=0)
        db.add(streak)
        db.commit()
        db.refresh(streak)
    
    # Streak durumunu kontrol et ve güncelle
    today = date.today()
    yesterday = today - timedelta(days=1)
    
    # Bugün log var mı?
    today_has_log = db.query(MealLog).filter(
        MealLog.user_id == user_id,
        MealLog.log_date == today
    ).first() is not None
    
    # Streak mesajı
    if today_has_log:
        message = f"🔥 {streak.current_streak} gündür düzenlisin!"
        status = "active"
    elif streak.last_logged_date == yesterday:
        message = "Bugün henüz bir şey girmedin. Streak'ini koru!"
        status = "warning"
    elif streak.last_logged_date and streak.last_logged_date < yesterday:
        message = f"Streak kırıldı! Son giriş: {streak.last_logged_date}"
        status = "broken"
    else:
        message = "Bugün ilk öğününü ekle ve streak başlat!"
        status = "new"
    
    return {
        "current_streak": streak.current_streak,
        "max_streak": streak.max_streak,
        "last_logged_date": streak.last_logged_date.isoformat() if streak.last_logged_date else None,
        "today_has_log": today_has_log,
        "message": message,
        "status": status
    }


@router.post("/streak/update")
def update_streak(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Öğün eklendiğinde streak güncelle (logs.py'dan çağrılır)"""
    today = date.today()
    yesterday = today - timedelta(days=1)
    
    streak = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()
    
    if not streak:
        streak = UserStreak(user_id=user_id, current_streak=1, max_streak=1, last_logged_date=today)
        db.add(streak)
    else:
        if streak.last_logged_date == today:
            # Bugün zaten güncellendi
            pass
        elif streak.last_logged_date == yesterday:
            # Streak devam ediyor
            streak.current_streak += 1
            if streak.current_streak > streak.max_streak:
                streak.max_streak = streak.current_streak
        else:
            # Streak kırıldı, yeniden başla
            streak.current_streak = 1
        
        streak.last_logged_date = today
    
    db.commit()
    return {"ok": True, "current_streak": streak.current_streak}


@router.get("/weekly-summary")
def get_weekly_summary(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Son 7 günün özeti"""
    today = date.today()
    week_ago = today - timedelta(days=7)
    
    # Her gün için kalori ve protein topla
    daily_stats = []
    total_calories = 0
    total_protein = 0
    days_with_data = 0
    
    for i in range(7):
        day = today - timedelta(days=i)
        
        day_totals = db.query(
            func.sum(Meal.calories * MealLog.portion).label("calories"),
            func.sum(Meal.protein_g * MealLog.portion).label("protein")
        ).join(
            MealLog, Meal.meal_id == MealLog.meal_id
        ).filter(
            MealLog.user_id == user_id,
            MealLog.log_date == day
        ).first()
        
        cal = float(day_totals.calories or 0)
        prot = float(day_totals.protein or 0)
        
        if cal > 0:
            days_with_data += 1
            total_calories += cal
            total_protein += prot
        
        daily_stats.append({
            "date": day.isoformat(),
            "calories": round(cal, 1),
            "protein": round(prot, 1)
        })
    
    # Hedefleri al
    goals = db.query(UserGoals).filter(UserGoals.user_id == user_id).first()
    calorie_target = goals.daily_calorie_target if goals else 2000
    protein_target = goals.daily_protein_target if goals else 100
    
    # En iyi ve en kötü gün
    best_day = max(daily_stats, key=lambda x: x["protein"]) if daily_stats else None
    worst_day = min([d for d in daily_stats if d["calories"] > 0], key=lambda x: x["protein"], default=None)
    
    avg_calories = round(total_calories / days_with_data, 1) if days_with_data > 0 else 0
    avg_protein = round(total_protein / days_with_data, 1) if days_with_data > 0 else 0
    
    # Hedef tutma yüzdesi
    target_hit_days = sum(1 for d in daily_stats if d["calories"] >= calorie_target * 0.8 and d["calories"] <= calorie_target * 1.2)
    target_hit_pct = round((target_hit_days / 7) * 100, 1)
    
    return {
        "avg_calories": avg_calories,
        "avg_protein": avg_protein,
        "best_day": best_day,
        "worst_day": worst_day,
        "target_hit_pct": target_hit_pct,
        "days_with_data": days_with_data,
        "daily_stats": daily_stats
    }


@router.get("/meal-suggestions")
def get_meal_suggestions(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Kalan hedefe göre yemek önerisi (AI'sız, akıllı query)"""
    today = date.today()
    
    # Bugünkü tüketimi hesapla
    today_totals = db.query(
        func.sum(Meal.calories * MealLog.portion).label("calories"),
        func.sum(Meal.protein_g * MealLog.portion).label("protein")
    ).join(
        MealLog, Meal.meal_id == MealLog.meal_id
    ).filter(
        MealLog.user_id == user_id,
        MealLog.log_date == today
    ).first()
    
    consumed_cal = float(today_totals.calories or 0)
    consumed_prot = float(today_totals.protein or 0)
    
    # Hedefleri al
    goals = db.query(UserGoals).filter(UserGoals.user_id == user_id).first()
    calorie_target = goals.daily_calorie_target if goals else 2000
    protein_target = goals.daily_protein_target if goals else 100
    
    remaining_cal = max(0, calorie_target - consumed_cal)
    remaining_prot = max(0, protein_target - consumed_prot)
    
    # Akıllı sorgu: Kalan kaloriye sığan, protein'i yüksek yemekler
    suggestions = db.query(Meal).filter(
        Meal.calories <= remaining_cal,
        Meal.protein_g >= remaining_prot * 0.2  # En az %20 protein karşılasın
    ).order_by(
        Meal.protein_g.desc()
    ).limit(5).all()
    
    return {
        "remaining_calories": round(remaining_cal, 1),
        "remaining_protein": round(remaining_prot, 1),
        "suggestions": [
            {
                "meal_id": m.meal_id,
                "meal_name": m.meal_name,
                "calories": m.calories,
                "protein_g": m.protein_g,
                "meal_type": m.meal_type
            }
            for m in suggestions
        ]
    }
