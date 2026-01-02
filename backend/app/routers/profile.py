from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import date, datetime

from app.db.session import get_db
from app.db.models import UserProfile, DailyActivity, UserGoals
from app.core.security import get_current_user_id

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileRequest(BaseModel):
    height_cm: int = Field(..., ge=120, le=230)
    weight_kg: float = Field(..., ge=30, le=250)
    gender: str = Field(..., pattern="^(male|female)$")
    birth_year: int = Field(..., ge=1940, le=2010)


class ProfileResponse(BaseModel):
    height_cm: int
    weight_kg: float
    gender: str
    birth_year: int
    age: int
    bmr: float
    has_profile: bool = True


class ActivityRequest(BaseModel):
    steps: int = Field(..., ge=0, le=100000)
    activity_date: date = None


class ActivityResponse(BaseModel):
    steps: int
    activity_level: str
    activity_multiplier: float
    tdee: float
    target_calories: int


def calculate_bmr(profile: UserProfile) -> float:
    """Mifflin-St Jeor formülü ile BMR hesapla"""
    current_year = datetime.now().year
    age = current_year - profile.birth_year
    
    if profile.gender == "male":
        # Erkek: 10*w + 6.25*h - 5*a + 5
        bmr = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * age + 5
    else:
        # Kadın: 10*w + 6.25*h - 5*a - 161
        bmr = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * age - 161
    
    return round(bmr, 1)


def get_activity_level(steps: int) -> tuple[str, float]:
    """Adım sayısına göre aktivite seviyesi ve TDEE çarpanı"""
    if steps < 5000:
        return "sedentary", 1.2
    elif steps < 8000:
        return "light", 1.375
    elif steps < 12000:
        return "moderate", 1.55
    else:
        return "active", 1.725


def calculate_tdee(bmr: float, activity_multiplier: float) -> float:
    """TDEE = BMR × aktivite çarpanı"""
    return round(bmr * activity_multiplier, 1)


def calculate_target_calories(tdee: float, goal_type: str) -> int:
    """Hedefe göre günlük kalori hedefi"""
    adjustments = {
        "kilo_verme": -400,
        "koruma": 0,
        "kilo_alma": +400
    }
    adjustment = adjustments.get(goal_type, 0)
    return int(tdee + adjustment)


@router.get("")
def get_profile(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Kullanıcı profilini getir"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    
    if not profile:
        return {"has_profile": False}
    
    current_year = datetime.now().year
    age = current_year - profile.birth_year
    bmr = calculate_bmr(profile)
    
    return {
        "has_profile": True,
        "height_cm": profile.height_cm,
        "weight_kg": profile.weight_kg,
        "gender": profile.gender,
        "birth_year": profile.birth_year,
        "age": age,
        "bmr": bmr
    }


@router.post("")
def create_or_update_profile(
    req: ProfileRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Profil oluştur veya güncelle"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    
    if profile:
        profile.height_cm = req.height_cm
        profile.weight_kg = req.weight_kg
        profile.gender = req.gender
        profile.birth_year = req.birth_year
    else:
        profile = UserProfile(
            user_id=user_id,
            height_cm=req.height_cm,
            weight_kg=req.weight_kg,
            gender=req.gender,
            birth_year=req.birth_year
        )
        db.add(profile)
    
    db.commit()
    
    current_year = datetime.now().year
    age = current_year - req.birth_year
    bmr = calculate_bmr(profile)
    
    return {
        "ok": True,
        "height_cm": req.height_cm,
        "weight_kg": req.weight_kg,
        "gender": req.gender,
        "birth_year": req.birth_year,
        "age": age,
        "bmr": bmr
    }


@router.post("/activity")
def log_activity(
    req: ActivityRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Günlük aktivite kaydet"""
    activity_date = req.activity_date or date.today()
    activity_level, activity_multiplier = get_activity_level(req.steps)
    
    # Profili al
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Önce profil oluşturun")
    
    # Hedefi al
    goals = db.query(UserGoals).filter(UserGoals.user_id == user_id).first()
    goal_type = goals.goal_type if goals else "koruma"
    
    # Mevcut kaydı güncelle veya yeni kayıt
    activity = db.query(DailyActivity).filter(
        DailyActivity.user_id == user_id,
        DailyActivity.activity_date == activity_date
    ).first()
    
    if activity:
        activity.steps = req.steps
        activity.activity_level = activity_level
    else:
        activity = DailyActivity(
            user_id=user_id,
            activity_date=activity_date,
            steps=req.steps,
            activity_level=activity_level
        )
        db.add(activity)
    
    db.commit()
    
    bmr = calculate_bmr(profile)
    tdee = calculate_tdee(bmr, activity_multiplier)
    target_calories = calculate_target_calories(tdee, goal_type)
    
    return {
        "ok": True,
        "steps": req.steps,
        "activity_level": activity_level,
        "activity_multiplier": activity_multiplier,
        "bmr": bmr,
        "tdee": tdee,
        "target_calories": target_calories
    }


@router.get("/activity")
def get_activity(
    activity_date: date = None,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Günlük aktivite getir"""
    activity_date = activity_date or date.today()
    
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        return {"has_profile": False}
    
    goals = db.query(UserGoals).filter(UserGoals.user_id == user_id).first()
    goal_type = goals.goal_type if goals else "koruma"
    
    activity = db.query(DailyActivity).filter(
        DailyActivity.user_id == user_id,
        DailyActivity.activity_date == activity_date
    ).first()
    
    if activity:
        steps = activity.steps
        activity_level = activity.activity_level
    else:
        steps = 0
        activity_level = "sedentary"
    
    _, activity_multiplier = get_activity_level(steps)
    bmr = calculate_bmr(profile)
    tdee = calculate_tdee(bmr, activity_multiplier)
    target_calories = calculate_target_calories(tdee, goal_type)
    
    return {
        "steps": steps,
        "activity_level": activity_level,
        "activity_multiplier": activity_multiplier,
        "bmr": bmr,
        "tdee": tdee,
        "target_calories": target_calories,
        "goal_type": goal_type
    }


@router.get("/stats")
def get_full_stats(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Tam kullanıcı istatistikleri (BMR, TDEE, hedef)"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        return {"has_profile": False}
    
    goals = db.query(UserGoals).filter(UserGoals.user_id == user_id).first()
    goal_type = goals.goal_type if goals else "koruma"
    
    today = date.today()
    activity = db.query(DailyActivity).filter(
        DailyActivity.user_id == user_id,
        DailyActivity.activity_date == today
    ).first()
    
    steps = activity.steps if activity else 0
    activity_level, activity_multiplier = get_activity_level(steps)
    
    current_year = datetime.now().year
    age = current_year - profile.birth_year
    bmr = calculate_bmr(profile)
    tdee = calculate_tdee(bmr, activity_multiplier)
    target_calories = calculate_target_calories(tdee, goal_type)
    
    return {
        "has_profile": True,
        "profile": {
            "height_cm": profile.height_cm,
            "weight_kg": profile.weight_kg,
            "gender": profile.gender,
            "age": age
        },
        "activity": {
            "steps": steps,
            "level": activity_level,
            "multiplier": activity_multiplier
        },
        "calculations": {
            "bmr": bmr,
            "tdee": tdee,
            "target_calories": target_calories,
            "goal_type": goal_type
        }
    }
