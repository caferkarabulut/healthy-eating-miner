# Database Models
from sqlalchemy import String, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)


from sqlalchemy import Float, Boolean

class Meal(Base):
    __tablename__ = "meals"

    meal_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    meal_name: Mapped[str] = mapped_column(String(255), nullable=False)

    cuisine: Mapped[str] = mapped_column(String(100))
    meal_type: Mapped[str] = mapped_column(String(50))
    diet_type: Mapped[str] = mapped_column(String(50))

    calories: Mapped[float] = mapped_column(Float)
    protein_g: Mapped[float] = mapped_column(Float)
    carbs_g: Mapped[float] = mapped_column(Float)
    fat_g: Mapped[float] = mapped_column(Float)
    fiber_g: Mapped[float] = mapped_column(Float)
    sugar_g: Mapped[float] = mapped_column(Float)

    sodium_mg: Mapped[float] = mapped_column(Float)
    cholesterol_mg: Mapped[float] = mapped_column(Float)

    prep_time_min: Mapped[int] = mapped_column(Integer)
    cook_time_min: Mapped[int] = mapped_column(Integer)

    rating: Mapped[float] = mapped_column(Float)
    is_healthy: Mapped[bool] = mapped_column(Boolean)


from sqlalchemy import ForeignKey, Date
from datetime import date

class MealLog(Base):
    __tablename__ = "meal_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    meal_id: Mapped[int] = mapped_column(ForeignKey("meals.meal_id"), nullable=False)

    log_date: Mapped[date] = mapped_column(Date, default=date.today)
    portion: Mapped[float] = mapped_column(Float, default=1.0)


class FavoriteMeal(Base):
    __tablename__ = "favorite_meals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    meal_id: Mapped[int] = mapped_column(ForeignKey("meals.meal_id"), nullable=False)


from sqlalchemy import Text

class AIInteraction(Base):
    __tablename__ = "ai_interactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    response_text: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_meal_ids: Mapped[str] = mapped_column(Text)  # JSON string: "[1, 2, 3]"
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)


class AIAcceptance(Base):
    __tablename__ = "ai_acceptances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ai_interaction_id: Mapped[int] = mapped_column(ForeignKey("ai_interactions.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    meal_id: Mapped[int] = mapped_column(ForeignKey("meals.meal_id"), nullable=False)
    accepted_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)


class UserGoals(Base):
    __tablename__ = "user_goals"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    daily_calorie_target: Mapped[int] = mapped_column(Integer, default=2000)
    daily_protein_target: Mapped[int] = mapped_column(Integer, default=100)
    goal_type: Mapped[str] = mapped_column(String(50), default="koruma")  # kilo_verme, kilo_alma, koruma
    updated_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    height_cm: Mapped[int] = mapped_column(Integer, nullable=False)  # 120-230
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)  # 30-250
    gender: Mapped[str] = mapped_column(String(10), nullable=False)  # male, female
    birth_year: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class DailyActivity(Base):
    __tablename__ = "daily_activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    activity_date: Mapped[date] = mapped_column(Date, nullable=False)
    steps: Mapped[int] = mapped_column(Integer, default=0)
    activity_level: Mapped[str] = mapped_column(String(20), default="sedentary")
    
    # Kalıcı hesaplamalar (o günün değerleri)
    bmr: Mapped[int] = mapped_column(Integer, nullable=True)
    tdee: Mapped[int] = mapped_column(Integer, nullable=True)
    target_kcal: Mapped[int] = mapped_column(Integer, nullable=True)


