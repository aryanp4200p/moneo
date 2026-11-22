from __future__ import annotations

import asyncio
import io
import logging
import os
import re
from datetime import date as Date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.transaction import Transaction
from services.auto_categorizer import auto_categorize

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/receipt-ocr", tags=["Receipt OCR"])

MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_AMOUNT = Decimal("999999999999.99")

# Validate the actual decoded image format as well as the request content type.
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/octet-stream",  # Some mobile browsers send this.
}

# Do not hard-code a Windows path on Render/Linux.
TESSERACT_CMD = os.getenv("TESSERACT_CMD")
OCR_TIMEOUT_SECONDS = int(os.getenv("OCR_TIMEOUT_SECONDS", "20"))
MAX_IMAGE_DIMENSION = int(os.getenv("OCR_MAX_IMAGE_DIMENSION", "1200"))


def _get_ocr_dependencies():
    """Load optional OCR libraries only when an OCR request is made."""
    try:
        from PIL import Image, ImageEnhance, ImageFilter, ImageOps
        import pytesseract
    except ImportError as exc:
        logger.exception("OCR Python dependencies are missing")
        raise HTTPException(
            status_code=503,
            detail="OCR dependencies are missing. Install Pillow and pytesseract.",
        ) from exc

    if TESSERACT_CMD:
        pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

    return Image, ImageOps, ImageEnhance, ImageFilter, pytesseract


def _contains_keyword(text: str, keywords: list[str]) -> bool:
    for word in keywords:
        pattern = r"(?<!\w)" + re.escape(word).replace(r"\ ", r"\s+") + r"(?!\w)"
        if re.search(pattern, text or "", re.IGNORECASE):
            return True
    return False


def _guess_receipt_category(
    text: str,
    merchant: Optional[str] = None,
) -> Optional[str]:
    combined = f"{merchant or ''}\n{text or ''}".lower()

    if _contains_keyword(
        combined,
        [
            "restaurant", "food bill", "food total", "dining",
            "food court", "cafe", "catering", "starbucks",
            "coffee", "bakery", "pizza", "burger",
        ],
    ):
        return "Food"

    if _contains_keyword(
        combined,
        [
            "room rent", "room charges", "room tariff",
            "accommodation", "lodging", "check in", "check out",
            "guest house", "guesthouse", "stay charges",
            "suite charges", "resort", "motel", "hotel booking",
        ],
    ):
        return "Travel"

    try:
        return auto_categorize(
            merchant=merchant,
            note=(text or "")[:1000],
            transaction_type="expense",
        )
    except Exception:
        logger.exception("Automatic receipt categorization failed")
        return None


def _parse_decimal(value: str) -> Optional[Decimal]:
    value = value.strip().replace(",", "")
    try:
        amount = Decimal(value)
        if amount.is_finite() and Decimal("0") < amount <= MAX_AMOUNT:
            return amount
    except InvalidOperation:
        pass
    return None


def _extract_amount(text: str) -> Optional[float]:
    """
    Prefer explicitly labelled payable/total lines.
    Avoid subtotal, tax, discount, change and item-price lines.
    """
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    amount_pattern = re.compile(
        r"(?<![\w])(?:₹|Rs\.?|INR)?\s*"
        r"([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?"
        r"|[0-9]+(?:\.[0-9]{1,2})?)",
        re.IGNORECASE,
    )

    positive_labels = re.compile(
        r"\b(grand\s*total|net\s*total|amount\s*payable|"
        r"total\s*amount|amount\s*due|balance\s*due|"
        r"total\s*due|total\s*paid|payable|total)\b",
        re.IGNORECASE,
    )
    negative_labels = re.compile(
        r"\b(sub\s*total|subtotal|tax|gst|cgst|sgst|"
        r"discount|change|cash\s*tendered|round\s*off|"
        r"savings|advance)\b",
        re.IGNORECASE,
    )

    labelled_candidates: list[Decimal] = []
    currency_candidates: list[Decimal] = []

    for line in lines:
        matches = list(amount_pattern.finditer(line))
        if not matches:
            continue

        values = [
            amount
            for match in matches
            if (amount := _parse_decimal(match.group(1))) is not None
        ]
        if not values:
            continue

        if positive_labels.search(line) and not negative_labels.search(line):
            # The last amount on a total line is commonly the payable amount.
            labelled_candidates.append(values[-1])

        if re.search(r"(₹|Rs\.?|INR|\$|€|£)", line, re.IGNORECASE):
            currency_candidates.extend(values)

    if labelled_candidates:
        return float(labelled_candidates[-1])

    if currency_candidates:
        return float(max(currency_candidates))

    # Last fallback: largest plausible amount in the receipt.
    all_candidates: list[Decimal] = []
    for line in lines:
        if negative_labels.search(line):
            continue
        for match in amount_pattern.finditer(line):
            amount = _parse_decimal(match.group(1))
            if amount is not None:
                all_candidates.append(amount)

    return float(max(all_candidates)) if all_candidates else None


