"""
Weekly Coach Service (FAZ 9.1)

Haftalık özet motoru - son 7 günün verilerini hesaplar.
Skor uydurma yok, tamamen mevcut veriden.
"""

from datetime import date, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.models import (
    UserGoals, UserProfile, DailyActivity, 
    MealLog, Meal, AIInteraction, AIAcceptance
)
from app.services.warnings import generate_daily_warnings
from app.services.metabolism import get_full_calculations


def get_weekly_summary(user_id: int, end_date: date, db: Session) -> dict:
    """
    Son 7 günün haftalık özetini hesaplar.
    
    Hesaplananlar:
    - Ortalama kalori
    - Ortalama protein
    - Hedefe uyum yüzdesi
    - Kaç gün veri girilmiş
    - Kaç gün AI önerisi kabul edilmiş
    - En sık gelen uyarı
    
    Returns:
        dict: Haftalık özet verileri
    """
    
    start_date = end_date - timedelta(days=6)
    
    # 1️⃣ Kullanıcı hedeflerini al
    user_goals = db.query(UserGoals).filter(UserGoals.user_id == user_id).first()
    calorie_target = user_goals.daily_calorie_target if user_goals else 2000
    protein_target = user_goals.daily_protein_target if user_goals else 100
    
    # 2️⃣ Haftalık yemek kayıtlarını al
    weekly_logs = db.query(MealLog).filter(
        MealLog.user_id == user_id,
        MealLog.log_date >= start_date,
        MealLog.log_date <= end_date
    ).all()
    
    # 3️⃣ Günlere göre grupla
    daily_totals = {}
    for log in weekly_logs:
        day_str = str(log.log_date)
        if day_str not in daily_totals:
            daily_totals[day_str] = {"calorie": 0, "protein": 0, "date": log.log_date}
        
        meal = db.query(Meal).filter(Meal.meal_id == log.meal_id).first()
        if meal:
            daily_totals[day_str]["calorie"] += int(meal.calories * log.portion)
            daily_totals[day_str]["protein"] += int(meal.protein_g * log.portion)
    
    days_logged = len(daily_totals)
    
    # 4️⃣ Ortalamalar
    if days_logged > 0:
        avg_calorie = sum(d["calorie"] for d in daily_totals.values()) / days_logged
        avg_protein = sum(d["protein"] for d in daily_totals.values()) / days_logged
    else:
        avg_calorie = 0
        avg_protein = 0
    
    # 5️⃣ Hedefe uyum yüzdesi (consistency score)
    # Kalori hedefinin ±15% içinde olan günlerin oranı
    days_on_target = 0
    for day_data in daily_totals.values():
        cal = day_data["calorie"]
        lower_bound = calorie_target * 0.85
        upper_bound = calorie_target * 1.15
        if lower_bound <= cal <= upper_bound:
            days_on_target += 1
    
    consistency_score = days_on_target / 7  # 7 günden kaçı hedefte
    
    # 6️⃣ Trendler
    calorie_values = [d["calorie"] for d in sorted(daily_totals.values(), key=lambda x: x["date"])]
    protein_values = [d["protein"] for d in sorted(daily_totals.values(), key=lambda x: x["date"])]
    
    calorie_trend = _calculate_trend(calorie_values)
    protein_trend = _calculate_trend(protein_values)
    
    # 7️⃣ AI kabul oranı (bu hafta)
    ai_interactions = db.query(AIInteraction).filter(
        AIInteraction.user_id == user_id,
        AIInteraction.created_at >= start_date
    ).all()
    
    ai_acceptances = db.query(AIAcceptance).filter(
        AIAcceptance.user_id == user_id,
        AIAcceptance.created_at >= start_date
    ).count()
    
    ai_interaction_count = len(ai_interactions)
    ai_acceptance_rate = ai_acceptances / ai_interaction_count if ai_interaction_count > 0 else 0
    
    # 8️⃣ En sık gelen uyarı
    # Her gün için uyarıları hesapla ve en çok tekrar edeni bul
    warning_counts = {}
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    
    for day_str, day_data in daily_totals.items():
        # Aktivite verisi
        activity = db.query(DailyActivity).filter(
            DailyActivity.user_id == user_id,
            DailyActivity.activity_date == day_data["date"]
        ).first()
        
        steps = activity.steps if activity else 0
        
        warnings = generate_daily_warnings(
            target_kcal=calorie_target,
            consumed_kcal=day_data["calorie"],
            protein_target=protein_target,
            consumed_protein=day_data["protein"],
            steps=steps
        )
        
        for warning in warnings:
            if warning["type"] == "warning":
                msg = warning["message"]
                # Basitleştirilmiş anahtar kelime
                key = _extract_warning_key(msg)
                warning_counts[key] = warning_counts.get(key, 0) + 1
    
    top_warning = max(warning_counts, key=warning_counts.get) if warning_counts else None
    
    # 9️⃣ Hafta aralığı formatı
    week_range = f"{start_date.day}–{end_date.day} {_get_turkish_month(end_date.month)}"
    
    return {
        "week_range": week_range,
        "start_date": str(start_date),
        "end_date": str(end_date),
        "days_logged": days_logged,
        "avg_calorie": int(avg_calorie),
        "avg_protein": int(avg_protein),
        "calorie_target": calorie_target,
        "protein_target": protein_target,
        "consistency_score": round(consistency_score, 2),
        "calorie_trend": calorie_trend,
        "protein_trend": protein_trend,
        "ai_interaction_count": ai_interaction_count,
        "ai_acceptance_rate": round(ai_acceptance_rate, 2),
        "top_warning": top_warning
    }


