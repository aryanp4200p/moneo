
import logging
import smtplib
from email.message import EmailMessage

from core.config import settings

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, html_body: str) -> None:
    """Send an HTML email using Gmail SMTP."""

    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        raise RuntimeError("Email SMTP credentials are not configured.")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = (
        f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM or settings.SMTP_USERNAME}>"
    )
    message["To"] = to_email
    message.set_content("Please open this email in an HTML-compatible email client.")
    message.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(message)
    except Exception:
        logger.exception("Failed to send email to %s", to_email)
        raise
