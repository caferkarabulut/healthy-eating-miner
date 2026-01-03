from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import json
from datetime import date

from app.db.session import get_db
from app.db.models import Meal, MealLog, FavoriteMeal, AIInteraction, AIAcceptance
from app.core.security import get_current_user_id
from app.core.config import settings
from app.services.ai_context import build_ai_context, format_context_for_prompt

router = APIRouter(prefix="/ai", tags=["ai"])


# ===== REQUEST/RESPONSE SCHEMAS =====

class ChatRequest(BaseModel):
    user_message: str


class MealSuggestion(BaseModel):
    title: str
    reason: str
    meal_id: Optional[int] = None


class StructuredAIResponse(BaseModel):
    """FAZ 8.5.4: Structured AI Response - artık free text yok"""
    summary: str
    warnings: List[str] = []
    meal_suggestions: List[MealSuggestion] = []
    tips: List[str] = []
    interaction_id: Optional[int] = None
    raw_context: Optional[dict] = None  # Debug için


class AcceptRequest(BaseModel):
    ai_interaction_id: int
    meal_id: int


# ===== AI SYSTEM PROMPT (FAZ 8.5.4 FELSEFESİ) =====

SYSTEM_PROMPT = """Sen bir beslenme koçusun.
Aşağıda verilen veriler backend tarafından hesaplanmıştır.
Kesinlikle yeni sayı üretme.

Yapabileceklerin:
- Kullanıcının durumunu yorumla
- Hatalı alışkanlıkları belirt
- Uygulanabilir öneriler sun
- Motive et ve destekle

Yapamayacakların:
- Kalori hesaplamak
- Protein gramı önermek
- Matematik yapmak
- Verilen sayıları değiştirmek

Yanıtını MUTLAKA aşağıdaki JSON formatında ver:
{
  "summary": "Bugünkü durumun hakkında 1-2 cümlelik yorum",
  "warnings": ["Dikkat edilmesi gereken nokta 1", "Dikkat edilmesi gereken nokta 2"],
  "meal_suggestions": [
    {"title": "Öğün adı", "reason": "Bu öğünü neden önerdiğin"}
  ],
  "tips": ["Pratik ipucu 1", "Pratik ipucu 2"]
}

Önemli kurallar:
- summary her zaman olmalı
- warnings boş olabilir (her şey yolundaysa)
- meal_suggestions en fazla 3 tane olsun
- tips en fazla 3 tane olsun
- Öğün önerilerinde MUTLAKA mevcut listeden seç
- Türkçe yanıt ver"""


# ===== MAIN CHAT ENDPOINT =====

