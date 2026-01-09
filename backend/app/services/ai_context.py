"""
AI Context Builder Service (FAZ 8.5.4)

AI hesap yapmaz, AI veriyi tekrar etmez, AI yorumlar, yönlendirir, fark ettirir.
Backend = matematik, AI = koç

Bu servis AI'ye gönderilecek context'i hazırlar.
Tüm hesaplamalar backend'de yapılır, AI sadece yorum yapar.
"""

from datetime import date, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.models import (
    UserGoals, UserProfile, DailyActivity, 
    MealLog, Meal, AIInteraction, AIAcceptance
)
from app.services.metabolism import get_full_calculations
from app.services.warnings import generate_daily_warnings


def build_ai_context(user_id: int, target_date: date, db: Session) -> dict:
    """
    AI için kullanıcı context'i oluşturur.
    
    📌 Hesap yok
    📌 Sadece backend'den gelen gerçek değerler
    
    Returns:
        dict: AI'ye gönderilecek structured context
    """
    
    # 1️⃣ HEDEFLER
    user_goals = db.query(UserGoals).filter(UserGoals.user_id == user_id).first()
    goals = {
        "calorie": user_goals.daily_calorie_target if user_goals else 2000,
        "protein": user_goals.daily_protein_target if user_goals else 100,
        "goal_type": user_goals.goal_type if user_goals else "koruma"
    }
    
    # 2️⃣ BUGÜNKÜ TÜKETİM
    today_logs = db.query(MealLog).filter(
        MealLog.user_id == user_id,
        MealLog.log_date == target_date
    ).all()
    
    today_data = {"calorie": 0, "protein": 0, "carbs": 0, "fat": 0}
    for log in today_logs:
        meal = db.query(Meal).filter(Meal.meal_id == log.meal_id).first()
        if meal:
            today_data["calorie"] += int(meal.calories * log.portion)
            today_data["protein"] += int(meal.protein_g * log.portion)
            today_data["carbs"] += int(meal.carbs_g * log.portion)
            today_data["fat"] += int(meal.fat_g * log.portion)
    
    # 3️⃣ AKTİVİTE VE METABOLİZMA
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    today_activity = db.query(DailyActivity).filter(
        DailyActivity.user_id == user_id,
        DailyActivity.activity_date == target_date
    ).first()
    
    activity = {"steps": 0, "level": "sedanter", "tdee": 2000, "bmr": 1600}
    
    if user_profile:
        steps = today_activity.steps if today_activity else 0
        calcs = get_full_calculations(
            weight_kg=user_profile.weight_kg,
            height_cm=user_profile.height_cm,
            birth_year=user_profile.birth_year,
            gender=user_profile.gender,
            steps=steps,
            goal_type=goals["goal_type"]
        )
        activity = {
            "steps": steps,
            "level": calcs["activity_level"],
            "tdee": calcs["tdee"],
            "bmr": calcs["bmr"]
        }
    
    # 4️⃣ HAFTALIK TREND (Son 7 gün)
    week_start = target_date - timedelta(days=6)
    
    weekly_logs = db.query(MealLog).filter(
        MealLog.user_id == user_id,
        MealLog.log_date >= week_start,
        MealLog.log_date <= target_date
    ).all()
    
    # Günlere göre grupla
    daily_totals = {}
    for log in weekly_logs:
        day_str = str(log.log_date)
        if day_str not in daily_totals:
            daily_totals[day_str] = {"calorie": 0, "protein": 0}
        
        meal = db.query(Meal).filter(Meal.meal_id == log.meal_id).first()
        if meal:
            daily_totals[day_str]["calorie"] += int(meal.calories * log.portion)
            daily_totals[day_str]["protein"] += int(meal.protein_g * log.portion)
    
    days_logged = len(daily_totals)
    avg_calorie = sum(d["calorie"] for d in daily_totals.values()) / days_logged if days_logged > 0 else 0
    avg_protein = sum(d["protein"] for d in daily_totals.values()) / days_logged if days_logged > 0 else 0
    
    weekly_trend = {
        "avg_calorie": int(avg_calorie),
        "avg_protein": int(avg_protein),
        "days_logged": days_logged
    }
    
    # 5️⃣ UYARILAR (8.5.3'ten)
    target_kcal = activity["tdee"] if goals["goal_type"] == "koruma" else goals["calorie"]
    protein_target = goals["protein"]
    
    warnings_list = generate_daily_warnings(
        target_kcal=target_kcal,
        consumed_kcal=today_data["calorie"],
        protein_target=protein_target,
        consumed_protein=today_data["protein"],
        steps=activity["steps"]
    )
    
    # Sadece warning type olanları al
    warning_messages = [w["message"] for w in warnings_list if w["type"] == "warning"]
    
    # 6️⃣ AI GEÇMİŞİ
    total_interactions = db.query(func.count(AIInteraction.id)).filter(
        AIInteraction.user_id == user_id
    ).scalar() or 0
    
    accepted_count = db.query(func.count(AIAcceptance.id)).filter(
        AIAcceptance.user_id == user_id
    ).scalar() or 0
    
    # En son öneri kabul edilmiş mi?
    last_interaction = db.query(AIInteraction).filter(
        AIInteraction.user_id == user_id
    ).order_by(AIInteraction.created_at.desc()).first()
    
    last_accepted = False
    if last_interaction:
        last_acceptance = db.query(AIAcceptance).filter(
            AIAcceptance.ai_interaction_id == last_interaction.id
        ).first()
        last_accepted = last_acceptance is not None
    
    ai_history = {
        "last_suggestion_accepted": last_accepted,
        "acceptance_rate": round(accepted_count / total_interactions, 2) if total_interactions > 0 else 0,
        "total_interactions": total_interactions
    }
    
    # 7️⃣ RETURN
    return {
        "goals": goals,
        "today": today_data,
        "activity": activity,
        "weekly_trend": weekly_trend,
        "warnings": warning_messages,
        "ai_history": ai_history
    }


