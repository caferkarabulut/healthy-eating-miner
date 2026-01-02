from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import statistics

from app.db.session import get_db
from app.db.models import MealLog, Meal, UserGoals, AIInteraction, AIAcceptance
from app.core.security import get_current_user_id

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/progress")
def get_user_progress(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Kullanıcının AI öncesi ve sonrası gelişimini analiz et"""
    
    # Kullanıcı hedeflerini al
    goals = db.query(UserGoals).filter(UserGoals.user_id == user_id).first()
    if not goals:
        return {"error": "Hedef bulunamadı"}
    
    # İlk AI etkileşim tarihini bul
    first_ai = db.query(AIInteraction).filter(
        AIInteraction.user_id == user_id
    ).order_by(AIInteraction.created_at.asc()).first()
    
    if not first_ai:
        return {
            "error": "Henüz AI kullanılmamış",
            "protein": {},
            "calorie_stability": {},
            "ai_effect": {}
        }
    
    ai_start_date = first_ai.created_at.date()
    
    # Tüm logları çek
    all_logs = db.query(MealLog).filter(MealLog.user_id == user_id).all()
    
    # Logları before/after'a ayır
    before_logs = [log for log in all_logs if log.log_date < ai_start_date]
    after_logs = [log for log in all_logs if log.log_date >= ai_start_date]
    
    # Helper: Günlük toplamları hesapla
    def calculate_daily_stats(logs):
        from collections import defaultdict
        daily_data = defaultdict(lambda: {"protein": 0, "calories": 0})
        
        for log in logs:
            meal = db.query(Meal).filter(Meal.meal_id == log.meal_id).first()
            if meal:
                daily_data[log.log_date]["protein"] += meal.protein_g * log.portion
                daily_data[log.log_date]["calories"] += meal.calories * log.portion
        
        return daily_data
    
    before_daily = calculate_daily_stats(before_logs)
    after_daily = calculate_daily_stats(after_logs)
    
    # Metrik 1: Protein Uyumu
    def calc_protein_compliance(daily_data):
        if not daily_data:
            return 0.0
        ratios = [day["protein"] / goals.daily_protein_target 
                  for day in daily_data.values() if goals.daily_protein_target > 0]
        return statistics.mean(ratios) if ratios else 0.0
    
    protein_before = calc_protein_compliance(before_daily)
    protein_after = calc_protein_compliance(after_daily)
    protein_delta = protein_after - protein_before
    
    # Metrik 2: Kalori Stabilitesi (ortalama sapma)
    def calc_calorie_stability(daily_data):
        if not daily_data:
            return 0.0
        deviations = [abs(day["calories"] - goals.daily_calorie_target) 
                      for day in daily_data.values()]
        return statistics.mean(deviations) if deviations else 0.0
    
    cal_stab_before = calc_calorie_stability(before_daily)
    cal_stab_after = calc_calorie_stability(after_daily)
    
    # Metrik 3: AI Etkisi (kabul edilen günler vs diğerleri)
    accepted_dates = set()
    acceptances = db.query(AIAcceptance).filter(AIAcceptance.user_id == user_id).all()
    for acc in acceptances:
        # Acceptance tarihini bul (kabul edilen log'dan)
        log = db.query(MealLog).filter(
            MealLog.user_id == user_id,
            MealLog.meal_id == acc.meal_id
        ).order_by(MealLog.log_date.desc()).first()
        if log:
            accepted_dates.add(log.log_date)
    
    # After logs'u ikiye ayır
    accepted_days_data = {d: v for d, v in after_daily.items() if d in accepted_dates}
    other_days_data = {d: v for d, v in after_daily.items() if d not in accepted_dates}
    
    accepted_protein = calc_protein_compliance(accepted_days_data)
    other_protein = calc_protein_compliance(other_days_data)
    
    return {
        "protein": {
            "before": round(protein_before, 2),
            "after": round(protein_after, 2),
            "delta": round(protein_delta, 2),
            "change_pct": f"+{int(protein_delta * 100)}%" if protein_delta > 0 else f"{int(protein_delta * 100)}%"
        },
        "calorie_stability": {
            "before": int(cal_stab_before),
            "after": int(cal_stab_after),
            "improvement": int(cal_stab_before - cal_stab_after)
        },
        "ai_effect": {
            "accepted_days_protein": round(accepted_protein, 2),
            "other_days_protein": round(other_protein, 2),
            "accepted_count": len(accepted_dates),
            "other_count": len(other_days_data)
        }
    }
