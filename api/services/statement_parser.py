"""Bank statement parser for CSV files and passbook images (100% local via pytesseract).
Supports:
1. Passbook CSV exports (Date, Particulars/Description, Cheque No, Debit, Credit, Balance)
2. Legacy CSV formats (Date, Amount, Type, Merchant, Note)
3. Passbook / m-Passbook photos & screenshots (.jpg, .png, .webp) via pytesseract
"""

import csv
import io
import re
from datetime import datetime

import pytesseract
from PIL import Image, ImageOps


DATE_FORMATS = [
    "%Y-%m-%d",
    "%d-%m-%Y",
    "%d/%m/%Y",
    "%Y/%m/%d",
    "%d.%m.%Y",
    "%d-%b-%Y",
    "%d %b %Y",
    "%d/%b/%Y",
    "%d-%m-%y",
    "%d/%m/%y",
]

OCR_DATE_PATTERN = re.compile(
    r"\b(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/.](?:\d{1,2}|[A-Za-z]{3})[-/.]\d{2,4})\b"
)

OCR_AMOUNT_PATTERN = re.compile(
    r"(?:₹|rs\.?\s*)?\b\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})\b|\b\d+(?:\.\d{1,2})\b",
    re.IGNORECASE,
)


class ParsedRow:
    def __init__(
        self,
        amount: float,
        type_: str,
        date,
        note: str | None,
        merchant: str | None,
        particulars: str | None = None,
        cheque_no: str | None = None,
        debit: float | None = None,
        credit: float | None = None,
        balance: float | None = None,
    ):
        self.amount = amount
        self.type = type_
        self.date = date
        self.note = note
        self.merchant = merchant
        self.particulars = particulars or note or merchant
        self.cheque_no = cheque_no
        self.debit = debit if debit is not None else (amount if type_ == "expense" else 0.0)
        self.credit = credit if credit is not None else (amount if type_ == "income" else 0.0)
        self.balance = balance


def _normalize_column_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower().strip())


def _parse_date(raw: str):
    if raw is None:
        raise ValueError("Date is empty")

    raw = str(raw).strip()
    if not raw:
        raise ValueError("Date is empty")

    date_part = raw.split()[0] if " " in raw and any(c in raw for c in ("-", "/", ".")) else raw

    for candidate in (raw, date_part):
        for fmt in DATE_FORMATS:
            try:
                return datetime.strptime(candidate, fmt).date()
            except ValueError:
                continue

    raise ValueError(f"Unrecognized date format: '{raw}'")


def _find_column(fieldnames: list[str], *candidates: str) -> str | None:
    normalized = {
        _normalize_column_name(name): name
        for name in fieldnames
        if name
    }

    for candidate in candidates:
        key = _normalize_column_name(candidate)
        if key in normalized:
            return normalized[key]

    return None


def _clean_amount(raw) -> float:
    if raw is None:
        raise ValueError("Amount is empty")

    value = str(raw).strip()
    if not value or value in ("-", "--", "—", "NIL", "nil", "N/A", "n/a"):
        return 0.0

    value = re.sub(r"(?i)\s*(cr|dr)\.?$", "", value).strip()
    value = re.sub(r"[₹$€£]", "", value)
    value = re.sub(r"(?i)rs\.?", "", value)
    value = value.replace(" ", "")

    if value.startswith("(") and value.endswith(")"):
        value = "-" + value[1:-1]

    value = value.replace(",", "")

    if not value or value in ("-", "."):
        return 0.0

    try:
        return float(value)
    except ValueError:
        raise ValueError(f"Invalid amount: '{raw}'")


def _get_text(row: dict, column: str | None) -> str | None:
    if not column:
        return None

    value = row.get(column)
    if value is None:
        return None

    value = str(value).strip()
    return value or None


def _find_header_offset(text: str) -> tuple[str, int]:
    lines = text.splitlines()
    date_tokens = {"date", "transactiondate", "txndate", "valuedate"}
    amount_tokens = {
        "amount",
        "debit",
        "credit",
        "withdrawal",
        "deposit",
        "withdrawalamount",
        "depositamount",
        "debitamount",
        "creditamount",
    }

    for idx, line in enumerate(lines[:30]):
        try:
            cells = next(csv.reader([line]))
        except Exception:
            continue

        norm_cells = {_normalize_column_name(c) for c in cells if c.strip()}
        if (norm_cells & date_tokens) and (norm_cells & amount_tokens):
            return "\n".join(lines[idx:]), idx + 1

    return text, 1


