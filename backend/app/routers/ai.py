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
    
    # System prompt
    system_prompt = """You are a Turkish nutrition assistant. 
Use the given data to suggest meals logically.
Always respond in Turkish.
Do not invent nutritional values - only use meals from the provided list.
If suggesting meals, include exact meal names from the list."""

    # User context
    user_context = f"""
Kullanıcı mesajı: {req.user_message}

Son 7 gün kalori: {req.weekly_calories}
Son 7 gün protein: {req.weekly_protein}
Favori öğünler: {', '.join(req.favorites) if req.favorites else 'Yok'}

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
