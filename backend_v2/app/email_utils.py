"""
email_utils.py
Sends password reset emails via Resend API (HTTP, works on Render free tier).
"""

import os
import resend

resend.api_key = os.environ.get("RESEND_API_KEY")


def send_reset_code_email(to_email: str, code: str):
    body = f"""Hi,

You requested a password reset. Use this code in the app to reset your password:

{code}

This code expires in 15 minutes. If you didn't request this, you can ignore this email.
"""

    resend.Emails.send({
        "from": "onboarding@resend.dev",
        "to": to_email,
        "subject": "Your Voice Stress Detector password reset code",
        "text": body,
    })