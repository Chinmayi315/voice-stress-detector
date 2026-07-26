# Voice Stress Detection — Backend v2

Adds: **user accounts, login-protected predictions, history tracking, explainability, and security (rate limiting + file size limits)**.

## What's new vs. v1

| Feature | What it does |
|---|---|
| **User accounts** | Register/login with email+password. Returns a JWT token. |
| **History/trends** | Every prediction is saved per-user. `GET /api/stress/history` returns all past predictions. |
| **Explainability** | Every prediction response now includes `feature_breakdown` — how much MFCC (vocal tone), Chroma (pitch), and Mel Spectrogram (energy) contributed to that specific result. |
| **Security** | Max 10 predictions/minute per IP address. Max 10MB file size. |

## New folder structure

```
backend/
├── app/
│   ├── main.py                # wires everything together
│   ├── database.py            # DB connection (Postgres via Neon, or local SQLite for dev)
│   ├── auth.py                # password hashing + JWT logic
│   ├── limiter.py             # shared rate-limiter instance
│   ├── inference.py           # prediction + explainability
│   ├── feature_extraction.py  # unchanged from before
│   ├── models/
│   │   └── db_models.py       # User + StressRecord tables
│   ├── schemas/
│   │   └── schemas.py         # request/response formats
│   ├── routers/
│   │   ├── auth_router.py     # /api/auth/register, /api/auth/login
│   │   └── stress_router.py   # /api/stress/predict, /api/stress/history
│   └── ml_models/
│       ├── stress_model.pkl
│       └── scaler.pkl
└── requirements.txt
```

## Local setup

Same as before, but there's one new step: setting the JWT secret.

```
py -3.11 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**Before running, set a real JWT secret** (don't skip this — the default is public in this code and insecure):
```
set JWT_SECRET_KEY=some-long-random-string-nobody-can-guess
```
(On Windows CMD. Use `$env:JWT_SECRET_KEY="..."` in PowerShell instead.)

For local development, you do NOT need to set `DATABASE_URL` — it automatically falls back to a local SQLite file (`local_dev.db`) so you can test everything without setting up Postgres.

## Run it

```
uvicorn app.main:app --reload --port 8000
```

Go to `http://localhost:8000/docs` — you'll now see 4 endpoints instead of 2:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/stress/predict` (now requires a token!)
- `GET /api/stress/history`

## How to test the full flow in /docs

1. **Register**: click `POST /api/auth/register` → Try it out → enter an email+password → Execute. Copy the `access_token` from the response.
2. **Authorize**: click the green **"Authorize"** button at the top of the page → paste your token → Authorize → Close.
3. Now `POST /api/stress/predict` will work — upload a `.wav` file, Execute, see your prediction WITH the `feature_breakdown` explainability field.
4. Try `GET /api/stress/history` → Execute → see your saved prediction.

## Setting up Neon (for production/deployment)

Render's free PostgreSQL expires after 30 days — not good for a semester project. Neon's free tier doesn't expire, so we use Neon for the database and Render just for hosting the API.

1. Go to https://neon.tech, sign up (free).
2. Create a new project.
3. Copy the connection string it gives you (starts with `postgresql://...`).
4. On Render, when you deploy this backend, add an environment variable:
   ```
   DATABASE_URL = <your Neon connection string>
   JWT_SECRET_KEY = <a real random secret>
   ```

That's it — the app automatically uses Postgres instead of SQLite when `DATABASE_URL` is set.

## Explainability — how it actually works (for your report)

Random Forest models expose `feature_importances_` — a global measure of which of the 180 features matter most across all its training data. To make this useful for a *specific* prediction (not just "in general"), we multiply that global importance by how extreme this particular clip's feature values are, then group the 180 raw features into 3 understandable buckets:
- **MFCC** (0-39): vocal tone/pitch characteristics
- **Chroma** (40-51): pitch class energy
- **Mel Spectrogram** (52-179): overall spectral energy

This is a lightweight, honest approach — not as mathematically rigorous as SHAP values, but computationally cheap and easy to explain in your report without extra heavy dependencies.
