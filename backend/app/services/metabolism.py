"""
Metabolism Service - Tek Gerçek Kaynak (Single Source of Truth)

Bu modül BMR, TDEE ve günlük hedef hesaplamalarını merkezileştirir.
Controller'larda matematik YAPILMAZ, bu servis çağrılır.
"""

from datetime import datetime
from typing import Tuple


# Aktivite seviyesi → katsayı haritası
ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,    # < 5000 adım
    "light": 1.375,      # 5000-8000 adım
    "moderate": 1.55,    # 8000-12000 adım
    "active": 1.725      # 12000+ adım
}

# Hedef ayarlamaları (kcal)
GOAL_ADJUSTMENTS = {
    "kilo_verme": -400,
    "koruma": 0,
    "kilo_alma": +400
}


def calculate_bmr(weight_kg: float, height_cm: int, birth_year: int, gender: str) -> int:
    """
    Mifflin-St Jeor formülü ile Bazal Metabolizma Hızı hesapla.
    
    Erkek: 10*w + 6.25*h - 5*a + 5
    Kadın: 10*w + 6.25*h - 5*a - 161
    
    Returns: int - BMR kcal/gün
    """
    current_year = datetime.now().year
    age = current_year - birth_year
    
    if gender == "male":
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    
    return int(round(bmr))


def steps_to_activity_level(steps: int) -> str:
    """
    Adım sayısından aktivite seviyesi belirle.
    
    < 5000 → sedentary
    5000-8000 → light
    8000-12000 → moderate
    12000+ → active
    """
    if steps < 5000:
        return "sedentary"
    elif steps < 8000:
        return "light"
    elif steps < 12000:
        return "moderate"
    else:
        return "active"


def get_activity_multiplier(activity_level: str) -> float:
    """Aktivite seviyesinden katsayı al."""
    return ACTIVITY_MULTIPLIERS.get(activity_level, 1.2)


def calculate_activity_multiplier(steps: int) -> Tuple[str, float]:
    """
    Adım sayısından aktivite seviyesi ve katsayı döndür.
    
    Returns: (activity_level, multiplier)
    """
    level = steps_to_activity_level(steps)
    multiplier = get_activity_multiplier(level)
    return level, multiplier


def calculate_tdee(bmr: int, activity_multiplier: float) -> int:
    """
    Total Daily Energy Expenditure = BMR × aktivite katsayısı
    
    Returns: int - TDEE kcal/gün
    """
    return int(round(bmr * activity_multiplier))


def calculate_daily_target(tdee: int, goal_type: str) -> int:
    """
    Günlük kalori hedefi = TDEE + hedef ayarı
    
    kilo_verme: -400 kcal
    koruma: 0
    kilo_alma: +400 kcal
    
    Returns: int - Hedef kcal/gün
    """
    adjustment = GOAL_ADJUSTMENTS.get(goal_type, 0)
    return tdee + adjustment


def calculate_protein_target(weight_kg: float, goal_type: str) -> int:
    """
    Günlük protein hedefi hesapla.
    
    Genel: 1.6g/kg
    Kilo verme: 2.0g/kg (kas kaybını önlemek için)
    Kilo alma: 1.8g/kg
    
    Returns: int - Hedef protein gram/gün
    """
    multipliers = {
        "kilo_verme": 2.0,
        "koruma": 1.6,
        "kilo_alma": 1.8
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
    """
    Tüm metabolizma hesaplamalarını tek seferde yap.
    
    Returns: {
        bmr: int,
        activity_level: str,
        activity_multiplier: float,
        tdee: int,
        target_calories: int,
        target_protein: int
    }
    """
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
