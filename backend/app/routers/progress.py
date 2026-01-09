"""
Daily Progress Tracker
Kalori ve protein hedef takibi + kural tabanlı uyarılar
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import Optional, List

from app.db.session import get_db
from app.db.models import MealLog, Meal, UserGoals
from app.core.security import get_current_user_id

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/daily")
def get_daily_progress(
    target_date: Optional[date] = Query(None, description="Tarih (default: bugün)"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    Günlük hedef vs alınan karşılaştırması.
    Progress bar ve uyarılar için kullanılır.
    """
    if target_date is None:
        target_date = date.today()
    
    # Kullanıcı hedeflerini al (yoksa default)
    goals = db.query(UserGoals).filter(UserGoals.user_id == user_id).first()
    calorie_target = goals.daily_calorie_target if goals else 2000
    protein_target = goals.daily_protein_target if goals else 100
    
    # Bugün yenilen toplamları hesapla
    daily_totals = db.query(
        func.sum(Meal.calories * MealLog.portion).label("total_calories"),
        func.sum(Meal.protein_g * MealLog.portion).label("total_protein"),
        func.sum(Meal.carbs_g * MealLog.portion).label("total_carbs"),
        func.sum(Meal.fat_g * MealLog.portion).label("total_fat")
    ).join(
        MealLog, Meal.meal_id == MealLog.meal_id
    ).filter(
        MealLog.user_id == user_id,
        MealLog.log_date == target_date
    ).first()
    
    # Değerleri al (None ise 0)
    calories_consumed = float(daily_totals.total_calories or 0)
    protein_consumed = float(daily_totals.total_protein or 0)
    carbs_consumed = float(daily_totals.total_carbs or 0)
    fat_consumed = float(daily_totals.total_fat or 0)
    
    # Yüzde hesapla
    calorie_pct = round((calories_consumed / calorie_target) * 100, 1) if calorie_target > 0 else 0
    protein_pct = round((protein_consumed / protein_target) * 100, 1) if protein_target > 0 else 0
    
    # Durum belirleme
    if calorie_pct > 120:
        status = "exceeded"
    elif calorie_pct < 50:
        status = "low"
    else:
        status = "on_track"
    
    # Kural tabanlı uyarılar
    warnings = generate_warnings(calorie_pct, protein_pct)
    
    return {
        "date": target_date.isoformat(),
        "calorie_target": calorie_target,
        "calorie_consumed": round(calories_consumed, 1),
        "calorie_pct": calorie_pct,
        "protein_target": protein_target,
        "protein_consumed": round(protein_consumed, 1),
        "protein_pct": protein_pct,
        "carbs_consumed": round(carbs_consumed, 1),
        "fat_consumed": round(fat_consumed, 1),
        "status": status,
        "warnings": warnings
    }


def generate_warnings(calorie_pct: float, protein_pct: float) -> List[dict]:
    """
    Kural tabanlı uyarı sistemi (AI'sız)
    """
    warnings = []
    
    # Protein kuralları
    if protein_pct < 50:
        warnings.append({
            "type": "warning",
            "icon": "🍗",
            "message": "Protein çok düşük! Yumurta, tavuk veya peynir ekle."
        })
    elif protein_pct < 70:
        warnings.append({
            "type": "info",
            "icon": "💪",
            "message": "Bugün protein biraz düşük kaldı."
        })
    
    # Kalori kuralları
    if calorie_pct > 130:
        warnings.append({
            "type": "danger",
            "icon": "⚠️",
            "message": "Kalori fazla kaçtı! Yarın dengele."
        })
    elif calorie_pct > 110:
        warnings.append({
            "type": "warning",
            "icon": "📊",
            "message": "Hedefe yaklaştın, dikkatli ol."
        })
    elif 90 <= calorie_pct <= 110 and protein_pct >= 80:
        warnings.append({
            "type": "success",
            "icon": "🎯",
            "message": "Harika gidiyorsun! Dengeli bir gün."
        })
    elif calorie_pct < 50:
        warnings.append({
            "type": "info",
            "icon": "🍽️",
            "message": "Bugün az yedin, öğün eklemeyi unutma."
        })
    
    return warnings
