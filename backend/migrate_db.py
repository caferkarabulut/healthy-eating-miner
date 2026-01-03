from app.db.session import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        print("Migrating daily_activities table...")
        try:
            conn.execute(text("ALTER TABLE daily_activities ADD bmr INTEGER DEFAULT 0"))
            print("Added bmr column")
        except Exception as e:
            print(f"Error adding bmr (maybe exists): {e}")

        try:
            conn.execute(text("ALTER TABLE daily_activities ADD tdee INTEGER DEFAULT 0"))
            print("Added tdee column")
        except Exception as e:
            print(f"Error adding tdee (maybe exists): {e}")

        try:
            conn.execute(text("ALTER TABLE daily_activities ADD target_kcal INTEGER DEFAULT 0"))
            print("Added target_kcal column")
        except Exception as e:
            print(f"Error adding target_kcal (maybe exists): {e}")
            
        conn.commit()
        print("Migration complete.")

if __name__ == "__main__":
    migrate()
