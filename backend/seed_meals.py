"""Seed script for Azure SQL meals table"""
from app.db.session import SessionLocal
from app.db.models import Meal

def seed_meals():
    db = SessionLocal()
    
    # name, calories, protein_g, carbs_g, fat_g
    meals_data = [
        ('Haslanmis Yumurta', 155, 13, 1.1, 11),
        ('Beyaz Peynir (100g)', 264, 18, 1, 21),
        ('Domates (1 adet)', 22, 1, 5, 0.2),
        ('Salatalik (1 adet)', 16, 0.7, 3.6, 0.1),
        ('Tam Bugday Ekmegi (1 dilim)', 69, 3.6, 12, 1),
        ('Zeytinyagi (1 yemek kasigi)', 119, 0, 0, 13.5),
        ('Bal (1 yemek kasigi)', 64, 0.1, 17, 0),
        ('Sut (1 bardak)', 122, 8, 12, 5),
        ('Yogurt (1 kase)', 100, 17, 6, 0.7),
        ('Tavuk Gogsu (150g)', 165, 31, 0, 3.6),
        ('Pilav (1 porsiyon)', 206, 4.3, 45, 0.4),
        ('Mercimek Corbasi', 180, 12, 28, 2),
        ('Izgara Kofte (4 adet)', 300, 25, 2, 22),
        ('Makarna (1 porsiyon)', 220, 8, 43, 1.3),
        ('Salata (karisik)', 50, 2, 8, 1),
        ('Muz (1 adet)', 105, 1.3, 27, 0.4),
        ('Elma (1 adet)', 95, 0.5, 25, 0.3),
        ('Portakal (1 adet)', 62, 1.2, 15, 0.2),
        ('Ceviz (30g)', 196, 4.6, 4, 19.5),
        ('Badem (30g)', 173, 6.3, 6, 15),
    ]
    
    count = 0
    for name, cal, prot, carbs, fat in meals_data:
        try:
            existing = db.query(Meal).filter(Meal.meal_name == name).first()
            if not existing:
                meal = Meal(
                    meal_name=name, 
                    calories=cal, 
                    protein_g=prot, 
                    carbs_g=carbs, 
                    fat_g=fat,
                    # Default values for other fields
                    cuisine="Turk",
                    meal_type="ana_ogun",
                    diet_type="normal",
                    fiber_g=0,
                    sugar_g=0,
                    sodium_mg=0,
                    cholesterol_mg=0,
                    prep_time_min=10,
                    cook_time_min=10,
                    rating=4.0,
                    is_healthy=True
                )
                db.add(meal)
                db.flush()  # Get ID immediately
                count += 1
                print(f"Added: {name}")
        except Exception as e:
            print(f"Error adding {name}: {e}")
            db.rollback()
    
    try:
        db.commit()
        print(f"Total {count} yemek eklendi!")
    except Exception as e:
        print(f"Commit error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_meals()

if __name__ == "__main__":
    seed_meals()