def format_context_for_prompt(context: dict) -> str:
    """
    Context dict'ini AI prompt'u için metin formatına çevirir.
    AI hesaplama yapmaz, sadece bu verileri yorumlar.
    """
    
    goals = context["goals"]
    today = context["today"]
    activity = context["activity"]
    weekly = context["weekly_trend"]
    warnings = context["warnings"]
    ai_hist = context["ai_history"]
    
    # Kalan kalori hesabı (backend'de yapılıyor)
    remaining_cal = goals["calorie"] - today["calorie"]
    remaining_prot = goals["protein"] - today["protein"]
    
    text = f"""
📋 KULLANICI VERİLERİ (Backend hesaplamış, sen sadece yorumla):

🎯 Hedefler:
- Günlük kalori hedefi: {goals['calorie']} kcal
- Günlük protein hedefi: {goals['protein']}g
- Amaç: {goals['goal_type']}

📊 Bugünkü Durum:
- Tüketilen: {today['calorie']} kcal, {today['protein']}g protein
- Karbonhidrat: {today['carbs']}g, Yağ: {today['fat']}g
- Kalan kalori: {remaining_cal} kcal
- Kalan protein: {remaining_prot}g

🏃 Aktivite:
- Adım: {activity['steps']}
- Aktivite seviyesi: {activity['level']}
- TDEE: {activity['tdee']} kcal/gün
- BMR: {activity['bmr']} kcal/gün

📈 Haftalık Trend (son 7 gün):
- Ortalama kalori: {weekly['avg_calorie']} kcal
- Ortalama protein: {weekly['avg_protein']}g
- Kayıtlı gün sayısı: {weekly['days_logged']}/7

⚠️ Aktif Uyarılar:
{chr(10).join(['- ' + w for w in warnings]) if warnings else '- Yok'}

🤖 AI Geçmişi:
- Son öneri kabul edildi mi: {'Evet' if ai_hist['last_suggestion_accepted'] else 'Hayır'}
- Genel kabul oranı: %{int(ai_hist['acceptance_rate'] * 100)}
- Toplam etkileşim: {ai_hist['total_interactions']}
"""
    return text
