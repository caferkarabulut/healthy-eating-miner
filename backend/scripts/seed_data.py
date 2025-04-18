import pandas as pd
import os
import sys
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import Meal

def seed_data():
    """
    Seeds the database with meals from the cleaned CSV dataset.
    Avoids duplicates by checking meal names.
    """
    # Adjust path to find the csv in the data directory
    # Assuming script is run from backend/ directory or similar
    # We look for ../data/healthy_eating_clean.csv relative to this file
    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(base_dir, "..", ".."))
    csv_path = os.path.join(project_root, "data", "healthy_eating_clean.csv")

    if not os.path.exists(csv_path):
        # Fallback for different execution contexts
        csv_path = os.path.join(project_root, "..", "data", "healthy_eating_clean.csv")
    
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        return

    print(f"Reading dataset from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        print(f"Failed to read CSV: {e}")
        return
    
    # Fill NaN values
    df = df.where(pd.notnull(df), None)

    db = SessionLocal()
    try:
        print("Fetching existing meals to prevent duplicates...")
        existing_meals = db.query(Meal.meal_name).all()
        existing_names = {m.meal_name.lower() for m in existing_meals}
        print(f"Found {len(existing_names)} existing meals.")

        new_meals = []
        skipped_count = 0

        for _, row in df.iterrows():
            meal_name = str(row['meal_name']).strip()
            
            if meal_name.lower() in existing_names:
                skipped_count += 1
                continue

            # Map CSV columns to Meal model
            # Handling potential missing or malformed data with defaults
            meal = Meal(
                meal_name=meal_name,
                calories=float(row['calories']) if row['calories'] else 0.0,
                protein_g=float(row['protein_g']) if row['protein_g'] else 0.0,
                carbs_g=float(row['carbs_g']) if row['carbs_g'] else 0.0,
                fat_g=float(row['fat_g']) if row['fat_g'] else 0.0,
                fiber_g=float(row['fiber_g']) if row['fiber_g'] else 0.0,
                sugar_g=float(row['sugar_g']) if row['sugar_g'] else 0.0,
                sodium_mg=float(row['sodium_mg']) if row['sodium_mg'] else 0.0,
                cholesterol_mg=float(row['cholesterol_mg']) if row['cholesterol_mg'] else 0.0,
                
                cuisine=str(row['cuisine']) if row['cuisine'] else "Unknown",
                meal_type=str(row['meal_type']) if row['meal_type'] else "other",
                diet_type=str(row['diet_type']) if row['diet_type'] else "standard",
                
                prep_time_min=int(row['prep_time_min']) if row['prep_time_min'] else 0,
                cook_time_min=int(row['cook_time_min']) if row['cook_time_min'] else 0,
                
                rating=float(row['rating']) if row['rating'] else 0.0,
                is_healthy=bool(row['is_healthy'])
            )
            
            new_meals.append(meal)
            existing_names.add(meal_name.lower())

        if new_meals:
            print(f"Inserting {len(new_meals)} new meals...")
            
            # Batch insert
            batch_size = 500
            for i in range(0, len(new_meals), batch_size):
                batch = new_meals[i:i + batch_size]
                db.add_all(batch)
                db.commit()
                print(f"Committed batch {i//batch_size + 1}")
            
            print("Seeding completed successfully!")
        else:
            print("No new meals to insert.")

        print(f"Summary: {len(new_meals)} added, {skipped_count} skipped.")
        
    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
