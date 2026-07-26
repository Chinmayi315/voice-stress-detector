"""
database.py

Database connection setup. Uses PostgreSQL in production (Neon), but falls
back to a local SQLite file if DATABASE_URL isn't set - so you can develop
and test locally without needing a real Postgres database running.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# In production, set DATABASE_URL to your Neon connection string, e.g.:
# postgresql://user:password@ep-xxxx.neon.tech/dbname?sslmode=require
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./local_dev.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,   # test each connection before using it, reconnect if stale
    pool_recycle=300,     # refresh connections every 5 minutes, before Neon can put them to sleep
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency - gives each request its own DB session, closes it after."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
