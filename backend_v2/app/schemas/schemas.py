from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class FeatureBreakdown(BaseModel):
    mfcc_contribution: float   # vocal tone / pitch characteristics
    chroma_contribution: float  # pitch class energy
    mel_contribution: float     # overall spectral energy


class StressPredictionResponse(BaseModel):
    stress_percent: float
    level: str
    confidence_percent: float
    confidence_label: str
    advice: list[str]
    feature_breakdown: FeatureBreakdown


class HistoryRecord(BaseModel):
    id: int
    stress_percent: float
    level: str
    created_at: datetime

    class Config:
        from_attributes = True
