import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Render se DATABASE_URL environment variable pull hoga
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Agar Render 'postgres://' deta hai toh usse SQLAlchemy compatible format me change karo
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith(
    "postgres://"
):
  SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(
      "postgres://", "postgresql+psycopg2://", 1
  )

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()
