"""
models/db_models.py

Database tables:
- User: one row per registered person
- StressRecord: one row per prediction made, linked to the user who made it
                (this is what powers the "history / trends over time" feature)
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    reset_code_hash = Column(String, nullable=True)
    reset_code_expires = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    records = relationship("StressRecord", back_populates="user")


class StressRecord(Base):
    __tablename__ = "stress_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stress_percent = Column(Float, nullable=False)
    level = Column(String, nullable=False)
    feature_breakdown = Column(JSON, nullable=True)  # explainability data, stored alongside
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="records")
