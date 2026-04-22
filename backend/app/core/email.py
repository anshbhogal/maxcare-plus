import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_email(to_email: str, subject: str, body: str, html_content: str = None):
    """
    Base utility to send email via SMTP.
    If settings.EMAILS_ENABLED is False, it just logs the email.
    """
    if not settings.EMAILS_ENABLED:
        logger.info(f"EMAIL SIMULATION [To: {to_email}]: Subject: {subject} | Body: {body}")
        # In dev, we also print to console for visibility
        print(f"\n--- EMAIL SENT (SIMULATED) ---\nTo: {to_email}\nSubject: {subject}\nBody: {body}\n------------------------------\n")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = to_email

        # Attach text and optionally HTML
        msg.attach(MIMEText(body, "plain"))
        if html_content:
            msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            
        logger.info(f"Email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")

def send_otp_email(to_email: str, otp_code: str):
    subject = "Your MaxCare+ Password Reset OTP"
    body = f"Hello,\n\nYour OTP for password reset is: {otp_code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email."
    send_email(to_email, subject, body)

def send_appointment_confirmation(to_email: str, patient_name: str, doctor_name: str, appt_date: str, appt_time: str, ref: str):
    subject = f"Appointment Confirmed - {ref}"
    body = (
        f"Dear {patient_name},\n\n"
        f"Your appointment at MaxCare+ has been successfully booked.\n\n"
        f"Details:\n"
        f"- Doctor: {doctor_name}\n"
        f"- Date: {appt_date}\n"
        f"- Time: {appt_time}\n"
        f"- Reference ID: {ref}\n\n"
        f"Please arrive 15 minutes before your slot.\n\n"
        f"Thank you for choosing MaxCare+."
    )
    send_email(to_email, subject, body)
