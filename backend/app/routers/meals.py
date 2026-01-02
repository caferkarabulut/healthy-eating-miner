from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Meal
from app.core.security import get_current_user_id

router = APIRouter(prefix="/meals", tags=["meals"])


@router.get("/")
def list_meals(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    meals = db.query(Meal).all()
    return [
        {
            "meal_id": m.meal_id,
            "meal_name": m.meal_name,
            "calories": m.calories,
            "protein_g": m.protein_g,
            "carbs_g": m.carbs_g,
            "fat_g": m.fat_g
        }
        for m in meals
    ]