# =========================================================
# PARSE CSV STATEMENT
# =========================================================

def parse_csv(file_bytes: bytes) -> tuple[list[ParsedRow], list[dict]]:
    try:
        text = file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = file_bytes.decode("latin-1", errors="replace")

    table_text, header_line_num = _find_header_offset(text)
    reader = csv.DictReader(io.StringIO(table_text))

    if not reader.fieldnames:
        return [], [{"row_number": 0, "reason": "File has no header row / is empty"}]

    fieldnames = reader.fieldnames

    date_col = _find_column(
        fieldnames,
        "date",
        "transaction date",
        "txn date",
        "transaction_date",
        "txn_date",
        "value date",
        "value_date",
    )

    amount_col = _find_column(
        fieldnames,
        "amount",
        "amt",
        "value",
        "transaction amount",
        "transaction_amount",
    )

    debit_col = _find_column(
        fieldnames,
        "debit",
        "withdrawal",
        "withdrawals",
        "debit amount",
        "debit_amount",
        "withdrawal amount",
        "withdrawal_amount",
        "dr",
    )

    credit_col = _find_column(
        fieldnames,
        "credit",
        "deposit",
        "deposits",
        "credit amount",
        "credit_amount",
        "deposit amount",
        "deposit_amount",
        "cr",
    )

    type_col = _find_column(
        fieldnames,
        "type",
        "transaction type",
        "transaction_type",
        "dr/cr",
        "debit/credit",
    )

    note_col = _find_column(
        fieldnames,
        "particulars",
        "transaction particulars",
        "particular",
        "note",
        "description",
        "narration",
        "remarks",
        "details",
        "transaction details",
        "transaction_details",
    )

    merchant_col = _find_column(
        fieldnames,
        "merchant",
        "payee",
        "merchant name",
        "merchant_name",
        "beneficiary",
    )

    cheque_col = _find_column(
        fieldnames,
        "cheque no",
        "cheque number",
        "chq no",
        "chq./ref.no.",
        "chq ref no",
        "ref no",
        "reference no",
        "cheque_no",
    )

    balance_col = _find_column(
        fieldnames,
        "balance",
        "closing balance",
        "running balance",
        "available balance",
    )

    if not date_col:
        return [], [
            {
                "row_number": 0,
                "reason": "CSV must contain a date column. Accepted examples: Date, Transaction Date, Txn Date.",
            }
        ]

    if not amount_col and not debit_col and not credit_col:
        return [], [
            {
                "row_number": 0,
                "reason": "CSV must contain either an 'Amount' column or 'Debit'/'Credit' columns.",
            }
        ]

    rows: list[ParsedRow] = []
    errors: list[dict] = []

    for row_number, raw_row in enumerate(reader, start=header_line_num + 1):
        non_empty_values = [
            str(v).strip()
            for k, v in raw_row.items()
            if k is not None and v is not None and str(v).strip()
        ]
        if not non_empty_values:
            continue

        raw_date_str = str(raw_row.get(date_col) or "").strip()
        if not raw_date_str:
            continue

        try:
            date_val = _parse_date(raw_date_str)

            type_val = None
            amount_val = None
            debit_value = 0.0
            credit_value = 0.0

            if debit_col or credit_col:
                debit_raw = raw_row.get(debit_col) if debit_col else None
                credit_raw = raw_row.get(credit_col) if credit_col else None

                if debit_raw not in (None, ""):
                    debit_value = abs(_clean_amount(debit_raw))

                if credit_raw not in (None, ""):
                    credit_value = abs(_clean_amount(credit_raw))

                if debit_value == 0 and credit_value == 0:
                    raise ValueError("Both debit and credit amounts are empty")

                if debit_value > 0 and credit_value > 0:
                    raise ValueError(
                        "Both debit and credit contain amounts; unable to determine transaction type"
                    )

                if debit_value > 0:
                    amount_val = debit_value
                    type_val = "expense"
                elif credit_value > 0:
                    amount_val = credit_value
                    type_val = "income"

            elif amount_col:
                raw_amount = raw_row.get(amount_col)
                amount_val = _clean_amount(raw_amount)

                if type_col:
                    raw_type = (raw_row.get(type_col) or "").strip().lower()
                    if raw_type in ("income", "credit", "cr"):
                        type_val = "income"
                    elif raw_type in ("expense", "debit", "dr"):
                        type_val = "expense"

                if type_val is None:
                    type_val = "expense" if amount_val < 0 else "income"

                amount_val = abs(amount_val)
                if type_val == "expense":
                    debit_value = amount_val
                else:
                    credit_value = amount_val

            if amount_val is None or amount_val <= 0:
                raise ValueError("Amount must be greater than 0")

            note_val = _get_text(raw_row, note_col)
            merchant_val = _get_text(raw_row, merchant_col)
            cheque_val = _get_text(raw_row, cheque_col)

            balance_val = None
            if balance_col:
                raw_bal = raw_row.get(balance_col)
                if raw_bal not in (None, "", "-", "--", "—"):
                    balance_val = _clean_amount(raw_bal)

            rows.append(
                ParsedRow(
                    amount=amount_val,
                    type_=type_val,
                    date=date_val,
                    note=note_val,
                    merchant=merchant_val,
                    particulars=note_val or merchant_val,
                    cheque_no=cheque_val,
                    debit=debit_value,
                    credit=credit_value,
                    balance=balance_val,
                )
            )

        except Exception as e:
            errors.append({"row_number": row_number, "reason": str(e)})

    return rows, errors


