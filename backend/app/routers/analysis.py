from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import statistics

from app.db.session import get_db
from app.db.models import MealLog, Meal, UserGoals, AIInteraction, AIAcceptance
from app.core.security import get_current_user_id

router = APIRouter(prefix="/analysis", tags=["analysis"])

# Sabitler
MIN_DAYS_FOR_ANALYSIS = 3  # Minimum gün sayısı
PROTEIN_CAP = 1.5  # Protein oranı tavanı


@router.get("/progress")
def get_user_progress(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Kullanıcının AI öncesi ve sonrası gelişimini analiz et (normalize edilmiş)"""
    
    # Kullanıcı hedeflerini al
    goals = db.query(UserGoals).filter(UserGoals.user_id == user_id).first()
    if not goals or goals.daily_protein_target <= 0 or goals.daily_calorie_target <= 0:
        return {"error": "Geçerli hedef bulunamadı"}
    
    # İlk AI etkileşim tarihini bul
    first_ai = db.query(AIInteraction).filter(
        AIInteraction.user_id == user_id
    ).order_by(AIInteraction.created_at.asc()).first()
    
    if not first_ai:
        return {
            "error": "Henüz AI kullanılmamış",
            "protein": {},
            "calorie_stability": {},
            "ai_effect": {},
            "metadata": {}
        }
    
    ai_start_date = first_ai.created_at.date()
    
    # Tüm logları çek
    all_logs = db.query(MealLog).filter(MealLog.user_id == user_id).all()
    
    # Helper: Günlük toplamları hesapla (sadece en az 1 öğün olan günler)
    def calculate_daily_stats(logs):
        from collections import defaultdict
        daily_data = defaultdict(lambda: {"protein": 0, "calories": 0, "meal_count": 0})
        
        for log in logs:
            meal = db.query(Meal).filter(Meal.meal_id == log.meal_id).first()
            if meal:
                daily_data[log.log_date]["protein"] += meal.protein_g * log.portion
                daily_data[log.log_date]["calories"] += meal.calories * log.portion
                daily_data[log.log_date]["meal_count"] += 1
        
        # Sadece en az 1 öğün olan günleri döndür
        return {d: v for d, v in daily_data.items() if v["meal_count"] >= 1}
    
    # Logları before/after'a ayır
    before_logs = [log for log in all_logs if log.log_date < ai_start_date]
    after_logs = [log for log in all_logs if log.log_date >= ai_start_date]
    
    before_daily = calculate_daily_stats(before_logs)
    after_daily = calculate_daily_stats(after_logs)
    
    # Metrik 1: Protein Uyumu (normalize, cap 1.5)
    def calc_protein_compliance(daily_data):
        if len(daily_data) < MIN_DAYS_FOR_ANALYSIS:
            return None
        ratios = [
            min(day["protein"] / goals.daily_protein_target, PROTEIN_CAP)
            for day in daily_data.values()
        ]
        return statistics.mean(ratios) if ratios else None
    
    protein_before = calc_protein_compliance(before_daily)
    protein_after = calc_protein_compliance(after_daily)
    
    if protein_before is not None and protein_after is not None:
        protein_delta = protein_after - protein_before
        protein_result = {
            "before": round(protein_before, 2),
            "after": round(protein_after, 2),
            "delta": round(protein_delta, 2),
            "change_pct": f"+{int(protein_delta * 100)}%" if protein_delta > 0 else f"{int(protein_delta * 100)}%"
        }
    else:
        protein_result = {
            "before": round(protein_before, 2) if protein_before else 0,
            "after": round(protein_after, 2) if protein_after else 0,
            "delta": 0,
            "change_pct": "N/A",
            "note": f"En az {MIN_DAYS_FOR_ANALYSIS} gün veri gerekli"
        }
    
    # Metrik 2: Kalori Stabilitesi (ortalama mutlak sapma, min gün kontrolü)
    def calc_calorie_stability(daily_data):
        if len(daily_data) < MIN_DAYS_FOR_ANALYSIS:
            return None
        deviations = [
            abs(day["calories"] - goals.daily_calorie_target)
            for day in daily_data.values()
        ]
        return statistics.mean(deviations) if deviations else None
    
    cal_stab_before = calc_calorie_stability(before_daily)
    cal_stab_after = calc_calorie_stability(after_daily)
    
    if cal_stab_before is not None and cal_stab_after is not None:
        improvement = cal_stab_before - cal_stab_after
        cal_result = {
            "before": int(cal_stab_before),
            "after": int(cal_stab_after),
            "improvement": int(improvement)
        }
    else:
        cal_result = {
            "before": int(cal_stab_before) if cal_stab_before else 0,
            "after": int(cal_stab_after) if cal_stab_after else 0,
            "improvement": 0,
            "note": f"En az {MIN_DAYS_FOR_ANALYSIS} gün veri gerekli"
        }
    
    # Metrik 3: AI Etkisi (adil karşılaştırma - günlük ortalama)
    accepted_dates = set()
    acceptances = db.query(AIAcceptance).filter(AIAcceptance.user_id == user_id).all()
    for acc in acceptances:
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
    
    ai_effect_result = {
        "accepted_days_protein": round(accepted_protein, 2) if accepted_protein else 0,
        "other_days_protein": round(other_protein, 2) if other_protein else 0,
        "accepted_count": len(accepted_days_data),
        "other_count": len(other_days_data)
    }
    
    # Metadata
    metadata = {
        "ai_start_date": ai_start_date.isoformat(),
        "before_days": len(before_daily),
        "after_days": len(after_daily),
        "min_days_required": MIN_DAYS_FOR_ANALYSIS,
        "protein_cap": PROTEIN_CAP
    }
    
    return {
        "protein": protein_result,
        "calorie_stability": cal_result,
        "ai_effect": ai_effect_result,
        "metadata": metadata
    }
