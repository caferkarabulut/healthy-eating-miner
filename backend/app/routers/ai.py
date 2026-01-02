from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import json

from app.db.session import get_db
from app.db.models import Meal, MealLog, FavoriteMeal, AIInteraction, AIAcceptance
from app.core.security import get_current_user_id
from app.core.config import settings

router = APIRouter(prefix="/ai", tags=["ai"])


class ChatRequest(BaseModel):
    user_message: str
    weekly_calories: List[float] = []
    weekly_protein: List[float] = []
    favorites: List[str] = []


class ChatResponse(BaseModel):
    reply: str
    suggested_meals: List[str] = []
    interaction_id: Optional[int] = None


class AcceptRequest(BaseModel):
    ai_interaction_id: int
    meal_id: int


@router.post("/chat", response_model=ChatResponse)
def ai_chat(
    req: ChatRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    # Tüm öğünleri al
    meals = db.query(Meal).limit(50).all()
    meals_dict = {m.meal_name: m.meal_id for m in meals}
    meals_summary = "\n".join([
        f"- {m.meal_name}: {m.calories} kcal, {m.protein_g}g protein"
        for m in meals
    ])
    
    # Geçmiş kabul edilen öğünleri al (geri besleme)
    from sqlalchemy import func
    past_acceptances = db.query(
        AIAcceptance.meal_id,
        func.count(AIAcceptance.id).label("count")
    ).filter(
        AIAcceptance.user_id == user_id
    ).group_by(
        AIAcceptance.meal_id
    ).order_by(
        func.count(AIAcceptance.id).desc()
    ).limit(5).all()
    
    accepted_meals = []
    for meal_id, count in past_acceptances:
        meal = db.query(Meal).filter(Meal.meal_id == meal_id).first()
        if meal:
            accepted_meals.append(f"{meal.meal_name} ({count} kez)")
    
    # Kullanıcı hedeflerini al
    from app.db.models import UserGoals, UserProfile, DailyActivity
    from app.services.metabolism import get_full_calculations
    from datetime import date
    
    user_goals = db.query(UserGoals).filter(UserGoals.user_id == user_id).first()
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    
    # Bugünkü aktivite ve TDEE
    today = date.today()
    today_activity = db.query(DailyActivity).filter(
        DailyActivity.user_id == user_id,
        DailyActivity.activity_date == today
    ).first()
    
    # Profile context oluştur
    profile_context = ""
    if user_profile:
        steps = today_activity.steps if today_activity else 0
        goal_type = user_goals.goal_type if user_goals else "koruma"
        
        calcs = get_full_calculations(
            weight_kg=user_profile.weight_kg,
            height_cm=user_profile.height_cm,
            birth_year=user_profile.birth_year,
            gender=user_profile.gender,
            steps=steps,
            goal_type=goal_type
        )
        
        # Bugünkü kalori tüketimi hesapla
        from app.db.models import MealLog, Meal as MealModel
        today_logs = db.query(MealLog).filter(
            MealLog.user_id == user_id,
            MealLog.log_date == today
        ).all()
        
        today_calories = 0
        for log in today_logs:
            meal = db.query(MealModel).filter(MealModel.meal_id == log.meal_id).first()
            if meal:
                today_calories += meal.calories * log.portion
        
        remaining_calories = calcs["target_calories"] - today_calories
        remaining_pct = (remaining_calories / calcs["target_calories"] * 100) if calcs["target_calories"] > 0 else 0
        
        profile_context = f"""
📋 Kullanıcı Profili:
- Boy: {user_profile.height_cm} cm
- Kilo: {user_profile.weight_kg} kg
- Yaş: {2026 - user_profile.birth_year}
- Cinsiyet: {'Erkek' if user_profile.gender == 'male' else 'Kadın'}

🔥 Metabolizma:
- BMR: {calcs['bmr']} kcal/gün
- Bugünkü adım: {steps}
- Aktivite seviyesi: {calcs['activity_level']}
- TDEE: {calcs['tdee']} kcal/gün
- Günlük hedef: {calcs['target_calories']} kcal

📊 Bugünkü Durum:
- Tüketilen: {today_calories} kcal
- Kalan: {remaining_calories} kcal (%{remaining_pct:.0f})
- Protein hedefi: {calcs['target_protein']}g
"""
    
    # AI Context Engine: Son günlerin analizi
    context_insights = []
    
    if user_goals:
        goal_info = f"""
Kullanıcı hedefleri:
- Günlük kalori hedefi: {user_goals.daily_calorie_target} kcal
- Günlük protein hedefi: {user_goals.daily_protein_target}g
- Amaç: {user_goals.goal_type}"""
        
        # Son 7 gün kalori/protein analizi
        weekly_cal = req.weekly_calories or []
        weekly_prot = req.weekly_protein or []
        
        if weekly_cal:
            avg_cal = sum(weekly_cal) / len([c for c in weekly_cal if c > 0]) if any(c > 0 for c in weekly_cal) else 0
            avg_prot = sum(weekly_prot) / len([p for p in weekly_prot if p > 0]) if any(p > 0 for p in weekly_prot) else 0
            
            # Kalori hedef karşılaştırması
            cal_ratio = avg_cal / user_goals.daily_calorie_target if user_goals.daily_calorie_target > 0 else 0
            prot_ratio = avg_prot / user_goals.daily_protein_target if user_goals.daily_protein_target > 0 else 0
            
            if cal_ratio > 1.1:
                context_insights.append(f"Kullanıcı son günlerde kalori hedefini %{int((cal_ratio-1)*100)} aşıyor.")
            elif cal_ratio < 0.8 and avg_cal > 0:
                context_insights.append(f"Kullanıcı kalori hedefinin altında, %{int(cal_ratio*100)} oranında.")
            
            if prot_ratio < 0.7 and avg_prot > 0:
                context_insights.append(f"Kullanıcı son günlerde protein hedefinin ALTINDA (%{int(prot_ratio*100)}). Protein önerisi önemli!")
            elif prot_ratio >= 0.9:
                context_insights.append("Proteine ulaşma başarılı.")
        
        # Hedefe göre özel yönlendirme
        if user_goals.goal_type == "kilo_verme":
            context_insights.append("Kullanıcı kilo vermek istiyor. Düşük kalorili ama protein açısından zengin öğünler öner.")
        elif user_goals.goal_type == "kilo_alma":
            context_insights.append("Kullanıcı kilo almak istiyor. Yüksek kalorili ve proteinli öğünler öner.")
        else:
            context_insights.append("Kullanıcı kilosunu korumak istiyor. Dengeli öğünler öner.")
    else:
        goal_info = "Kullanıcı henüz hedef belirlememiş."
    
    # AI kabul oranı
    total_interactions = db.query(func.count(AIInteraction.id)).filter(
        AIInteraction.user_id == user_id
    ).scalar() or 0
    
    accepted_count = db.query(func.count(AIAcceptance.id)).filter(
        AIAcceptance.user_id == user_id
    ).scalar() or 0
    
    if total_interactions > 0:
        acceptance_rate = accepted_count / total_interactions
        if acceptance_rate > 0.6:
            context_insights.append(f"Kullanıcı AI önerilerini genellikle kabul ediyor (%{int(acceptance_rate*100)}). Benzer öğünler öner.")
    
    insights_text = "\n".join([f"- {i}" for i in context_insights]) if context_insights else "Yeterli veri yok."
    
    # System prompt
    system_prompt = """You are a Turkish nutrition assistant with deep knowledge of the user.
Use the given data and user insights to suggest personalized meals.
Always respond in Turkish.
Do not invent nutritional values - only use meals from the provided list.
If suggesting meals, include exact meal names from the list.
Prioritize meals similar to what the user has accepted before.
Consider the user's goals and recent performance when suggesting meals.
If the user is below protein target, prioritize high-protein meals.
If the user is above calorie target and wants to lose weight, suggest lower calorie options."""

    # User context
    user_context = f"""
Kullanıcı mesajı: {req.user_message}

{profile_context}

{goal_info}

📊 Kullanıcı Analizi:
{insights_text}

Son 7 gün kalori: {req.weekly_calories}
Son 7 gün protein: {req.weekly_protein}
Favori öğünler: {', '.join(req.favorites) if req.favorites else 'Yok'}
Geçmişte kabul ettiği AI önerileri: {', '.join(accepted_meals) if accepted_meals else 'Henüz yok'}

Mevcut öğün listesi:
{meals_summary}
"""

    try:
        import openai
        
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_context}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        reply = response.choices[0].message.content
        
        # Önerilen öğünleri bul
        suggested = []
        suggested_ids = []
        for m in meals:
            if m.meal_name.lower() in reply.lower():
                suggested.append(m.meal_name)
                suggested_ids.append(m.meal_id)
        
        suggested = suggested[:5]
        suggested_ids = suggested_ids[:5]
        
        # AI Interaction'ı DB'ye kaydet
        interaction = AIInteraction(
            user_id=user_id,
            prompt_text=req.user_message,
            response_text=reply[:500],  # İlk 500 karakter
            suggested_meal_ids=json.dumps(suggested_ids)
        )
        db.add(interaction)
        db.commit()
        db.refresh(interaction)
        
        return ChatResponse(
            reply=reply,
            suggested_meals=suggested,
            interaction_id=interaction.id
        )
        
    except Exception as e:
        return ChatResponse(
            reply=f"AI servisi şu anda kullanılamıyor. Hata: {str(e)}",
            suggested_meals=[],
            interaction_id=None
        )


