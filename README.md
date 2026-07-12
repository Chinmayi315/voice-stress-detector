# Voice Stress Detection System

A mobile-first application that detects stress levels from a user's voice recording, using acoustic features (MFCC, Chroma, Mel Spectrogram) and a trained machine learning model.

## Project structure

```
voice-stress-detector/
├── backend/          # FastAPI backend — serves predictions via REST API
│   ├── app/
│   ├── requirements.txt
│   └── README.md     # backend-specific setup instructions
├── notebooks/         # Training notebook (feature extraction + model training)
├── mobile/            # React Native mobile app (recording + results UI)
└── README.md          # you are here
```

## How it works

1. User records their voice in the mobile app.
2. The recording is sent to the FastAPI backend.
3. The backend extracts acoustic features (MFCC, Chroma, Mel Spectrogram) from the audio.
4. A trained Random Forest model predicts a stress probability.
5. The app displays the stress level (Low / Moderate / High) along with tailored advice.

## Model performance

Trained on the RAVDESS dataset (emotions grouped into stress vs. non-stress):

| Model | Accuracy | Precision | Recall | F1-score |
|---|---|---|---|---|
| Logistic Regression | 63.9% | 68.7% | 59.7% | 63.9% |
| SVM | 64.9% | 74.8% | 51.9% | 61.3% |
| **Random Forest (deployed)** | **72.6%** | **74.2%** | **74.7%** | **74.4%** |

## Setup

See `backend/README.md` for backend setup and run instructions.
Mobile app setup instructions will be added once that folder exists.

## Team

Built by Chinmayi MH [Team leader], H C Ganavi, Jasmine Vegas, Meghana T [Team members] as a semester project.