# =========================================================
# PARSE PASSBOOK IMAGE (PYTESSERACT + PILLOW — NO API KEY)
# =========================================================

def _group_tesseract_words_into_rows(ocr_data: dict) -> list[list[dict]]:
    """
    Group pytesseract word bounding boxes by vertical Y-center into table rows
    and sort left-to-right so Debit, Credit, and Balance positions stay intact.
    """
    n = len(ocr_data.get("text", []))
    words = []

    for i in range(n):
        text = str(ocr_data["text"][i] or "").strip()
        try:
            conf = float(ocr_data["conf"][i])
        except (ValueError, TypeError):
            conf = -1

        if not text or conf < 35:
            continue

        left = float(ocr_data["left"][i])
        top = float(ocr_data["top"][i])
        width = float(ocr_data["width"][i])
        height = max(float(ocr_data["height"][i]), 10.0)

        words.append({
            "text": text,
            "x_min": left,
            "x_center": left + width / 2.0,
            "y_center": top + height / 2.0,
            "height": height,
        })

    if not words:
        return []

    words.sort(key=lambda w: w["y_center"])

    grouped_rows: list[list[dict]] = []
    current_row = [words[0]]

    for word in words[1:]:
        row_y = sum(w["y_center"] for w in current_row) / len(current_row)
        row_h = sum(w["height"] for w in current_row) / len(current_row)

        if abs(word["y_center"] - row_y) <= row_h * 0.7:
            current_row.append(word)
        else:
            current_row.sort(key=lambda w: w["x_min"])
            grouped_rows.append(current_row)
            current_row = [word]

    current_row.sort(key=lambda w: w["x_min"])
    grouped_rows.append(current_row)
    return grouped_rows


def _detect_column_x_bounds(grouped_rows: list[list[dict]]) -> dict[str, float]:
    bounds: dict[str, float] = {}
    for row in grouped_rows[:12]:
        for word in row:
            norm = _normalize_column_name(word["text"])
            if norm in ("debit", "withdrawal", "dr", "debitamount"):
                bounds["debit_x"] = word["x_center"]
            elif norm in ("credit", "deposit", "cr", "creditamount"):
                bounds["credit_x"] = word["x_center"]
            elif norm in ("balance", "closingbalance", "runningbalance"):
                bounds["balance_x"] = word["x_center"]
        if "debit_x" in bounds or "credit_x" in bounds:
            break
    return bounds


