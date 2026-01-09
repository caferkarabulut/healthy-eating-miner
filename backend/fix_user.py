from app.db.session import SessionLocal
from app.db.models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
db = SessionLocal()

existing = db.query(User).filter(User.email == 'cafer@example.com').first()
print(f'User exists: {existing is not None}')

if not existing:
    hashed = pwd_context.hash('cafer123')
    new_user = User(email='cafer@example.com', password_hash=hashed)
    db.add(new_user)
    db.commit()
    print('Created cafer@example.com with password cafer123')
else:
    # Reset password
    existing.password_hash = pwd_context.hash('cafer123')
    db.commit()
    print('Password reset for cafer@example.com')

db.close()
