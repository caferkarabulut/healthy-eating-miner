import pandas as pd
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine
from app.db.models import Meal
import sys
import os

def seed_kaggle_data():
    csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "healthy_eating_clean.csv")
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        return

    print(f"Reading dataset from {csv_path}...")
    df = pd.read_csv(csv_path)
    
    # NaN değerleri None/0 ile doldur
    df = df.where(pd.notnull(df), None)

    db = SessionLocal()
    try:
        # Mevcut yemekleri al (Duplicate kontrolü için)
        print("Fetching existing meals for duplicate check...")
        existing_meals = db.query(Meal.meal_name, Meal.calories).all()
        # Set of (name, calories) tuples for O(1) lookup
        existing_set = {(m.meal_name, m.calories) for m in existing_meals}
        print(f"Found {len(existing_set)} existing meals in DB.")

        new_meals = []
        skipped_count = 0

        for _, row in df.iterrows():
            meal_name = row['meal_name']
            calories = float(row['calories']) if row['calories'] else 0
            
            # Duplicate Check (Name + Calories)
            if (meal_name, calories) in existing_set:
                skipped_count += 1
                continue

            # Haritalama - Azure SQL Model Uyumlu
            meal = Meal(
                meal_name=meal_name,
                calories=calories,
                protein_g=float(row['protein_g']) if row['protein_g'] else 0,
                carbs_g=float(row['carbs_g']) if row['carbs_g'] else 0,
                fat_g=float(row['fat_g']) if row['fat_g'] else 0,
                fiber_g=float(row['fiber_g']) if row['fiber_g'] else 0,
                sugar_g=float(row['sugar_g']) if row['sugar_g'] else 0,
                sodium_mg=float(row['sodium_mg']) if row['sodium_mg'] else 0,
                cholesterol_mg=float(row['cholesterol_mg']) if row['cholesterol_mg'] else 0,
                
                # Metadata
                # Note: portion_weight and image_url are not in the current Meal model
                cuisine=row['cuisine'],
                meal_type=row['meal_type'],
                diet_type=row['diet_type'],
                prep_time_min=int(row['prep_time_min']) if row['prep_time_min'] else 0,
                cook_time_min=int(row['cook_time_min']) if row['cook_time_min'] else 0,
                rating=float(row['rating']) if row['rating'] else 0,
                is_healthy=bool(row['is_healthy'])
            )
            new_meals.append(meal)
            # Add to set to prevent duplicates within the CSV itself
            existing_set.add((meal_name, calories))

        if new_meals:
            print(f"Inserting {len(new_meals)} new meals...")
            # Batch size ile insert (SQL Server limiti için)
            batch_size = 500
            for i in range(0, len(new_meals), batch_size):
                batch = new_meals[i:i + batch_size]
                db.add_all(batch)
                db.commit()
                print(f"Committed batch {i//batch_size + 1}")
            
            print("All meals inserted successfully!")
        else:
            print("No new meals to insert.")

        print(f"Summary: {len(new_meals)} added, {skipped_count} skipped (duplicate).")
        
        # Final Count
        count = db.query(Meal).count()
        print(f"Total meals in DB: {count}")

    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_kaggle_data()
