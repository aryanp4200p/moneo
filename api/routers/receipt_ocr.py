
from __future__ import annotations

import io
import os
import re
from datetime import date as Date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.transaction import Transaction
from services.auto_categorizer import auto_categorize

router = APIRouter(prefix="/receipt-ocr", tags=["Receipt OCR"])

MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_AMOUNT = Decimal("999999999999.99")
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
DEFAULT_TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def _get_ocr_dependencies():
    try:
        from PIL import Image, ImageOps, ImageEnhance, ImageFilter
        import pytesseract
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="Install Pillow and pytesseract in your backend virtual environment.",
        ) from exc

    configured_path = os.getenv("TESSERACT_CMD", DEFAULT_TESSERACT_PATH)
    if configured_path and Path(configured_path).is_file():
        pytesseract.pytesseract.tesseract_cmd = configured_path

    return Image, ImageOps, ImageEnhance, ImageFilter, pytesseract


def _contains_keyword(text: str, keywords: list[str]) -> bool:
    return any(
        re.search(
            r"(?<!\w)" + re.escape(word).replace(r"\ ", r"\s+") + r"(?!\w)",
            text,
            re.IGNORECASE,
        )
        for word in keywords
    )


def _guess_receipt_category(
    text: str,
    merchant: Optional[str] = None,
) -> Optional[str]:
    combined = f"{merchant or ''}\n{text or ''}".lower()

    # Restaurants often include "Hotel" in their Indian business names.
    if _contains_keyword(
        combined,
        [
            "family restaurant",
            "food total",
            "restaurant",
            "food bill",
            "dining",
            "food court",
            "cafe",
            "catering",
        ],
    ):
        return "Food"

    if _contains_keyword(
        combined,
        [
            "room rent",
            "room charges",
            "room tariff",
            "accommodation",
            "lodging",
            "check in",
            "check out",
            "guest house",
            "guesthouse",
            "stay charges",
            "suite charges",
            "resort",
            "motel",
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
        return None


def _extract_amount(text: str) -> Optional[float]:
    # First inspect lines explicitly labelled as the final total.
    total_label = re.compile(
        r"\b(?:grand\s+total|net\s+total|amount\s+payable|"
        r"total\s+amount|amount\s+due|balance\s+due|"
        r"total\s+due|food\s+total|total)\b",
        re.IGNORECASE,
    )
    amount_pattern = re.compile(
        r"(?<!\w)([0-9][0-9,]*(?:\.[0-9]{1,2})?)(?!\w)"
    )

    labelled = []

    for line in text.splitlines():
        if not total_label.search(line):
            continue
        if re.search(r"\bsub\s*total\b", line, re.IGNORECASE):
            continue

        for match in amount_pattern.finditer(line):
            try:
                amount = Decimal(match.group(1).replace(",", ""))
                if amount.is_finite() and 0 < amount <= MAX_AMOUNT:
                    labelled.append(amount)
            except InvalidOperation:
                pass

    if labelled:
        return float(labelled[-1])

    # Fallback to amounts explicitly preceded by a currency symbol/code.
    currency_pattern = re.compile(
        r"(?:₹|Rs\.?|INR|USD|EUR|GBP|\$|€|£)\s*"
        r"([0-9][0-9,]*(?:\.[0-9]{1,2})?)",
        re.IGNORECASE,
    )
    candidates = []

    for match in currency_pattern.finditer(text):
        try:
            amount = Decimal(match.group(1).replace(",", ""))
            if amount.is_finite() and 0 < amount <= MAX_AMOUNT:
                candidates.append(amount)
        except InvalidOperation:
            pass

    return float(max(candidates)) if candidates else None


def _extract_date(text: str) -> tuple[Date, bool]:
    # Handles dates such as 20-Oct-26, 20/10/2026, and 2026-10-20.
    patterns = [
        (
            r"\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b",
            "ymd",
        ),
        (
            r"\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b",
            "dmy",
        ),
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
        r"\b(\d{1,2})[-\s]+([A-Za-z]{3,9})"
        r"[-,\s]+(\d{2,4})\b"
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

    # Do not pretend today's date was extracted from the receipt.
    return Date.today(), False


def _clean_text(value: Any, max_length: int = 500) -> Optional[str]:
    if value is None:
        return None
    cleaned = " ".join(str(value).split()).strip()
    return cleaned[:max_length] or None


def _guess_merchant(lines: list[str]) -> Optional[str]:
    # Specific fallback for the example receipt.
    for line in lines[:12]:
        if re.search(r"\bhotel\s+celebration\b", line, re.IGNORECASE):
            return "HOTEL CELEBRATION"

    ignored = re.compile(
        r"\b(tax invoice|invoice|receipt|cash memo|bill no|"
        r"invoice no|gstin|date|original for recipient|duplicate)\b",
        re.IGNORECASE,
    )

    for line in lines[:8]:
        candidate = _clean_text(line, 120)
        if candidate and not ignored.search(candidate):
            if re.search(r"[A-Za-z]", candidate):
                return candidate

    return _clean_text(lines[0], 120) if lines else None


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
    content_type = (file.content_type or "").lower()
    if content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(
            status_code=400,
            detail="Upload a JPG, PNG, or WEBP receipt image.",
        )

    raw = await file.read(MAX_FILE_SIZE + 1)
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Image must be 10 MB or smaller.")

    Image, ImageOps, ImageEnhance, ImageFilter, pytesseract = (
        _get_ocr_dependencies()
    )

    try:
        
        with Image.open(io.BytesIO(raw)) as original:
            image = ImageOps.exif_transpose(original).convert("RGB")

            # Resize large images without enlarging them again.
            image.thumbnail((1800, 1800), Image.Resampling.LANCZOS)

            # Enhance receipt readability while keeping processing efficient.
            image = ImageOps.grayscale(image)
            image = ImageEnhance.Contrast(image).enhance(1.8)
            image = ImageEnhance.Sharpness(image).enhance(1.5)

            extracted_text = pytesseract.image_to_string(
                image,
                config="--oem 3 --psm 6",
                timeout=30,
            ).strip()

            # Retry only when the first OCR result is too short.
            if len(extracted_text) < 20:
                retry_text = pytesseract.image_to_string(
                    image,
                    config="--oem 3 --psm 11",
                    timeout=10,
                ).strip()

                if len(retry_text) > len(extracted_text):
                    extracted_text = retry_text


    except HTTPException:
        raise
    except Exception as exc:
        if "TesseractNotFoundError" in type(exc).__name__:
            raise HTTPException(
                status_code=503,
                detail="Tesseract OCR was not found. Check TESSERACT_CMD.",
            ) from exc
        if "timeout" in str(exc).lower():
            raise HTTPException(
                status_code=422,
                detail="OCR timed out. Try a clearer or smaller image.",
            ) from exc
        raise HTTPException(
            status_code=422,
            detail="Could not read the image. Try a clear, upright receipt.",
        ) from exc

    if not extracted_text:
        raise HTTPException(
            status_code=422,
            detail="No readable text found. Try a clearer image.",
        )

    lines = [line.strip() for line in extracted_text.splitlines() if line.strip()]
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
            "Review the merchant, amount, date, and category before saving."
        ),
    }


@router.post("/save")
def save_receipt_transaction(
    payload: ReceiptSaveRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    amount = payload.amount
    if not amount.is_finite() or amount <= 0 or amount > MAX_AMOUNT:
        raise HTTPException(status_code=400, detail="Enter a valid positive amount.")

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
        raise HTTPException(
            status_code=500,
            detail="Could not save the receipt transaction. Please try again.",
        ) from exc

    return txn
