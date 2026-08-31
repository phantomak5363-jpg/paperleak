from sqlalchemy.orm import Session
from app.db.database import engine, Base
from app.db.models import User, UserRole
from app.core.security import get_password_hash

def seed_users():
    Base.metadata.create_all(bind=engine)
    with Session(engine) as db:
        if db.query(User).first():
            print("Users already exist. Skipping seed.")
            return

        users = [
            User(username="admin", email="admin@exam.com", hashed_password=get_password_hash("admin"), full_name="System Admin", role=UserRole.ADMIN, department="IT Security"),
            User(username="setter1", email="setter1@exam.com", hashed_password=get_password_hash("setter1"), full_name="Paper Setter 1", role=UserRole.PAPER_SETTER, department="Computer Science"),
            User(username="setter2", email="setter2@exam.com", hashed_password=get_password_hash("setter2"), full_name="Paper Setter 2", role=UserRole.PAPER_SETTER, department="Computer Science"),
            User(username="moderator", email="mod@exam.com", hashed_password=get_password_hash("moderator"), full_name="Exam Moderator", role=UserRole.MODERATOR, department="Academic Council"),
            User(username="controller", email="controller@exam.com", hashed_password=get_password_hash("controller"), full_name="Exam Controller", role=UserRole.EXAM_CONTROLLER, department="Examination Board"),
            User(username="printer", email="printer@exam.com", hashed_password=get_password_hash("printer"), full_name="Printing Staff", role=UserRole.PRINTING_STAFF, department="Secure Facility")
        ]
        
        db.add_all(users)
        db.commit()
        print("Database seeded with default users successfully.")

if __name__ == "__main__":
    seed_users()
