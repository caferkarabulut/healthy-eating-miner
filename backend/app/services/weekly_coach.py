from datetime import date, datetime, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date

from app.db.models import (
    UserGoals, UserProfile, DailyActivity,
    MealLog, Meal, AIInteraction, AIAcceptance
)
from app.services.warnings import generate_daily_warnings
from app.services.metabolism import get_full_calculations


def get_weekly_summary(user_id: int, end_date: date, db: Session) -> dict:
    start_date = end_date - timedelta(days=6)

    user_goals = db.query(UserGoals).filter(UserGoals.user_id == user_id).first()
    calorie_target = user_goals.daily_calorie_target if user_goals else 2000
    protein_target = user_goals.daily_protein_target if user_goals else 100

    weekly_logs = db.query(MealLog).filter(
        MealLog.user_id == user_id,
        MealLog.log_date >= start_date,
        MealLog.log_date <= end_date
    ).all()

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

    if days_logged > 0:
        avg_calorie = sum(d["calorie"] for d in daily_totals.values()) / days_logged
        avg_protein = sum(d["protein"] for d in daily_totals.values()) / days_logged
    else:
        avg_calorie = 0
        avg_protein = 0

    days_on_target = 0
    for day_data in daily_totals.values():
        cal = day_data["calorie"]
        lower_bound = calorie_target * 0.85
        upper_bound = calorie_target * 1.15
        if lower_bound <= cal <= upper_bound:
            days_on_target += 1

    consistency_score = days_on_target / 7

    calorie_values = [d["calorie"] for d in sorted(daily_totals.values(), key=lambda x: x["date"])]
    protein_values = [d["protein"] for d in sorted(daily_totals.values(), key=lambda x: x["date"])]

    calorie_trend = _calculate_trend(calorie_values)
    protein_trend = _calculate_trend(protein_values)

    start_datetime = datetime.combine(start_date, datetime.min.time())

    try:
        ai_interactions = db.query(AIInteraction).filter(
            AIInteraction.user_id == user_id,
            AIInteraction.created_at >= start_datetime
        ).all()
        ai_interaction_count = len(ai_interactions)
    except Exception:
        ai_interaction_count = 0

    try:
        ai_acceptances = db.query(AIAcceptance).filter(
            AIAcceptance.user_id == user_id,
            AIAcceptance.created_at >= start_datetime
        ).count()
    except Exception:
        ai_acceptances = 0

    ai_acceptance_rate = ai_acceptances / ai_interaction_count if ai_interaction_count > 0 else 0

    warning_counts = {}
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()

    for day_str, day_data in daily_totals.items():
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
                key = _extract_warning_key(msg)
                warning_counts[key] = warning_counts.get(key, 0) + 1

    top_warning = max(warning_counts, key=warning_counts.get) if warning_counts else None

    week_range = f"{start_date.strftime('%b %d')} – {end_date.strftime('%b %d')}"

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
    if len(values) < 2:
        return "insufficient_data"

    first_half = values[:len(values)//2]
    second_half = values[len(values)//2:]

    if not first_half or not second_half:
        return "insufficient_data"

    first_avg = sum(first_half) / len(first_half)
    second_avg = sum(second_half) / len(second_half)

    diff_pct = (second_avg - first_avg) / first_avg * 100 if first_avg > 0 else 0

    if diff_pct > 10:
        return "increasing"
    elif diff_pct < -10:
        return "decreasing"
    elif abs(diff_pct) <= 10 and len(values) >= 3:
        variance = sum((v - sum(values)/len(values))**2 for v in values) / len(values)
        avg = sum(values) / len(values)
        cv = (variance ** 0.5) / avg if avg > 0 else 0

        if cv > 0.3:
            return "irregular"
        return "stable"
    else:
        return "stable"


def _extract_warning_key(message: str) -> str:
    if "protein" in message.lower():
        return "protein_imbalance"
    elif "calorie" in message.lower() and "exceeded" in message.lower():
        return "calorie_excess"
    elif "calorie" in message.lower() and "low" in message.lower():
        return "calorie_deficit"
    elif "activity" in message.lower() or "step" in message.lower():
        return "low_activity"
    else:
        return "general_warning"


def format_weekly_summary_for_ai(summary: dict) -> str:
    return f"""
WEEKLY SUMMARY ({summary['week_range']}):

Data Status:
- Days logged: {summary['days_logged']}/7

Calories:
- Average: {summary['avg_calorie']} kcal/day
- Target: {summary['calorie_target']} kcal/day
- Trend: {summary['calorie_trend']}

Protein:
- Average: {summary['avg_protein']}g/day
- Target: {summary['protein_target']}g/day
- Trend: {summary['protein_trend']}

Performance:
- Consistency score: {int(summary['consistency_score'] * 100)}%
- AI suggestion acceptance rate: {int(summary['ai_acceptance_rate'] * 100)}%

Most frequent warning: {summary['top_warning'] or 'None'}
"""