async def parse_image(
    file_bytes: bytes,
    mime_type: str | None = None,
) -> tuple[list[ParsedRow], list[dict]]:
    """
    Extract passbook rows (Date, Particulars, Cheque No, Debit, Credit, Balance)
    using local pytesseract + Pillow (zero API keys required).
    """
    try:
        image = Image.open(io.BytesIO(file_bytes))
        image = ImageOps.exif_transpose(image).convert("L")
        # Upscale small screenshots for sharper table digit recognition
        if image.width < 1200:
            scale = 2
            image = image.resize((image.width * scale, image.height * scale), Image.Resampling.LANCZOS)

        ocr_data = pytesseract.image_to_data(
            image,
            config="--psm 6",
            output_type=pytesseract.Output.DICT,
        )
    except pytesseract.TesseractNotFoundError:
        return [], [
            {
                "row_number": 0,
                "reason": "Tesseract OCR engine is not installed on the server.",
            }
        ]
    except Exception as e:
        return [], [
            {
                "row_number": 0,
                "reason": f"Could not read passbook image: {str(e)}",
            }
        ]

    grouped_rows = _group_tesseract_words_into_rows(ocr_data)
    if not grouped_rows:
        return [], [{"row_number": 0, "reason": "No readable text found in the uploaded image."}]

    col_bounds = _detect_column_x_bounds(grouped_rows)

    rows: list[ParsedRow] = []
    errors: list[dict] = []

    for row_idx, words in enumerate(grouped_rows, start=1):
        full_line = " ".join(w["text"] for w in words)

        date_match = OCR_DATE_PATTERN.search(full_line)
        if not date_match:
            continue

        try:
            date_val = _parse_date(date_match.group(0))
        except ValueError:
            continue

        try:
            amount_cells = []
            text_parts = []
            cheque_val = None

            for word in words:
                txt = word["text"].strip()
                if date_match.group(0) in txt and len(txt) <= len(date_match.group(0)) + 2:
                    continue

                cleaned_num_str = re.sub(r"(?i)(cr|dr|rs\.?|₹|,|\s)", "", txt)
                is_decimal_money = bool(re.fullmatch(r"\d+\.\d{1,2}", cleaned_num_str))

                if is_decimal_money:
                    val = abs(_clean_amount(txt))
                    if val > 0:
                        amount_cells.append({
                            "value": val,
                            "x_center": word["x_center"],
                            "raw": txt,
                        })
                elif re.fullmatch(r"\d{6,12}", txt) and not cheque_val:
                    cheque_val = txt
                else:
                    text_parts.append(txt)

            if not amount_cells:
                raise ValueError(f"No amount detected on row: '{full_line}'")

            amount_cells.sort(key=lambda a: a["x_center"])

            balance_val = None
            if len(amount_cells) >= 2:
                balance_val = amount_cells[-1]["value"]
                tx_amount_cell = amount_cells[-2]
            else:
                tx_amount_cell = amount_cells[0]

            tx_amount = tx_amount_cell["value"]
            particulars_val = " ".join(text_parts).strip() or None

            raw_amt_lower = tx_amount_cell["raw"].lower()
            line_lower = full_line.lower()
            is_credit = False

            if "cr" in raw_amt_lower or re.search(r"\bcr\b", line_lower):
                is_credit = True
            elif "dr" in raw_amt_lower or re.search(r"\bdr\b", line_lower):
                is_credit = False
            elif "debit_x" in col_bounds and "credit_x" in col_bounds:
                dist_debit = abs(tx_amount_cell["x_center"] - col_bounds["debit_x"])
                dist_credit = abs(tx_amount_cell["x_center"] - col_bounds["credit_x"])
                is_credit = dist_credit < dist_debit
            elif any(kw in line_lower for kw in ("salary", "credit", "deposit", "refund", "cashback", "int pd")):
                is_credit = True

            if is_credit:
                type_val = "income"
                debit_val = 0.0
                credit_val = tx_amount
            else:
                type_val = "expense"
                debit_val = tx_amount
                credit_val = 0.0

            rows.append(
                ParsedRow(
                    amount=tx_amount,
                    type_=type_val,
                    date=date_val,
                    note=particulars_val,
                    merchant=None,
                    particulars=particulars_val,
                    cheque_no=cheque_val,
                    debit=debit_val,
                    credit=credit_val,
                    balance=balance_val,
                )
            )

        except Exception as e:
            errors.append({"row_number": row_idx, "reason": str(e)})

    if not rows and not errors:
        errors.append(
            {
                "row_number": 0,
                "reason": "No dated transaction rows could be detected in the image.",
            }
        )

    return rows, errors