@router.post("/accept")
def accept_suggestion(
    req: AcceptRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """AI önerisinin kabul edildiğini kaydet"""
    acceptance = AIAcceptance(
        ai_interaction_id=req.ai_interaction_id,
        user_id=user_id,
        meal_id=req.meal_id
    )
    db.add(acceptance)
    db.commit()
    
    return {"ok": True}


@router.get("/stats")
def get_ai_stats(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """AI kabul oranı istatistikleri"""
    from sqlalchemy import func
    
    # Toplam AI etkileşimi
    total_interactions = db.query(func.count(AIInteraction.id)).filter(
        AIInteraction.user_id == user_id
    ).scalar() or 0
    
    # Kabul edilen öneri sayısı
    accepted_count = db.query(func.count(AIAcceptance.id)).filter(
        AIAcceptance.user_id == user_id
    ).scalar() or 0
    
    # Kabul oranı
    acceptance_rate = accepted_count / total_interactions if total_interactions > 0 else 0
    
    return {
        "total_interactions": total_interactions,
        "accepted_count": accepted_count,
        "acceptance_rate": round(acceptance_rate, 2)
    }


@router.get("/top-meals")
def get_top_ai_meals(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """En çok kabul edilen AI öğünleri"""
    from sqlalchemy import func
    
    # meal_id bazında gruplayıp say
    results = db.query(
        AIAcceptance.meal_id,
        func.count(AIAcceptance.id).label("count")
    ).filter(
        AIAcceptance.user_id == user_id
    ).group_by(
        AIAcceptance.meal_id
    ).order_by(
        func.count(AIAcceptance.id).desc()
    ).limit(5).all()
    
    # Öğün isimlerini al
    top_meals = []
    for meal_id, count in results:
        meal = db.query(Meal).filter(Meal.meal_id == meal_id).first()
        if meal:
            top_meals.append({
                "meal_name": meal.meal_name,
                "count": count
            })
    
    return top_meals
