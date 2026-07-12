"""
schemas.py

Pydantic models defining the shape of API responses.
FastAPI uses these to validate output and auto-generate API docs (visible at /docs).
"""

from pydantic import BaseModel


class StressPredictionResponse(BaseModel):
    stress_percent: float
    level: str
    advice: list[str]


class ErrorResponse(BaseModel):
    detail: str
