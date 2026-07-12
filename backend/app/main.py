"""
main.py

FastAPI backend for the Voice-Based Stress Detection System.

Run locally with:
    uvicorn app.main:app --reload --port 8000

Then visit http://localhost:8000/docs to test the endpoint interactively.
"""

import os
import tempfile
import uuid

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydub import AudioSegment

from .inference import predict_stress, AudioTooShortError
from .schemas import StressPredictionResponse

app = FastAPI(
    title="Voice Stress Detection API",
    description="Upload a voice recording and get a stress prediction back.",
    version="1.0.0",
)

# Allow the mobile app (and browser testing) to call this API from any origin.
# Tighten this to your app's actual domain once you deploy, for security.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Audio formats we accept from the mobile app. Anything not .wav gets converted.
SUPPORTED_EXTENSIONS = {".wav", ".m4a", ".mp3", ".aac", ".ogg"}


@app.get("/")
def health_check():
    """Simple endpoint to confirm the API is up (useful for Railway health checks)."""
    return {"status": "ok", "message": "Voice Stress Detection API is running"}


@app.post("/api/stress/predict", response_model=StressPredictionResponse)
async def predict(file: UploadFile = File(...)):
    """
    Accepts an audio file (wav, m4a, mp3, aac, ogg), runs it through the
    stress detection model, and returns the prediction.
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Supported: {sorted(SUPPORTED_EXTENSIONS)}",
        )

    # Save the uploaded file to a temp path, since librosa/pydub need a real file path
    tmp_dir = tempfile.gettempdir()
    raw_path = os.path.join(tmp_dir, f"{uuid.uuid4()}{ext}")

    try:
        contents = await file.read()
        with open(raw_path, "wb") as f:
            f.write(contents)

        # Convert to wav if needed (librosa handles wav most reliably)
        if ext != ".wav":
            wav_path = os.path.join(tmp_dir, f"{uuid.uuid4()}.wav")
            audio = AudioSegment.from_file(raw_path, format=ext.replace(".", ""))
            audio.export(wav_path, format="wav")
        else:
            wav_path = raw_path

        try:
            result = predict_stress(wav_path)
        except AudioTooShortError as e:
            raise HTTPException(status_code=422, detail=str(e))

        return result

    except HTTPException:
        raise
    except Exception as e:
        # Catch-all for corrupt files, unsupported codecs, etc. — return a clean
        # error instead of a raw 500 stack trace to the mobile app.
        raise HTTPException(status_code=400, detail=f"Could not process audio file: {str(e)}")

    finally:
        # Always clean up temp files, even if something failed above
        for path in {raw_path, locals().get("wav_path")}:
            if path and os.path.exists(path):
                os.remove(path)
