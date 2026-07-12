"""
feature_extraction.py

This is the EXACT SAME feature extraction logic used in the training notebook.
It must never be edited independently of the notebook version — if the two
ever compute features differently, the model will make wrong predictions in
production, because it will be seeing inputs shaped differently than what
it was trained on.
"""

import numpy as np
import librosa


def extract_features(file_path: str, duration: float = 3.0, offset: float = 0.5):
    """
    Extract MFCC + Chroma + Mel Spectrogram features from an audio file.

    Returns a 1D numpy array of 180 features (40 MFCC + 12 Chroma + 128 Mel),
    or None if the clip is too short to analyze reliably.
    """
    y, sr = librosa.load(file_path, duration=duration, offset=offset)

    if len(y) < 2048:
        return None

    mfcc = np.mean(librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40).T, axis=0)
    chroma = np.mean(librosa.feature.chroma_stft(y=y, sr=sr).T, axis=0)
    mel = np.mean(librosa.feature.melspectrogram(y=y, sr=sr).T, axis=0)

    return np.hstack((mfcc, chroma, mel))
