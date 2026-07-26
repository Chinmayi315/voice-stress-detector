"""
feature_extraction.py
Identical to the training notebook's version - do not edit independently.
"""

import numpy as np
import librosa


def extract_features(file_path: str, duration: float = 3.0, offset: float = 0.5):
    y, sr = librosa.load(file_path, duration=duration, offset=offset)

    if len(y) < 2048:
        return None

    mfcc = np.mean(librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40).T, axis=0)
    chroma = np.mean(librosa.feature.chroma_stft(y=y, sr=sr).T, axis=0)
    mel = np.mean(librosa.feature.melspectrogram(y=y, sr=sr).T, axis=0)

    return np.hstack((mfcc, chroma, mel))


# Index ranges within the 180-dim feature vector, used for explainability grouping
MFCC_RANGE = (0, 40)
CHROMA_RANGE = (40, 52)
MEL_RANGE = (52, 180)