def _extract_date(text: str) -> tuple[Date, bool]:
    """Extract common Indian and international receipt date formats."""
    patterns = [
        (r"\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b", "ymd"),
        (r"\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b", "dmy"),
    ]

    for pattern, order in patterns:
        for match in re.finditer(pattern, text):
            try:
                a, b, c = map(int, match.groups())
                if order == "ymd":
                    year, month, day = a, b, c
                else:
                    day, month, year = a, b, c
                    if year < 100:
                        year += 2000
                return Date(year, month, day), True
            except ValueError:
                continue

    textual_pattern = (
        r"\b(\d{1,2})[-/\s]+([A-Za-z]{3,9})[-/,\s]+(\d{2,4})\b"
    )
    for match in re.finditer(textual_pattern, text):
        day, month_text, year = match.groups()
        if len(year) == 2:
            year = "20" + year

        for fmt in ("%d-%b-%Y", "%d-%B-%Y"):
            try:
                parsed = datetime.strptime(
                    f"{day}-{month_text}-{year}", fmt
                ).date()
                return parsed, True
            except ValueError:
                continue

    return Date.today(), False


def _clean_text(value: Any, max_length: int = 500) -> Optional[str]:
    if value is None:
        return None
    cleaned = " ".join(str(value).split()).strip()
    return cleaned[:max_length] or None


def _guess_merchant(lines: list[str]) -> Optional[str]:
    ignored = re.compile(
        r"\b(tax invoice|invoice|receipt|cash memo|bill no|"
        r"invoice no|gstin|date|original for recipient|"
        r"duplicate|customer copy|merchant copy)\b",
        re.IGNORECASE,
    )

    for line in lines[:10]:
        candidate = _clean_text(line, 120)
        if not candidate or ignored.search(candidate):
            continue
        if re.search(r"[A-Za-z]", candidate):
            return candidate

    return _clean_text(lines[0], 120) if lines else None


def _prepare_image_variants(raw: bytes):
    """
    Return a small set of OCR-friendly variants.
    Keep the original grayscale image: aggressive enhancement can hurt
    already-clear receipts.
    """
    Image, ImageOps, ImageEnhance, ImageFilter, _ = _get_ocr_dependencies()

    try:
        with Image.open(io.BytesIO(raw)) as original:
            image_format = (original.format or "").upper()
            if image_format not in ALLOWED_IMAGE_FORMATS:
                raise HTTPException(
                    status_code=400,
                    detail="Unsupported image format. Upload a JPG, PNG or WEBP image.",
                )

            # Correct phone-camera orientation from EXIF metadata.
            image = ImageOps.exif_transpose(original).convert("RGB")

            # Do not enlarge small images; only reduce very large images.
            image.thumbnail(
                (MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION),
                Image.Resampling.LANCZOS,
            )

            gray = ImageOps.grayscale(image)
            variants = [("grayscale", gray)]

            # Mild contrast variant, useful for faint thermal receipts.
            contrast = ImageEnhance.Contrast(gray).enhance(1.35)
            variants.append(("contrast", contrast))

            # Adaptive thresholding is optional and only a fallback.
            try:
                from PIL import ImageFilter
                threshold = contrast.point(
                    lambda pixel: 255 if pixel > 165 else 0
                )
                variants.append(("threshold", threshold))
            except Exception:
                logger.debug("Could not create threshold image", exc_info=True)

            return variants
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Could not decode uploaded receipt image")
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid supported image.",
        ) from exc


def _ocr_score(text: str) -> int:
    """A simple heuristic to rank OCR attempts, not a true confidence score."""
    if not text:
        return 0

    useful_chars = sum(char.isalnum() for char in text)
    lines = [line for line in text.splitlines() if line.strip()]
    score = useful_chars + min(len(lines), 30) * 3

    if re.search(r"\b(total|amount|payable|date|invoice|bill)\b", text, re.I):
        score += 25
    if re.search(r"(₹|Rs\.?|INR)", text, re.I):
        score += 10

    return score