@router.post("/chat", response_model=StructuredAIResponse)
def ai_chat(
    req: ChatRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    FAZ 8.5.4: AI Chat Endpoint
    
    AI hesap yapmaz, veriyi tekrar etmez.
    AI yorumlar, yönlendirir, fark ettirir.
    Backend = matematik, AI = koç
    """
    from sqlalchemy import func
    
    today = date.today()
    
    # 1️⃣ Build AI Context (tüm hesaplamalar burada)
    context = build_ai_context(user_id, today, db)
    context_text = format_context_for_prompt(context)
    
    # 2️⃣ Mevcut öğün listesini al (öneri için)
    meals = db.query(Meal).limit(50).all()
    meals_dict = {m.meal_name: m.meal_id for m in meals}
    meals_summary = "\n".join([
        f"- {m.meal_name}: {m.calories} kcal, {m.protein_g}g protein"
        for m in meals
    ])
    
    # 3️⃣ Geçmişte kabul edilen öğünleri al
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
    
    # 4️⃣ User prompt oluştur
    user_prompt = f"""
Kullanıcı mesajı: {req.user_message}

{context_text}

Geçmişte kabul ettiği AI önerileri: {', '.join(accepted_meals) if accepted_meals else 'Henüz yok'}

Mevcut öğün listesi (sadece buradan öner):
{meals_summary}
"""

    # 5️⃣ OpenAI API çağrısı
    try:
        import openai
        
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=800,
            response_format={"type": "json_object"}  # JSON mode
        )
        
        reply_text = response.choices[0].message.content
        
        # 6️⃣ Parse JSON response
        try:
            ai_response = json.loads(reply_text)
        except json.JSONDecodeError:
            # Fallback: AI JSON döndürmediyse
            ai_response = {
                "summary": reply_text[:200],
                "warnings": [],
                "meal_suggestions": [],
                "tips": []
            }
        
        # 7️⃣ Meal suggestions'a meal_id ekle
        meal_suggestions = []
        for suggestion in ai_response.get("meal_suggestions", []):
            title = suggestion.get("title", "")
            reason = suggestion.get("reason", "")
            
            # Öğün listesinde ara
            meal_id = None
            for meal_name, m_id in meals_dict.items():
                if meal_name.lower() in title.lower() or title.lower() in meal_name.lower():
                    meal_id = m_id
                    title = meal_name  # Doğru ismi kullan
                    break
            
            meal_suggestions.append(MealSuggestion(
                title=title,
                reason=reason,
                meal_id=meal_id
            ))
        
        # 8️⃣ AI Interaction'ı DB'ye kaydet
        suggested_ids = [s.meal_id for s in meal_suggestions if s.meal_id]
        
        interaction = AIInteraction(
            user_id=user_id,
            prompt_text=req.user_message,
            response_text=json.dumps(ai_response, ensure_ascii=False)[:500],
            suggested_meal_ids=json.dumps(suggested_ids)
        )
        db.add(interaction)
        db.commit()
        db.refresh(interaction)
        
        return StructuredAIResponse(
            summary=ai_response.get("summary", ""),
            warnings=ai_response.get("warnings", []),
            meal_suggestions=meal_suggestions,
            tips=ai_response.get("tips", []),
            interaction_id=interaction.id,
            raw_context=context  # Debug için
        )
        
    except Exception as e:
        return StructuredAIResponse(
            summary=f"AI servisi şu anda kullanılamıyor. Hata: {str(e)}",
            warnings=[],
            meal_suggestions=[],
            tips=[],
            interaction_id=None,
            raw_context=context
        )


# ===== ACCEPT ENDPOINT =====

@router.post("/accept")
def accept_suggestion(
    req: AcceptRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """AI önerisinin kabul edildiğini kaydet (yedim/favori)"""
    acceptance = AIAcceptance(
        ai_interaction_id=req.ai_interaction_id,
        user_id=user_id,
        meal_id=req.meal_id
    )
    db.add(acceptance)
    db.commit()
    
    return {"ok": True}


# ===== STATS ENDPOINT =====

@router.get("/stats")
def get_ai_stats(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """AI kabul oranı istatistikleri"""
    from sqlalchemy import func
    
    total_interactions = db.query(func.count(AIInteraction.id)).filter(
        AIInteraction.user_id == user_id
    ).scalar() or 0
    
    accepted_count = db.query(func.count(AIAcceptance.id)).filter(
        AIAcceptance.user_id == user_id
    ).scalar() or 0
    
    acceptance_rate = accepted_count / total_interactions if total_interactions > 0 else 0
    
    return {
        "total_interactions": total_interactions,
        "accepted_count": accepted_count,
        "acceptance_rate": round(acceptance_rate, 2)
    }


# ===== TOP MEALS ENDPOINT =====

@router.get("/top-meals")
def get_top_ai_meals(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """En çok kabul edilen AI öğünleri"""
    from sqlalchemy import func
    
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
    
    top_meals = []
    for meal_id, count in results:
        meal = db.query(Meal).filter(Meal.meal_id == meal_id).first()
        if meal:
            top_meals.append({
                "meal_name": meal.meal_name,
                "count": count
            })
    
    return top_meals


# ===== CONTEXT DEBUG ENDPOINT =====

@router.get("/context")
def get_ai_context(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Debug: AI context'ini göster"""
    today = date.today()
    context = build_ai_context(user_id, today, db)
    return context


# ===== WEEKLY COACH ENDPOINT (FAZ 9.2) =====

WEEKLY_COACH_PROMPT = """Sen bir haftalık beslenme koçusun.
Aşağıda bir kullanıcının son 7 günlük performans özeti var.
Backend tarafından hesaplanmış, kesinlikle sayı üretme.

Görevin:
1. Bu hafta neyi iyi yaptığını söyle (övgü)
2. Nerede zorlandığını belirt (yapıcı eleştiri)
3. Önümüzdeki hafta için 1 NET hedef öner

Yanıtını MUTLAKA aşağıdaki JSON formatında ver:
{
  "praise": "Bu hafta iyi yaptığın şey...",
  "critique": "Zorlandığın alan...",
  "next_week_goal": "Önümüzdeki hafta için tek bir somut hedef",
  "motivation": "Kısa motivasyon mesajı (1 cümle)"
}

Kurallar:
- Türkçe yanıt ver
- Kısa ve öz ol
- Sayı hesaplama, sadece yorum yap
- Samimi ama profesyonel ol"""


class WeeklyCoachResponse(BaseModel):
    """FAZ 9.2: Weekly Coach AI Response"""
    praise: str
    critique: str
    next_week_goal: str
    motivation: str
    weekly_summary: Optional[dict] = None


@router.get("/weekly-coach", response_model=WeeklyCoachResponse)
def get_weekly_coach(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    FAZ 9.2: Haftalık AI Koç Yorumu.
    
    Övgü + Eleştiri + 1 Net Öneri.
    Davranış yorumu, sayı yok.
    """
    from app.services.weekly_coach import get_weekly_summary, format_weekly_summary_for_ai
    
    today = date.today()
    summary = get_weekly_summary(user_id, today, db)
    summary_text = format_weekly_summary_for_ai(summary)
    
    try:
        import openai
        
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": WEEKLY_COACH_PROMPT},
                {"role": "user", "content": summary_text}
            ],
            temperature=0.7,
            max_tokens=400,
            response_format={"type": "json_object"}
        )
        
        reply_text = response.choices[0].message.content
        
        try:
            ai_response = json.loads(reply_text)
        except json.JSONDecodeError:
            ai_response = {
                "praise": "Bu hafta veri girişi yapmışsın, bu harika!",
                "critique": "Daha düzenli veri girişi yapabilirsin.",
                "next_week_goal": "Her gün en az bir öğün kaydet.",
                "motivation": "Küçük adımlar büyük değişimlere yol açar!"
            }
        
        return WeeklyCoachResponse(
            praise=ai_response.get("praise", ""),
            critique=ai_response.get("critique", ""),
            next_week_goal=ai_response.get("next_week_goal", ""),
            motivation=ai_response.get("motivation", ""),
            weekly_summary=summary
        )
        
    except Exception as e:
        return WeeklyCoachResponse(
            praise="Bu hafta sistemi kullandın!",
            critique=f"AI servisi şu anda kullanılamıyor: {str(e)}",
            next_week_goal="Düzenli veri girişi yapmayı hedefle.",
            motivation="Her gün küçük bir adım!",
            weekly_summary=summary
        )