def _calculate_trend(values: List[int]) -> str:
    """
    Değerler listesinden trend hesapla.
    """
    if len(values) < 2:
        return "yetersiz_veri"
    
    first_half = values[:len(values)//2]
    second_half = values[len(values)//2:]
    
    if not first_half or not second_half:
        return "yetersiz_veri"
    
    first_avg = sum(first_half) / len(first_half)
    second_avg = sum(second_half) / len(second_half)
    
    diff_pct = (second_avg - first_avg) / first_avg * 100 if first_avg > 0 else 0
    
    if diff_pct > 10:
        return "artıyor"
    elif diff_pct < -10:
        return "azalıyor"
    elif abs(diff_pct) <= 10 and len(values) >= 3:
        # Dalgalanma kontrolü
        variance = sum((v - sum(values)/len(values))**2 for v in values) / len(values)
        avg = sum(values) / len(values)
        cv = (variance ** 0.5) / avg if avg > 0 else 0
        
        if cv > 0.3:
            return "düzensiz"
        return "stabil"
    else:
        return "stabil"


def _extract_warning_key(message: str) -> str:
    """
    Uyarı mesajından anahtar kelime çıkar.
    """
    if "protein" in message.lower():
        return "protein dengesiz"
    elif "kalori" in message.lower() and "aş" in message.lower():
        return "kalori fazlası"
    elif "kalori" in message.lower() and "az" in message.lower():
        return "kalori eksik"
    elif "hareket" in message.lower() or "adım" in message.lower():
        return "düşük aktivite"
    else:
        return "genel uyarı"


def _get_turkish_month(month: int) -> str:
    """
    Ay numarasından Türkçe ay adı.
    """
    months = {
        1: "Ocak", 2: "Şubat", 3: "Mart", 4: "Nisan",
        5: "Mayıs", 6: "Haziran", 7: "Temmuz", 8: "Ağustos",
        9: "Eylül", 10: "Ekim", 11: "Kasım", 12: "Aralık"
    }
    return months.get(month, "")


def format_weekly_summary_for_ai(summary: dict) -> str:
    """
    Haftalık özeti AI prompt'u için metin formatına çevirir.
    """
    return f"""
📊 HAFTALIK ÖZET ({summary['week_range']}):

📅 Veri Durumu:
- Kayıtlı gün sayısı: {summary['days_logged']}/7

🔥 Kalori:
- Ortalama: {summary['avg_calorie']} kcal/gün
- Hedef: {summary['calorie_target']} kcal/gün
- Trend: {summary['calorie_trend']}

💪 Protein:
- Ortalama: {summary['avg_protein']}g/gün
- Hedef: {summary['protein_target']}g/gün
- Trend: {summary['protein_trend']}

🎯 Performans:
- Hedefe uyum skoru: %{int(summary['consistency_score'] * 100)}
- AI öneri kabul oranı: %{int(summary['ai_acceptance_rate'] * 100)}

⚠️ En sık uyarı: {summary['top_warning'] or 'Yok'}
"""
