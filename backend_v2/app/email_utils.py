"""
email_utils.py
Sends password reset emails via Gmail SMTP.
"""

import os
import smtplib
from email.mime.text import MIMEText

GMAIL_ADDRESS = os.environ.get("GMAIL_ADDRESS")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD")


def send_reset_code_email(to_email: str, code: str):
    subject = "Your Voice Stress Detector password reset code"
    body = f"""Hi,

You requested a password reset. Use this code in the app to reset your password:

{code}

This code expires in 15 minutes. If you didn't request this, you can ignore this email.
"""

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = GMAIL_ADDRESS
    msg["To"] = to_email

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
        server.sendmail(GMAIL_ADDRESS, to_email, msg.as_string())
