from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import date, datetime

from app.db.session import get_db
from app.db.models import UserProfile, DailyActivity, UserGoals
from app.core.security import get_current_user_id
from app.services.metabolism import (
    calculate_bmr,
    calculate_activity_multiplier,
    calculate_tdee,
    calculate_daily_target,
    calculate_protein_target,
    get_full_calculations
)

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileRequest(BaseModel):
    height_cm: int = Field(..., ge=120, le=230)
    weight_kg: float = Field(..., ge=30, le=250)
    gender: str = Field(..., pattern="^(male|female)$")
    birth_year: int = Field(..., ge=1940, le=2010)


class ActivityRequest(BaseModel):
    steps: int = Field(..., ge=0, le=100000)
    activity_date: date = None


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
    bmr = calculate_bmr(profile.weight_kg, profile.height_cm, profile.birth_year, profile.gender)
    
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
    bmr = calculate_bmr(req.weight_kg, req.height_cm, req.birth_year, req.gender)
    
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
    """Günlük aktivite kaydet ve BMR/TDEE/hedefi DB'ye kaydet"""
    activity_date = req.activity_date or date.today()
    
    # Profili al
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Önce profil oluşturun")
    
    # Hedefi al
    goals = db.query(UserGoals).filter(UserGoals.user_id == user_id).first()
    goal_type = goals.goal_type if goals else "koruma"
    
    # Tüm hesapları tek seferde yap (metabolism service)
    calcs = get_full_calculations(
        weight_kg=profile.weight_kg,
        height_cm=profile.height_cm,
        birth_year=profile.birth_year,
        gender=profile.gender,
        steps=req.steps,
        goal_type=goal_type
    )
    
    # Mevcut kaydı güncelle veya yeni kayıt
    activity = db.query(DailyActivity).filter(
        DailyActivity.user_id == user_id,
        DailyActivity.activity_date == activity_date
    ).first()
    
    if activity:
        activity.steps = req.steps
        activity.activity_level = calcs["activity_level"]
        activity.bmr = calcs["bmr"]
        activity.tdee = calcs["tdee"]
        activity.target_kcal = calcs["target_calories"]
    else:
        activity = DailyActivity(
            user_id=user_id,
            activity_date=activity_date,
            steps=req.steps,
            activity_level=calcs["activity_level"],
            bmr=calcs["bmr"],
            tdee=calcs["tdee"],
            target_kcal=calcs["target_calories"]
        )
        db.add(activity)
    
    db.commit()
    
    return {
        "ok": True,
        "steps": req.steps,
        "activity_level": calcs["activity_level"],
        "activity_multiplier": calcs["activity_multiplier"],
        "bmr": calcs["bmr"],
        "tdee": calcs["tdee"],
        "target_calories": calcs["target_calories"],
        "target_protein": calcs["target_protein"]
    }


@router.get("/activity")
def get_activity(
    activity_date: date = None,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Günlük aktivite getir (önce DB'den, yoksa hesapla)"""
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
    
    # DB'de kayıtlı değerler varsa onları döndür (historical accuracy)
    if activity and activity.bmr and activity.tdee:
        return {
            "steps": activity.steps,
            "activity_level": activity.activity_level,
            "activity_multiplier": 1.55,  # geçmişte kesin bilinmez
            "bmr": activity.bmr,
            "tdee": activity.tdee,
            "target_calories": activity.target_kcal,
            "goal_type": goal_type,
            "from_db": True
        }
    
    # Yoksa runtime hesapla
    steps = activity.steps if activity else 0
    calcs = get_full_calculations(
        weight_kg=profile.weight_kg,
        height_cm=profile.height_cm,
        birth_year=profile.birth_year,
        gender=profile.gender,
        steps=steps,
        goal_type=goal_type
    )
    
    return {
        "steps": steps,
        "activity_level": calcs["activity_level"],
        "activity_multiplier": calcs["activity_multiplier"],
        "bmr": calcs["bmr"],
        "tdee": calcs["tdee"],
        "target_calories": calcs["target_calories"],
        "goal_type": goal_type,
        "from_db": False
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
    
    current_year = datetime.now().year
    age = current_year - profile.birth_year
    
    calcs = get_full_calculations(
        weight_kg=profile.weight_kg,
        height_cm=profile.height_cm,
        birth_year=profile.birth_year,
        gender=profile.gender,
        steps=steps,
        goal_type=goal_type
    )
    
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
            "level": calcs["activity_level"],
            "multiplier": calcs["activity_multiplier"]
        },
        "calculations": {
            "bmr": calcs["bmr"],
            "tdee": calcs["tdee"],
            "target_calories": calcs["target_calories"],
            "target_protein": calcs["target_protein"],
            "goal_type": goal_type
        }
    }
