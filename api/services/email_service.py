
import json
import logging
import os
import urllib.error
import urllib.request

from core.config import settings

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def send_email(to_email: str, subject: str, html_body: str) -> None:
    """Send transactional email through Brevo's HTTPS API."""

    api_key = os.getenv("BREVO_API_KEY")
    if not api_key:
        raise RuntimeError("BREVO_API_KEY is not configured.")

    sender_email = settings.EMAIL_FROM or settings.SMTP_USERNAME
    sender_name = settings.EMAIL_FROM_NAME or "Moneo"

    if not sender_email:
        raise RuntimeError("Email sender address is not configured.")

    payload = {
        "sender": {
            "name": sender_name,
            "email": sender_email,
        },
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_body,
        "textContent": (
            "Please open this email in an HTML-compatible email client."
        ),
    }

    request = urllib.request.Request(
        BREVO_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            if response.status not in (200, 201, 202):
                raise RuntimeError(
                    f"Brevo returned unexpected status {response.status}."
                )
            logger.info("Email accepted by Brevo for delivery.")

    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        logger.error(
            "Brevo email API returned HTTP %s: %s",
            exc.code,
            error_body,
        )
        raise RuntimeError(
            f"Brevo email API request failed with HTTP {exc.code}."
        ) from exc

    except urllib.error.URLError:
        logger.exception("Could not connect to Brevo email API.")
        raise
