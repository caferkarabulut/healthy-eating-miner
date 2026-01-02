from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.db.session import get_db
from app.db.models import UserGoals
from app.core.security import get_current_user_id

router = APIRouter(prefix="/user", tags=["user"])


class GoalsRequest(BaseModel):
    daily_calorie_target: int = 2000
    daily_protein_target: int = 100
    goal_type: str = "koruma"  # kilo_verme, kilo_alma, koruma


class GoalsResponse(BaseModel):
    daily_calorie_target: int
    daily_protein_target: int
    goal_type: str


@router.get("/goals", response_model=GoalsResponse)
def get_goals(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Kullanıcının hedeflerini getir"""
    goals = db.query(UserGoals).filter(UserGoals.user_id == user_id).first()
    
    if not goals:
        # Varsayılan değerler döndür
        return GoalsResponse(
            daily_calorie_target=2000,
            daily_protein_target=100,
            goal_type="koruma"
        )
    
    return GoalsResponse(
        daily_calorie_target=goals.daily_calorie_target,
        daily_protein_target=goals.daily_protein_target,
        goal_type=goals.goal_type
    )


@router.post("/goals", response_model=GoalsResponse)
def create_goals(
    req: GoalsRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Kullanıcının hedeflerini oluştur veya güncelle"""
    goals = db.query(UserGoals).filter(UserGoals.user_id == user_id).first()
    
    if goals:
        # Güncelle
        goals.daily_calorie_target = req.daily_calorie_target
        goals.daily_protein_target = req.daily_protein_target
        goals.goal_type = req.goal_type
    else:
        # Oluştur
        goals = UserGoals(
            user_id=user_id,
            daily_calorie_target=req.daily_calorie_target,
            daily_protein_target=req.daily_protein_target,
            goal_type=req.goal_type
        )
        db.add(goals)
    
    db.commit()
    db.refresh(goals)
    
    return GoalsResponse(
        daily_calorie_target=goals.daily_calorie_target,
        daily_protein_target=goals.daily_protein_target,
        goal_type=goals.goal_type
    )
