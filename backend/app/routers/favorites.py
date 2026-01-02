from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import FavoriteMeal
from app.core.security import get_current_user_id

router = APIRouter(prefix="/favorites", tags=["favorites"])

@router.post("/")
def add_favorite(
    meal_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    fav = FavoriteMeal(user_id=user_id, meal_id=meal_id)
    db.add(fav)
    db.commit()
    return {"ok": True}

@router.get("/")
def list_favorites(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    return db.query(FavoriteMeal).filter(
        FavoriteMeal.user_id == user_id
    ).all()
