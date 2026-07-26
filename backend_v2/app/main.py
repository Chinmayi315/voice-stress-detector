"""
main.py

Run locally with:
    uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .database import Base, engine
from .models import db_models  # noqa: F401 - ensures models are registered before create_all
from .routers import auth_router, stress_router
from .limiter import limiter

# Create all tables on startup if they don't exist yet
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Voice Stress Detection API",
    description="Upload a voice recording and get a stress prediction back.",
    version="2.0.0",
)

# --- Security: rate limiting ---
# Limits how many requests a single IP can make, to prevent abuse/spamming the API.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your app's actual domain once deployed
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(stress_router.router)


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Voice Stress Detection API is running"}
