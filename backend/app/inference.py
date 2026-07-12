"""
inference.py

Loads the trained model + scaler ONCE at startup (not on every request — that
would be slow and wasteful), and provides a single function to go from an
audio file path to a full stress prediction result.
"""

import os
import joblib

from .feature_extraction import extract_features

# Paths to the model files, relative to this file's location
_MODEL_DIR = os.path.join(os.path.dirname(__file__), "ml_models")
_MODEL_PATH = os.path.join(_MODEL_DIR, "stress_model.pkl")
_SCALER_PATH = os.path.join(_MODEL_DIR, "scaler.pkl")

# Loaded once, at import time (i.e. once per server process, not per request)
model = joblib.load(_MODEL_PATH)
scaler = joblib.load(_SCALER_PATH)


def give_advice(stress_percent: float) -> list[str]:
    if stress_percent < 30:
        return ["You seem calm.", "Maintain your routine", "Stay hydrated"]
    elif stress_percent < 60:
        return ["Mild stress detected.", "Take short breaks", "Try stretching"]
    elif stress_percent < 80:
        return ["Moderate stress detected.", "Practice breathing exercises", "Relax your mind"]
    else:
        return ["High stress detected.", "Try meditation", "Take a longer break", "Reduce workload"]


class AudioTooShortError(Exception):
    """Raised when the audio clip is too short to extract meaningful features."""
    pass


def predict_stress(file_path: str) -> dict:
    """
    Run the full prediction pipeline on an audio file:
    extract features -> scale -> predict -> bucket into a level -> generate advice.

    Raises AudioTooShortError if the clip can't be analyzed.
    """
    features = extract_features(file_path)

    if features is None:
        raise AudioTooShortError("Audio clip is too short to analyze (need at least ~0.1s of audio).")

    features = features.reshape(1, -1)
    features_scaled = scaler.transform(features)

    prob = model.predict_proba(features_scaled)[0][1]
    stress_percent = round(float(prob) * 100, 1)

    if stress_percent < 40:
        level = "Low Stress"
    elif stress_percent < 70:
        level = "Moderate Stress"
    else:
        level = "High Stress"

    return {
        "stress_percent": stress_percent,
        "level": level,
        "advice": give_advice(stress_percent),
    }
