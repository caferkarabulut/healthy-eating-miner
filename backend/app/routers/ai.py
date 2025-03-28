from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import json
from datetime import date

from app.db.session import get_db
from app.db.models import Meal, MealLog, FavoriteMeal, AIInteraction, AIAcceptance
from app.core.security import get_current_user_id
from app.core.config import settings
from app.core.rate_limiter import ai_rate_limiter
from app.services.ai_context import build_ai_context, format_context_for_prompt

router = APIRouter(prefix="/ai", tags=["ai"])


class ChatRequest(BaseModel):
    user_message: str


class MealSuggestion(BaseModel):
    title: str
    reason: str
    meal_id: Optional[int] = None


class StructuredAIResponse(BaseModel):
    summary: str
    warnings: List[str] = []
    meal_suggestions: List[MealSuggestion] = []
    tips: List[str] = []
    interaction_id: Optional[int] = None
    raw_context: Optional[dict] = None


class AcceptRequest(BaseModel):
    ai_interaction_id: int
    meal_id: int


SYSTEM_PROMPT = """You are a nutrition coach.
The data below has been calculated by the backend.
Do not generate new numbers.

You can:
- Interpret the user's current status
- Point out unhealthy habits
- Provide actionable suggestions
- Motivate and support

You cannot:
- Calculate calories
- Suggest specific protein grams
- Do math
- Change the given numbers

You MUST respond in the following JSON format:
{
  "summary": "1-2 sentence comment about today's status",
  "warnings": ["Point of attention 1", "Point of attention 2"],
  "meal_suggestions": [
    {"title": "Meal name", "reason": "Why you suggest this meal"}
  ],
  "tips": ["Practical tip 1", "Practical tip 2"]
}

Rules:
- summary is always required
- warnings can be empty if everything looks fine
- meal_suggestions should be at most 3
- tips should be at most 3
- For meal suggestions, ONLY pick from the provided list
- Respond in English"""


@router.post("/chat", response_model=StructuredAIResponse)
def ai_chat(
    req: ChatRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    from sqlalchemy import func

    is_allowed, rate_limit_message = ai_rate_limiter.check_rate_limit(user_id)
    if not is_allowed:
        return StructuredAIResponse(
            summary=rate_limit_message,
            warnings=["AI service is temporarily unavailable."],
            meal_suggestions=[],
            tips=["Please wait a few minutes and try again."],
            interaction_id=None,
            raw_context=None
        )

    today = date.today()

    context = build_ai_context(user_id, today, db)
    context_text = format_context_for_prompt(context)

    from sqlalchemy import text
    meals = db.query(Meal).order_by(text("NEWID()")).limit(100).all()
    meals_dict = {m.meal_name: m.meal_id for m in meals}
    meals_summary = "\n".join([
        f"- {m.meal_name}: {m.calories} kcal, {m.protein_g}g protein"
        for m in meals
    ])

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
            accepted_meals.append(f"{meal.meal_name} ({count} times)")

    user_prompt = f"""
User message: {req.user_message}

{context_text}

Previously accepted AI suggestions: {', '.join(accepted_meals) if accepted_meals else 'None yet'}

Available meals (only suggest from this list):
{meals_summary}
"""

    try:
        import openai

        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=800,
            response_format={"type": "json_object"}
        )

        reply_text = response.choices[0].message.content

        try:
            ai_response = json.loads(reply_text)
        except json.JSONDecodeError:
            ai_response = {
                "summary": reply_text[:200],
                "warnings": [],
                "meal_suggestions": [],
                "tips": []
            }

        meal_suggestions = []
        for suggestion in ai_response.get("meal_suggestions", []):
            title = suggestion.get("title", "")
            reason = suggestion.get("reason", "")

            meal_id = None
            for meal_name, m_id in meals_dict.items():
                if meal_name.lower() in title.lower() or title.lower() in meal_name.lower():
                    meal_id = m_id
                    title = meal_name
                    break

            meal_suggestions.append(MealSuggestion(
                title=title,
                reason=reason,
                meal_id=meal_id
            ))

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
            raw_context=context
        )

    except Exception as e:
        return StructuredAIResponse(
            summary=f"AI service is currently unavailable. Error: {str(e)}",
            warnings=[],
            meal_suggestions=[],
            tips=[],
            interaction_id=None,
            raw_context=context
        )


@router.post("/accept")
def accept_suggestion(
    req: AcceptRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
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


@router.get("/top-meals")
def get_top_ai_meals(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
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


@router.get("/context")
def get_ai_context(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    today = date.today()
    context = build_ai_context(user_id, today, db)
    return context


WEEKLY_COACH_PROMPT = """You are a weekly nutrition coach.
Below is a user's 7-day performance summary.
All numbers are calculated by the backend, do not generate new ones.

Your task:
1. Tell them what they did well this week (praise)
2. Point out where they struggled (constructive critique)
3. Suggest 1 specific goal for next week

You MUST respond in the following JSON format:
{
  "praise": "What you did well this week...",
  "critique": "Where you struggled...",
  "next_week_goal": "One specific goal for next week",
  "motivation": "Short motivational message (1 sentence)"
}

Rules:
- Respond in English
- Be concise
- No number calculations, only commentary
- Friendly but professional"""


class WeeklyCoachResponse(BaseModel):
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
    from app.services.weekly_coach import get_weekly_summary, format_weekly_summary_for_ai

    is_allowed, rate_limit_message = ai_rate_limiter.check_rate_limit(user_id)
    if not is_allowed:
        today = date.today()
        summary = get_weekly_summary(user_id, today, db)
        return WeeklyCoachResponse(
            praise="AI rate limit exceeded. Please wait.",
            critique=rate_limit_message,
            next_week_goal="Try again later.",
            motivation="Patience is a virtue! 😊",
            weekly_summary=summary
        )

    today = date.today()
    summary = get_weekly_summary(user_id, today, db)
    summary_text = format_weekly_summary_for_ai(summary)

    try:
        import openai

        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

        response = client.chat.completions.create(
            model="gpt-4o-mini",
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
                "praise": "You logged your meals this week, that's great!",
                "critique": "Try to be more consistent with daily logging.",
                "next_week_goal": "Log at least one meal every day.",
                "motivation": "Small steps lead to big changes!"
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
            praise="You used the system this week!",
            critique=f"AI service is currently unavailable: {str(e)}",
            next_week_goal="Aim for consistent daily logging.",
            motivation="Every day is a fresh start!",
            weekly_summary=summary
        )


@router.get("/rate-limit-status")
def get_rate_limit_status(
    user_id: int = Depends(get_current_user_id)
):
    return ai_rate_limiter.get_remaining(user_id)
