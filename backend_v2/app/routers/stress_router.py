"""
routers/stress_router.py

- POST /api/stress/predict   - requires login, saves each prediction to history
- GET  /api/stress/history   - returns the logged-in user's past predictions
"""

import os
import tempfile
import uuid

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from pydub import AudioSegment

from ..database import get_db
from ..auth import get_current_user
from ..models.db_models import User, StressRecord
from ..schemas.schemas import StressPredictionResponse, HistoryRecord
from ..inference import predict_stress, AudioTooShortError
from ..limiter import limiter

router = APIRouter(prefix="/api/stress", tags=["stress"])

SUPPORTED_EXTENSIONS = {".wav", ".m4a", ".mp3", ".aac", ".ogg"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB - security: block oversized uploads


@router.post("/predict", response_model=StressPredictionResponse)
@limiter.limit("10/minute")  # security: max 10 predictions per minute per IP
async def predict(
    request: Request,  # required by slowapi, even though we don't use it directly
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Supported: {sorted(SUPPORTED_EXTENSIONS)}",
        )

    contents = await file.read()

    # Security: reject oversized uploads before doing any processing
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size is {MAX_FILE_SIZE_BYTES // (1024*1024)}MB.",
        )

    tmp_dir = tempfile.gettempdir()
    raw_path = os.path.join(tmp_dir, f"{uuid.uuid4()}{ext}")
    wav_path = raw_path

    try:
        with open(raw_path, "wb") as f:
            f.write(contents)

        if ext != ".wav":
            wav_path = os.path.join(tmp_dir, f"{uuid.uuid4()}.wav")
            audio = AudioSegment.from_file(raw_path, format=ext.replace(".", ""))
            audio.export(wav_path, format="wav")

        try:
            result = predict_stress(wav_path)
        except AudioTooShortError as e:
            raise HTTPException(status_code=422, detail=str(e))

        # Save to history
        record = StressRecord(
            user_id=current_user.id,
            stress_percent=result["stress_percent"],
            level=result["level"],
            feature_breakdown=result["feature_breakdown"],
        )
        db.add(record)
        db.commit()

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not process audio file: {str(e)}")

    finally:
        for path in {raw_path, wav_path}:
            if path and os.path.exists(path):
                os.remove(path)


@router.get("/history", response_model=list[HistoryRecord])
def get_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = (
        db.query(StressRecord)
        .filter(StressRecord.user_id == current_user.id)
        .order_by(StressRecord.created_at.desc())
        .all()
    )
    return records
