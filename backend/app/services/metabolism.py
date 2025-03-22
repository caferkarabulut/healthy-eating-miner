from datetime import datetime
from typing import Tuple


ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725
}

GOAL_ADJUSTMENTS = {
    "lose": -400,
    "maintain": 0,
    "gain": +400
}


def calculate_bmr(weight_kg: float, height_cm: int, birth_year: int, gender: str) -> int:
    current_year = datetime.now().year
    age = current_year - birth_year

    if gender == "male":
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

    return int(round(bmr))


def steps_to_activity_level(steps: int) -> str:
    if steps < 5000:
        return "sedentary"
    elif steps < 8000:
        return "light"
    elif steps < 12000:
        return "moderate"
    else:
        return "active"


def get_activity_multiplier(activity_level: str) -> float:
    return ACTIVITY_MULTIPLIERS.get(activity_level, 1.2)


def calculate_activity_multiplier(steps: int) -> Tuple[str, float]:
    level = steps_to_activity_level(steps)
    multiplier = get_activity_multiplier(level)
    return level, multiplier


def calculate_tdee(bmr: int, activity_multiplier: float) -> int:
    return int(round(bmr * activity_multiplier))


def calculate_daily_target(tdee: int, goal_type: str) -> int:
    adjustment = GOAL_ADJUSTMENTS.get(goal_type, 0)
    return tdee + adjustment


def calculate_protein_target(weight_kg: float, goal_type: str) -> int:
    multipliers = {
        "lose": 2.0,
        "maintain": 1.6,
        "gain": 1.8
    }
    multiplier = multipliers.get(goal_type, 1.6)
    return int(round(weight_kg * multiplier))


def get_full_calculations(
    weight_kg: float,
    height_cm: int,
    birth_year: int,
    gender: str,
    steps: int,
    goal_type: str
) -> dict:
    bmr = calculate_bmr(weight_kg, height_cm, birth_year, gender)
    activity_level, activity_multiplier = calculate_activity_multiplier(steps)
    tdee = calculate_tdee(bmr, activity_multiplier)
    target_calories = calculate_daily_target(tdee, goal_type)
    target_protein = calculate_protein_target(weight_kg, goal_type)

    return {
        "bmr": bmr,
        "activity_level": activity_level,
        "activity_multiplier": activity_multiplier,
        "tdee": tdee,
        "target_calories": target_calories,
        "target_protein": target_protein
    }
