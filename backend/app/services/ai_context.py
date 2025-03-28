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
    user_goals = db.query(UserGoals).filter(UserGoals.user_id == user_id).first()
    goals = {
        "calorie": user_goals.daily_calorie_target if user_goals else 2000,
        "protein": user_goals.daily_protein_target if user_goals else 100,
        "goal_type": user_goals.goal_type if user_goals else "maintain"
    }

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

    user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    today_activity = db.query(DailyActivity).filter(
        DailyActivity.user_id == user_id,
        DailyActivity.activity_date == target_date
    ).first()

    activity = {"steps": 0, "level": "sedentary", "tdee": 2000, "bmr": 1600}

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

    week_start = target_date - timedelta(days=6)

    weekly_logs = db.query(MealLog).filter(
        MealLog.user_id == user_id,
        MealLog.log_date >= week_start,
        MealLog.log_date <= target_date
    ).all()

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

    target_kcal = activity["tdee"] if goals["goal_type"] == "maintain" else goals["calorie"]
    protein_target = goals["protein"]

    warnings_list = generate_daily_warnings(
        target_kcal=target_kcal,
        consumed_kcal=today_data["calorie"],
        protein_target=protein_target,
        consumed_protein=today_data["protein"],
        steps=activity["steps"]
    )

    warning_messages = [w["message"] for w in warnings_list if w["type"] == "warning"]

    total_interactions = db.query(func.count(AIInteraction.id)).filter(
        AIInteraction.user_id == user_id
    ).scalar() or 0

    accepted_count = db.query(func.count(AIAcceptance.id)).filter(
        AIAcceptance.user_id == user_id
    ).scalar() or 0

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

    return {
        "goals": goals,
        "today": today_data,
        "activity": activity,
        "weekly_trend": weekly_trend,
        "warnings": warning_messages,
        "ai_history": ai_history
    }


def format_context_for_prompt(context: dict) -> str:
    goals = context["goals"]
    today = context["today"]
    activity = context["activity"]
    weekly = context["weekly_trend"]
    warnings = context["warnings"]
    ai_hist = context["ai_history"]

    remaining_cal = goals["calorie"] - today["calorie"]
    remaining_prot = goals["protein"] - today["protein"]

    text = f"""
USER DATA (calculated by backend, interpret only):

Goals:
- Daily calorie target: {goals['calorie']} kcal
- Daily protein target: {goals['protein']}g
- Goal: {goals['goal_type']}

Today's Status:
- Consumed: {today['calorie']} kcal, {today['protein']}g protein
- Carbs: {today['carbs']}g, Fat: {today['fat']}g
- Remaining calories: {remaining_cal} kcal
- Remaining protein: {remaining_prot}g

Activity:
- Steps: {activity['steps']}
- Activity level: {activity['level']}
- TDEE: {activity['tdee']} kcal/day
- BMR: {activity['bmr']} kcal/day

Weekly Trend (last 7 days):
- Average calories: {weekly['avg_calorie']} kcal
- Average protein: {weekly['avg_protein']}g
- Days logged: {weekly['days_logged']}/7

Active Warnings:
{chr(10).join(['- ' + w for w in warnings]) if warnings else '- None'}

AI History:
- Last suggestion accepted: {'Yes' if ai_hist['last_suggestion_accepted'] else 'No'}
- Overall acceptance rate: {int(ai_hist['acceptance_rate'] * 100)}%
- Total interactions: {ai_hist['total_interactions']}
"""
    return text
