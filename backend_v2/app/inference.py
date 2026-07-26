"""
inference.py

Prediction pipeline + a simple, honest explainability layer.

EXPLAINABILITY APPROACH:
Random Forest gives us `feature_importances_` - how much each of the 180
features matters GLOBALLY across all predictions the model makes. To make
this useful PER-PREDICTION (i.e. "why did THIS clip score high"), we combine
that global importance with how unusual this specific clip's feature values
are (their scaled magnitude). This is a lightweight, defensible approach -
not as rigorous as SHAP values, but honest, fast, and doesn't add heavy
dependencies. We group the 180 raw features into 3 human-understandable
buckets (MFCC/Chroma/Mel) since "feature #47 contributed 2.3%" means nothing
to an end user, but "vocal tone contributed 45%" does.
"""

import os
import joblib
import numpy as np

from .feature_extraction import extract_features, MFCC_RANGE, CHROMA_RANGE, MEL_RANGE

_MODEL_DIR = os.path.join(os.path.dirname(__file__), "ml_models")
model = joblib.load(os.path.join(_MODEL_DIR, "stress_model.pkl"))
scaler = joblib.load(os.path.join(_MODEL_DIR, "scaler.pkl"))

# Precompute once - doesn't change per request
_FEATURE_IMPORTANCES = model.feature_importances_


class AudioTooShortError(Exception):
    pass


def give_advice(stress_percent: float) -> list[str]:
    if stress_percent < 30:
        return ["You seem calm.", "Maintain your routine", "Stay hydrated"]
    elif stress_percent < 60:
        return ["Mild stress detected.", "Take short breaks", "Try stretching"]
    elif stress_percent < 80:
        return ["Moderate stress detected.", "Practice breathing exercises", "Relax your mind"]
    else:
        return ["High stress detected.", "Try meditation", "Take a longer break", "Reduce workload"]


def _explain(features_scaled: np.ndarray) -> dict:
    """
    Compute a per-instance contribution breakdown across MFCC/Chroma/Mel groups.
    contribution_i = global_importance_i * |scaled_value_i|
    Then normalized so the three groups sum to 100%.
    """
    magnitude = np.abs(features_scaled[0])
    contribution = _FEATURE_IMPORTANCES * magnitude

    def group_sum(rng):
        start, end = rng
        return float(np.sum(contribution[start:end]))

    mfcc_c = group_sum(MFCC_RANGE)
    chroma_c = group_sum(CHROMA_RANGE)
    mel_c = group_sum(MEL_RANGE)

    total = mfcc_c + chroma_c + mel_c
    if total == 0:
        # Avoid divide-by-zero on a degenerate/silent clip
        return {"mfcc_contribution": 0.0, "chroma_contribution": 0.0, "mel_contribution": 0.0}

    return {
        "mfcc_contribution": round(100 * mfcc_c / total, 1),
        "chroma_contribution": round(100 * chroma_c / total, 1),
        "mel_contribution": round(100 * mel_c / total, 1),
    }


def predict_stress(file_path: str) -> dict:
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
        "feature_breakdown": _explain(features_scaled),
    }