def _run_ocr(raw: bytes) -> str:
    """Run a bounded number of OCR attempts and select the most useful text."""
    _, _, _, _, pytesseract = _get_ocr_dependencies()
    variants = _prepare_image_variants(raw)

    attempts = [
        ("grayscale", "--oem 3 --psm 6"),
        ("contrast", "--oem 3 --psm 6"),
    ]

    by_name = dict(variants)
    best_text = ""
    best_score = 0
    last_error: Optional[Exception] = None

    for variant_name, config in attempts:
        image = by_name.get(variant_name)
        if image is None:
            continue

        try:
            text = pytesseract.image_to_string(
                image,
                config=config,
                timeout=OCR_TIMEOUT_SECONDS,
            ).strip()

            score = _ocr_score(text)
            if score > best_score:
                best_text = text
                best_score = score

            # Stop early when a result contains enough useful receipt text.
            if len(text) >= 40 and score >= 65:
                break

        except RuntimeError as exc:
            last_error = exc
            logger.warning(
                "OCR attempt timed out or failed (variant=%s, config=%s)",
                variant_name,
                config,
            )
            # Avoid spending the whole request on repeated timeouts.
            break
        except Exception as exc:
            last_error = exc
            logger.exception("Tesseract OCR attempt failed")
            continue

    if not best_text:
        if last_error and "timeout" in str(last_error).lower():
            raise HTTPException(
                status_code=422,
                detail=(
                    "OCR processing took too long. Try cropping the receipt "
                    "or uploading a smaller image."
                ),
            )
        raise HTTPException(
            status_code=422,
            detail=(
                "No readable text was found. Check that the receipt is in focus, "
                "upright and well lit."
            ),
        )

    return best_text


class ReceiptSaveRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    amount: Decimal = Field(gt=0, le=MAX_AMOUNT)
    receipt_date: Optional[Date] = Field(default=None, alias="date")
    merchant: Optional[str] = Field(default=None, max_length=120)
    category: Optional[str] = Field(default=None, max_length=100)
    note: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, value: Decimal) -> Decimal:
        if not value.is_finite():
            raise ValueError("Amount must be finite.")
        if value.as_tuple().exponent < -2:
            raise ValueError("Amount must have at most two decimal places.")
        return value


@router.post("/preview")
async def preview_receipt(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """
    Read a receipt and return editable extracted fields.
    This endpoint does not save a transaction.
    """
    content_type = (file.content_type or "").lower().split(";")[0].strip()
    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Upload a JPG, PNG or WEBP receipt image.",
        )

    raw = await file.read(MAX_FILE_SIZE + 1)
    await file.close()

    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image must be 10 MB or smaller.",
        )

    # Tesseract and Pillow are synchronous; run them off the async event loop.
    extracted_text = await asyncio.to_thread(_run_ocr, raw)

    lines = [
        line.strip()
        for line in extracted_text.splitlines()
        if line.strip()
    ]

    merchant = _guess_merchant(lines)
    amount = _extract_amount(extracted_text)
    receipt_date, date_found = _extract_date(extracted_text)
    category = _guess_receipt_category(extracted_text, merchant)

    return {
        "merchant": merchant,
        "amount": amount,
        "date": receipt_date.isoformat(),
        "date_found": date_found,
        "category": category,
        "raw_text": extracted_text[:5000],
        "confidence_note": (
            "OCR results are estimates. Review the merchant, amount, date "
            "and category before saving."
        ),
    }


@router.post("/save")
def save_receipt_transaction(
    payload: ReceiptSaveRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Save the user-reviewed receipt fields as an expense transaction."""
    amount = payload.amount

    if not amount.is_finite() or amount <= 0 or amount > MAX_AMOUNT:
        raise HTTPException(
            status_code=400,
            detail="Enter a valid positive amount.",
        )

    merchant = _clean_text(payload.merchant, 120)
    note = _clean_text(payload.note, 1000)
    category = _clean_text(payload.category, 100)
    txn_date = payload.receipt_date or Date.today()

    if not category:
        category = _guess_receipt_category(note or "", merchant)

    txn = Transaction(
        user_id=current_user.id,
        amount=float(amount),
        type="expense",
        category=category,
        status="categorized" if category else "pending_category",
        merchant=merchant,
        date=txn_date,
        note=note,
        source="ocr",
    )

    try:
        db.add(txn)
        db.commit()
        db.refresh(txn)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Could not save receipt transaction")
        raise HTTPException(
            status_code=500,
            detail="Could not save the receipt transaction. Please try again.",
        ) from exc

    return txn
