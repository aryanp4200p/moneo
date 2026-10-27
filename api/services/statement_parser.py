"""
Bank statement CSV parser.

Supports common CSV formats such as:

1. Date, Amount, Description
2. Date, Debit, Credit, Description
3. Transaction Date, Withdrawal, Deposit, Narration
4. Date, Amount, Type, Merchant, Note

The parser:
- Detects common column names automatically
- Supports multiple date formats
- Supports currency symbols and commas in amounts
- Handles Debit/Credit columns
- Infers income/expense when possible
- Preserves merchant and description
- Returns row-level errors instead of silently skipping data
"""

import csv
import io
import re
from datetime import datetime


DATE_FORMATS = [
    "%Y-%m-%d",
    "%d-%m-%Y",
    "%d/%m/%Y",
    "%Y/%m/%d",
    "%d.%m.%Y",
]


class ParsedRow:
    def __init__(
        self,
        amount: float,
        type_: str,
        date,
        note: str | None,
        merchant: str | None,
    ):
        self.amount = amount
        self.type = type_
        self.date = date
        self.note = note
        self.merchant = merchant


def _normalize_column_name(name: str) -> str:
    """
    Normalize column names so that variations such as:

        Transaction Date
        transaction_date
        Transaction-Date

    can be treated similarly.
    """
    return re.sub(r"[^a-z0-9]", "", name.lower().strip())


def _parse_date(raw: str):
    if raw is None:
        raise ValueError("Date is empty")

    raw = str(raw).strip()

    if not raw:
        raise ValueError("Date is empty")

    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue

    raise ValueError(f"Unrecognized date format: '{raw}'")


def _find_column(fieldnames: list[str], *candidates: str) -> str | None:
    """
    Find a column using normalized names.

    Example:
        'Transaction Date'
        'transaction_date'
        'TRANSACTION-DATE'

    can all match 'transaction date'.
    """

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
    """
    Convert common money formats into float.

    Examples:
        ₹1,500       -> 1500
        Rs. 1,500    -> 1500
        1,500.50     -> 1500.50
        -500         -> -500
        (500)        -> -500
    """

    if raw is None:
        raise ValueError("Amount is empty")

    value = str(raw).strip()

    if not value:
        raise ValueError("Amount is empty")

    # Remove currency symbols / text
    value = re.sub(r"[₹$€£]", "", value)
    value = re.sub(r"(?i)rs\.?", "", value)

    # Remove spaces
    value = value.replace(" ", "")

    # Handle accounting format: (500) = -500
    if value.startswith("(") and value.endswith(")"):
        value = "-" + value[1:-1]

    # Remove commas
    value = value.replace(",", "")

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


def parse_csv(file_bytes: bytes) -> tuple[list[ParsedRow], list[dict]]:
    """
    Returns:

        (
            parsed_rows,
            errors
        )

    errors format:

        {
            "row_number": int,
            "reason": str
        }
    """

    # ---------------------------------------------------------
    # Decode CSV
    # ---------------------------------------------------------

    try:
        text = file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = file_bytes.decode("latin-1", errors="replace")

    reader = csv.DictReader(io.StringIO(text))

    if not reader.fieldnames:
        return [], [
            {
                "row_number": 0,
                "reason": "File has no header row / is empty",
            }
        ]

    fieldnames = reader.fieldnames

    # ---------------------------------------------------------
    # Find columns
    # ---------------------------------------------------------

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

    # ---------------------------------------------------------
    # Validate required columns
    # ---------------------------------------------------------

    if not date_col:
        return [], [
            {
                "row_number": 0,
                "reason": (
                    "CSV must contain a date column. "
                    "Accepted examples: date, transaction date, txn date."
                ),
            }
        ]

    # A CSV must have either:
    # amount OR
    #
    # debit + credit

    if not amount_col and not debit_col and not credit_col:
        return [], [
            {
                "row_number": 0,
                "reason": (
                    "CSV must contain either an 'amount' column "
                    "or 'debit'/'credit' columns."
                ),
            }
        ]

    rows: list[ParsedRow] = []
    errors: list[dict] = []

    # ---------------------------------------------------------
    # Parse each row
    # ---------------------------------------------------------

    for row_number, raw_row in enumerate(reader, start=2):

        try:

            # ---------------------------------------------
            # Date
            # ---------------------------------------------

            date_val = _parse_date(raw_row.get(date_col))

            # ---------------------------------------------
            # Determine amount + transaction type
            # ---------------------------------------------

            type_val = None
            amount_val = None

            # -------------------------------------------------
            # Case 1: Debit / Credit bank statement
            # -------------------------------------------------

            if debit_col or credit_col:

                debit_raw = (
                    raw_row.get(debit_col)
                    if debit_col
                    else None
                )

                credit_raw = (
                    raw_row.get(credit_col)
                    if credit_col
                    else None
                )

                debit_value = 0.0
                credit_value = 0.0

                if debit_raw not in (None, ""):
                    debit_value = abs(_clean_amount(debit_raw))

                if credit_raw not in (None, ""):
                    credit_value = abs(_clean_amount(credit_raw))

                # Both empty
                if debit_value == 0 and credit_value == 0:
                    raise ValueError(
                        "Both debit and credit amounts are empty"
                    )

                # Both present
                if debit_value > 0 and credit_value > 0:
                    raise ValueError(
                        "Both debit and credit contain amounts; "
                        "unable to determine transaction type"
                    )

                if debit_value > 0:
                    amount_val = debit_value
                    type_val = "expense"

                elif credit_value > 0:
                    amount_val = credit_value
                    type_val = "income"

            # -------------------------------------------------
            # Case 2: Single Amount column
            # -------------------------------------------------

            elif amount_col:

                raw_amount = raw_row.get(amount_col)

                amount_val = _clean_amount(raw_amount)

                # Explicit type column takes priority
                if type_col:

                    raw_type = (
                        raw_row.get(type_col) or ""
                    ).strip().lower()

                    if raw_type in ("income", "credit", "cr"):
                        type_val = "income"

                    elif raw_type in ("expense", "debit", "dr"):
                        type_val = "expense"

                # Otherwise infer from sign
                if type_val is None:

                    if amount_val < 0:
                        type_val = "expense"
                    else:
                        type_val = "income"

            if amount_val is None:
                raise ValueError("Could not determine transaction amount")

            if amount_val <= 0:
                raise ValueError(
                    "Amount must be greater than 0"
                )

            amount_val = abs(amount_val)

            # ---------------------------------------------
            # Text fields
            # ---------------------------------------------

            note_val = _get_text(
                raw_row,
                note_col,
            )

            merchant_val = _get_text(
                raw_row,
                merchant_col,
            )

            # If merchant is missing but description exists,
            # keep the description as the note.
            #
            # We deliberately do NOT automatically use the
            # description as merchant because a narration can
            # contain multiple pieces of information.

            rows.append(
                ParsedRow(
                    amount=amount_val,
                    type_=type_val,
                    date=date_val,
                    note=note_val,
                    merchant=merchant_val,
                )
            )

        except Exception as e:

            errors.append(
                {
                    "row_number": row_number,
                    "reason": str(e),
                }
            )

    return rows, errors