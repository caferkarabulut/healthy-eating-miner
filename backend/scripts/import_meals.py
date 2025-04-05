import pandas as pd
from app.db.session import SessionLocal
from app.db.models import Meal

CSV_PATH = "../data/healthy_eating_clean.csv"

def run():
    df = pd.read_csv(CSV_PATH)

    db = SessionLocal()

    for _, row in df.iterrows():
        meal = Meal(
            meal_id=int(row["meal_id"]),
            meal_name=row["meal_name"],

            cuisine=row["cuisine"],
            meal_type=row["meal_type"],
            diet_type=row["diet_type"],

            calories=row["calories"],
            protein_g=row["protein_g"],
            carbs_g=row["carbs_g"],
            fat_g=row["fat_g"],
            fiber_g=row["fiber_g"],
            sugar_g=row["sugar_g"],

            sodium_mg=row["sodium_mg"],
            cholesterol_mg=row["cholesterol_mg"],

            prep_time_min=row["prep_time_min"],
            cook_time_min=row["cook_time_min"],

            rating=row["rating"],
            is_healthy=bool(row["is_healthy"]),
        )

        db.merge(meal)  # meal_id aynıysa overwrite
    db.commit()
    db.close()
    print("✅ Meals import tamamlandı")

if __name__ == "__main__":
    run()
