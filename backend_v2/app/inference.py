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


ADVICE_POOL = {
    "low": [
        "Your voice shows calm, steady patterns.",
        "Keep up whatever you're doing — it's working.",
        "Good moment to lock in a healthy routine (sleep, water, movement).",
        "No action needed — just maintain consistency.",
    ],
    "mild": [
        "Some mild tension came through in your voice.",
        "A short 5-minute walk can reset your nervous system.",
        "Try box breathing: inhale 4s, hold 4s, exhale 4s, hold 4s.",
        "Stretch your neck and shoulders — tension often hides there first.",
    ],
    "moderate": [
        "Noticeable stress patterns detected in your speech.",
        "Try the 4-7-8 breathing technique: inhale 4s, hold 7s, exhale 8s.",
        "Step away from screens for 10 minutes if you can.",
        "A short journal entry on what's on your mind can help externalize it.",
    ],
    "high": [
        "Strong stress markers detected — worth pausing for.",
        "Try grounding: name 5 things you see, 4 you hear, 3 you feel.",
        "If possible, take a real break — not just a scroll break.",
        "Consider talking to someone you trust about what's on your mind.",
        "If this persists day to day, a conversation with a counselor can help.",
    ],
}

DOMINANT_FACTOR_NOTE = {
    "mfcc": "Your vocal tone/pitch shifted the most — often linked to tension in speech rhythm.",
    "chroma": "Pitch variation stood out most — can reflect emotional intensity in speech.",
    "mel": "Overall vocal energy/loudness stood out most — often tied to how much effort/tension is in your voice.",
}


def give_advice(stress_percent: float, dominant_factor: str) -> list[str]:
    if stress_percent < 30:
        pool = ADVICE_POOL["low"]
    elif stress_percent < 55:
        pool = ADVICE_POOL["mild"]
    elif stress_percent < 75:
        pool = ADVICE_POOL["moderate"]
    else:
        pool = ADVICE_POOL["high"]

    advice = list(pool[:3])  # first 3 from the relevant pool, kept in fixed order for consistency
    advice.append(DOMINANT_FACTOR_NOTE[dominant_factor])
    return advice


def _explain(features_scaled: np.ndarray) -> tuple[dict, str]:
    """
    Compute a per-instance contribution breakdown across MFCC/Chroma/Mel groups.
    contribution_i = global_importance_i * |scaled_value_i|
    Then normalized so the three groups sum to 100%. Also returns which
    group dominated, for use in tailoring advice.
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
        return {"mfcc_contribution": 0.0, "chroma_contribution": 0.0, "mel_contribution": 0.0}, "mfcc"

    breakdown = {
        "mfcc_contribution": round(100 * mfcc_c / total, 1),
        "chroma_contribution": round(100 * chroma_c / total, 1),
        "mel_contribution": round(100 * mel_c / total, 1),
    }
    dominant = max(breakdown, key=breakdown.get).replace("_contribution", "")
    return breakdown, dominant


def _tree_agreement(features_scaled: np.ndarray, predicted_class: int) -> tuple[float, str]:
    """
    GENUINE statistical confidence measure: Random Forest is 500 individual
    decision trees voting. Instead of just looking at the averaged probability,
    we check what fraction of the 500 trees actually agree with the final
    predicted class. High agreement = the trees strongly agree = confident
    prediction. Agreement near 50% = the forest is genuinely split/unsure.
    This is real ensemble statistics, not a made-up number.
    """
    votes = np.array([est.predict(features_scaled)[0] for est in model.estimators_])
    n_trees = len(votes)
    agreement_pct = round(float(np.sum(votes == predicted_class)) / n_trees * 100, 1)

    if agreement_pct >= 80:
        label = "High confidence"
    elif agreement_pct >= 60:
        label = "Moderate confidence"
    else:
        label = "Low confidence — mixed signals from the model"

    return agreement_pct, label


def predict_stress(file_path: str) -> dict:
    features = extract_features(file_path)

    if features is None:
        raise AudioTooShortError("Audio clip is too short to analyze (need at least ~0.1s of audio).")

    features = features.reshape(1, -1)
    features_scaled = scaler.transform(features)

    prob = model.predict_proba(features_scaled)[0][1]
    stress_percent = round(float(prob) * 100, 1)
    predicted_class = 1 if prob >= 0.5 else 0

    if stress_percent < 40:
        level = "Low Stress"
    elif stress_percent < 70:
        level = "Moderate Stress"
    else:
        level = "High Stress"

    feature_breakdown, dominant_factor = _explain(features_scaled)
    agreement_pct, confidence_label = _tree_agreement(features_scaled, predicted_class)

    return {
        "stress_percent": stress_percent,
        "level": level,
        "confidence_percent": agreement_pct,
        "confidence_label": confidence_label,
        "advice": give_advice(stress_percent, dominant_factor),
        "feature_breakdown": feature_breakdown,
    }