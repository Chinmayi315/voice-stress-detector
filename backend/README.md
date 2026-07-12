# Voice Stress Detection — Backend

FastAPI backend that wraps the trained model from `stress_detection_fixed.ipynb`.

## Folder structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                # FastAPI app + /api/stress/predict endpoint
│   ├── inference.py           # loads model+scaler once, runs prediction
│   ├── feature_extraction.py  # EXACT same feature logic as the training notebook
│   ├── schemas.py             # response models
│   └── ml_models/
│       ├── stress_model.pkl
│       └── scaler.pkl
└── requirements.txt
```

## Setup (run locally first, before deploying)

1. Create a virtual environment (keeps this project's packages separate from everything else on your machine):
   ```
   python -m venv venv
   ```
2. Activate it:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

   **Note on scikit-learn version:** `requirements.txt` pins `scikit-learn==1.6.1` because that's the version your `.pkl` files were saved with. Check your own notebook's version with:
   ```python
   import sklearn; print(sklearn.__version__)
   ```
   If it's different, update the pin in `requirements.txt` to match — otherwise you may get "InconsistentVersionWarning" and, in rare cases, subtly different predictions.

## Run the server

```
uvicorn app.main:app --reload --port 8000
```

Then open **http://localhost:8000/docs** in your browser — FastAPI auto-generates an interactive test page. You can upload a `.wav` file directly there and see the JSON response, no mobile app needed yet.

## API

**`GET /`** — health check, returns `{"status": "ok"}`

**`POST /api/stress/predict`** — the real endpoint
- Body: `multipart/form-data` with a `file` field (wav, m4a, mp3, aac, or ogg)
- Success response (200):
  ```json
  {
    "stress_percent": 87.0,
    "level": "High Stress",
    "advice": ["High stress detected.", "Try meditation", "Take a longer break", "Reduce workload"]
  }
  ```
- Error responses:
  - `400` — unsupported file type, or the file is corrupt/unreadable
  - `422` — audio clip too short to analyze (needs a fraction of a second minimum)

## What was tested already

Before handing this to you, I ran it through:
- Health check ✅
- A real prediction request end-to-end ✅
- A too-short audio clip → correctly returns `422` instead of crashing ✅
- An unsupported file type (`.txt`) → correctly returns `400` ✅

## Next steps
- Deploy this to Railway (same as VAYO) — you'll need to add `stress_model.pkl` and `scaler.pkl` to the repo (they're small, fine to commit) and set the start command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Once deployed, the mobile app just needs the Railway URL + this one endpoint to work
