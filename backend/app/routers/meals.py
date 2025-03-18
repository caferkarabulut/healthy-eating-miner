from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.db.models import Meal
from app.core.security import get_current_user_id

router = APIRouter(prefix="/meals", tags=["meals"])


@router.get("")
def list_meals(
    search: Optional[str] = Query(None),
    min_calories: Optional[float] = Query(None),
    max_calories: Optional[float] = Query(None),
    min_protein: Optional[float] = Query(None),
    meal_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=10000),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    query = db.query(Meal)

    if search:
        query = query.filter(Meal.meal_name.ilike(f"%{search}%"))

    if min_calories is not None:
        query = query.filter(Meal.calories >= min_calories)
    if max_calories is not None:
        query = query.filter(Meal.calories <= max_calories)

    if min_protein is not None:
        query = query.filter(Meal.protein_g >= min_protein)

    if meal_type:
        query = query.filter(Meal.meal_type == meal_type)

    meals = query.limit(limit).all()

    return [
        {
            "meal_id": m.meal_id,
            "meal_name": m.meal_name,
            "calories": m.calories,
            "protein_g": m.protein_g,
            "carbs_g": m.carbs_g,
            "fat_g": m.fat_g,
            "meal_type": m.meal_type,
            "cuisine": m.cuisine
        }
        for m in meals
    ]
