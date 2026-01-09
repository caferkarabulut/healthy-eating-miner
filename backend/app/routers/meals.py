from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.db.models import Meal
from app.core.security import get_current_user_id

router = APIRouter(prefix="/meals", tags=["meals"])


@router.get("/")
def list_meals(
    search: Optional[str] = Query(None, description="Yemek adında arama"),
    min_calories: Optional[float] = Query(None, description="Minimum kalori"),
    max_calories: Optional[float] = Query(None, description="Maksimum kalori"),
    min_protein: Optional[float] = Query(None, description="Minimum protein (g)"),
    meal_type: Optional[str] = Query(None, description="Öğün tipi: Breakfast, Lunch, Dinner, Snack"),
    limit: int = Query(50, ge=1, le=10000, description="Sonuç limiti"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    Yemekleri listele (arama ve filtre desteği ile).
    2000+ yemek için optimize edilmiş.
    """
    query = db.query(Meal)
    
    # Search filter (LIKE)
    if search:
        query = query.filter(Meal.meal_name.ilike(f"%{search}%"))
    
    # Calorie range filter
    if min_calories is not None:
        query = query.filter(Meal.calories >= min_calories)
    if max_calories is not None:
        query = query.filter(Meal.calories <= max_calories)
    
    # Protein filter
    if min_protein is not None:
        query = query.filter(Meal.protein_g >= min_protein)
    
    # Meal type filter
    if meal_type:
        query = query.filter(Meal.meal_type == meal_type)
    
    # Apply limit
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

