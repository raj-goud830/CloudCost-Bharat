
from database import engine, Base
import db_models

def create_tables():
    Base.metadata.create_all(bind=engine)
    print("CloudCost Bharat database tables created successfully!")

if __name__ == "__main__":
    create_tables()
