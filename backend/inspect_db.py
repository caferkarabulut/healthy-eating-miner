from app.db.session import engine
from sqlalchemy import inspect

inspector = inspect(engine)

def check_table(table_name):
    if inspector.has_table(table_name):
        print(f"--- {table_name} Columns ---")
        for col in inspector.get_columns(table_name):
            print(f"- {col['name']} ({col['type']})")
    else:
        print(f"Table {table_name} does not exist.")

check_table("daily_activities")
check_table("user_profiles")
