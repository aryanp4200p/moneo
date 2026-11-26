import io
import os
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from sqlalchemy.orm import Session

from models.transaction import Transaction
from models.user import User


# ============================================================
# UNICODE FONT WITH ₹ SUPPORT
# ============================================================

def _register_unicode_font():
    """
    Find and register a font that actually supports
    the Indian Rupee symbol (₹).
    """

    possible_fonts = [
        # Windows
        r"C:\Windows\Fonts\Nirmala.ttf",
        r"C:\Windows\Fonts\NirmalaUI.ttf",
        r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\seguisym.ttf",
        r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\calibri.ttf",

        # Linux
        "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
        "/usr/share/fonts/opentype/noto/NotoSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",

        # macOS
        "/Library/Fonts/Arial Unicode.ttf",
        "/Library/Fonts/NotoSans-Regular.ttf",
    ]

    for font_path in possible_fonts:

        if not os.path.exists(font_path):
            continue

        try:
            font = TTFont(
                "FinanceUnicode",
                font_path,
            )

            # Check whether the font REALLY contains ₹
            if 0x20B9 not in font.face.charWidths:
                continue

            pdfmetrics.registerFont(font)

            print(
                f"Moneo PDF font selected: {font_path}"
            )

            return "FinanceUnicode"

        except Exception as e:
            print(
                f"Could not use font {font_path}: {e}"
            )

    print(
        "WARNING: No installed font with ₹ support found. "
        "Using Helvetica fallback."
    )

    return "Helvetica"


FONT_NAME = _register_unicode_font()


# ============================================================
# HELPERS
# ============================================================

def _format_money(amount: float) -> str:
    """
    Format amount using Indian Rupee symbol.
    """
    return f"₹{amount:,.2f}"


def _format_date(value) -> str:
    if not value:
        return "—"

    try:
        return value.strftime("%d %b")
    except AttributeError:
        return str(value)


def _get_description(transaction: Transaction) -> str:
    if transaction.merchant:
        return transaction.merchant

    if transaction.note:
        return transaction.note

    return "Transaction"


# ============================================================
# MAIN PDF GENERATOR
# ============================================================

def generate_monthly_pdf_report(
    db: Session,
    user: User,
    year: int,
    month: int,
) -> io.BytesIO:

    if month < 1 or month > 12:
        raise ValueError("Month must be between 1 and 12.")

    # --------------------------------------------------------
    # GET USER TRANSACTIONS
    # --------------------------------------------------------

    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user.id,
            Transaction.date.isnot(None),
        )
        .order_by(
            Transaction.date.asc(),
            Transaction.id.asc(),
        )
        .all()
    )

    # --------------------------------------------------------
    # FILTER SELECTED MONTH
    # --------------------------------------------------------

    monthly_transactions = [
        txn
        for txn in transactions
        if txn.date.year == year
        and txn.date.month == month
    ]

    # --------------------------------------------------------
    # CALCULATE SUMMARY
    # --------------------------------------------------------

    total_income = sum(
        float(txn.amount)
        for txn in monthly_transactions
        if txn.type == "income"
    )

    total_spent = sum(
        float(txn.amount)
        for txn in monthly_transactions
        if txn.type == "expense"
    )

    remaining = total_income - total_spent

    transaction_count = len(monthly_transactions)

    # --------------------------------------------------------
    # PDF SETUP
    # --------------------------------------------------------

    pdf_buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=18 * mm,
        title=f"Moneo - Monthly Statement ({year}-{month:02d})",
        author="Moneo",
    )

    elements = []

    # --------------------------------------------------------
    # STYLES
    # --------------------------------------------------------

    title_style = ParagraphStyle(
        "Title",
        fontName=FONT_NAME,
        fontSize=21,
        leading=25,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#0D9488"),
        spaceAfter=4,
    )

    subtitle_style = ParagraphStyle(
        "Subtitle",
        fontName=FONT_NAME,
        fontSize=11,
        leading=14,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#64748B"),
        spaceAfter=14,
    )

    user_style = ParagraphStyle(
        "User",
        fontName=FONT_NAME,
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#4B5563"),
    )

    section_style = ParagraphStyle(
        "Section",
        fontName=FONT_NAME,
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#24428C"),
        spaceBefore=4,
        spaceAfter=8,
    )

    summary_label_style = ParagraphStyle(
        "SummaryLabel",
        fontName=FONT_NAME,
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#4B5563"),
    )

    income_value_style = ParagraphStyle(
        "IncomeValue",
        fontName=FONT_NAME,
        fontSize=14,
        leading=17,
        textColor=colors.HexColor("#169B62"),
    )

    expense_value_style = ParagraphStyle(
        "ExpenseValue",
        fontName=FONT_NAME,
        fontSize=14,
        leading=17,
        textColor=colors.HexColor("#D13C3C"),
    )

    remaining_value_style = ParagraphStyle(
        "RemainingValue",
        fontName=FONT_NAME,
        fontSize=14,
        leading=17,
        textColor=colors.HexColor("#169B62"),
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        fontName=FONT_NAME,
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )

    table_cell_style = ParagraphStyle(
        "TableCell",
        fontName=FONT_NAME,
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#374151"),
    )

    amount_style = ParagraphStyle(
        "Amount",
        fontName=FONT_NAME,
        fontSize=8.5,
        leading=11,
        alignment=TA_RIGHT,
        textColor=colors.HexColor("#374151"),
    )

    income_amount_style = ParagraphStyle(
        "IncomeAmount",
        fontName=FONT_NAME,
        fontSize=8.5,
        leading=11,
        alignment=TA_RIGHT,
        textColor=colors.HexColor("#169B62"),
    )

    expense_amount_style = ParagraphStyle(
        "ExpenseAmount",
        fontName=FONT_NAME,
        fontSize=8.5,
        leading=11,
        alignment=TA_RIGHT,
        textColor=colors.HexColor("#374151"),
    )

    # --------------------------------------------------------
    # HEADER
    # --------------------------------------------------------

    elements.append(
        Paragraph(
            "<b>MONEO</b>",
            title_style,
        )
    )

    month_name = datetime(year, month, 1).strftime("%B %Y")

    elements.append(
        Paragraph(
            f"MONTHLY STATEMENT · {month_name}",
            subtitle_style,
        )
    )

    # --------------------------------------------------------
    # USER INFORMATION
    # --------------------------------------------------------

    user_table = Table(
        [
            [
                Paragraph(
                    user.name or "User",
                    user_style,
                ),
                Paragraph(
                    user.email,
                    ParagraphStyle(
                        "Email",
                        parent=user_style,
                        alignment=TA_RIGHT,
                    ),
                ),
            ]
        ],
        colWidths=[90 * mm, 90 * mm],
    )

    user_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LINEBELOW", (0, 0), (-1, -1), 0.65, colors.HexColor("#CBD5E1")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )

    elements.append(user_table)
    elements.append(Spacer(1, 10))

    # --------------------------------------------------------
    # MONTHLY SUMMARY
    # --------------------------------------------------------

    elements.append(
        Paragraph(
            "MONTHLY SUMMARY",
            section_style,
        )
    )

    summary_data = [
        [
            Paragraph("Income", summary_label_style),
            Paragraph("Total Spent", summary_label_style),
            Paragraph("Remaining", summary_label_style),
        ],
        [
            Paragraph(
                _format_money(total_income),
                income_value_style,
            ),
            Paragraph(
                _format_money(total_spent),
                expense_value_style,
            ),
            Paragraph(
                _format_money(remaining),
                remaining_value_style,
            ),
        ],
    ]

    summary_table = Table(
        summary_data,
        colWidths=[
            60 * mm,
            60 * mm,
            60 * mm,
        ],
    )

    summary_table.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, -1),
                    colors.HexColor("#F8FAFC"),
                ),
                (
                    "BOX",
                    (0, 0),
                    (-1, -1),
                    0.75,
                    colors.HexColor("#A9B8CD"),
                ),
                (
                    "INNERGRID",
                    (0, 0),
                    (-1, -1),
                    0.6,
                    colors.HexColor("#CBD5E1"),
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    8,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    8,
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, 0),
                    7,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, 0),
                    5,
                ),
                (
                    "TOPPADDING",
                    (0, 1),
                    (-1, 1),
                    5,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 1),
                    (-1, 1),
                    8,
                ),
            ]
        )
    )

    elements.append(summary_table)
    elements.append(Spacer(1, 14))

    # --------------------------------------------------------
    # TRANSACTIONS
    # --------------------------------------------------------

    elements.append(
        Paragraph(
            "TRANSACTIONS",
            section_style,
        )
    )

    transaction_data = [
        [
            Paragraph("Date", table_header_style),
            Paragraph("Description", table_header_style),
            Paragraph("Category", table_header_style),
            Paragraph("Amount", table_header_style),
        ]
    ]

    for txn in monthly_transactions:

        description = _get_description(txn)

        category = txn.category or "Other"

        is_income = txn.type == "income"

        if is_income:
            amount_text = f"+{_format_money(float(txn.amount))}"
            current_amount_style = income_amount_style
        else:
            amount_text = f"-{_format_money(float(txn.amount))}"
            current_amount_style = expense_amount_style

        transaction_data.append(
            [
                Paragraph(
                    _format_date(txn.date),
                    table_cell_style,
                ),
                Paragraph(
                    description,
                    table_cell_style,
                ),
                Paragraph(
                    category,
                    table_cell_style,
                ),
                Paragraph(
                    amount_text,
                    current_amount_style,
                ),
            ]
        )

    # --------------------------------------------------------
    # EMPTY MONTH
    # --------------------------------------------------------

    if not monthly_transactions:

        transaction_data.append(
            [
                Paragraph(
                    "—",
                    table_cell_style,
                ),
                Paragraph(
                    "No transactions found",
                    table_cell_style,
                ),
                Paragraph(
                    "—",
                    table_cell_style,
                ),
                Paragraph(
                    "₹0.00",
                    amount_style,
                ),
            ]
        )

    transaction_table = Table(
        transaction_data,
        colWidths=[
            28 * mm,
            70 * mm,
            42 * mm,
            40 * mm,
        ],
        repeatRows=1,
    )

    transaction_table.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    colors.HexColor("#24428C"),
                ),
                (
                    "TEXTCOLOR",
                    (0, 0),
                    (-1, 0),
                    colors.white,
                ),
                (
                    "BOX",
                    (0, 0),
                    (-1, -1),
                    0.7,
                    colors.HexColor("#A9B8CD"),
                ),
                (
                    "INNERGRID",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.HexColor("#CBD5E1"),
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "MIDDLE",
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [
                        colors.white,
                        colors.HexColor("#F8FAFC"),
                    ],
                ),
            ]
        )
    )

    elements.append(transaction_table)
    elements.append(Spacer(1, 8))

    # --------------------------------------------------------
    # TOTALS
    # --------------------------------------------------------

    totals_table = Table(
        [
            [
                Paragraph(
                    f"<b>Total Transactions: {transaction_count}</b>",
                    table_cell_style,
                ),
                Paragraph(
                    f"<b>Total Spent: {_format_money(total_spent)}</b>",
                    ParagraphStyle(
                        "TotalRight",
                        parent=table_cell_style,
                        alignment=TA_RIGHT,
                    ),
                ),
            ]
        ],
        colWidths=[
            90 * mm,
            90 * mm,
        ],
    )

    totals_table.setStyle(
        TableStyle(
            [
                (
                    "LINEABOVE",
                    (0, 0),
                    (-1, -1),
                    0.7,
                    colors.HexColor("#A9B8CD"),
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    8,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    4,
                ),
            ]
        )
    )

    elements.append(totals_table)
    elements.append(Spacer(1, 12))

    # --------------------------------------------------------
    # GENERATED DATE
    # --------------------------------------------------------

    generated_text = (
        f"Generated on {datetime.now().strftime('%d %B %Y')} "
        f"· Moneo"
    )

    elements.append(
        Paragraph(
            generated_text,
            ParagraphStyle(
                "Generated",
                fontName=FONT_NAME,
                fontSize=8,
                leading=10,
                alignment=TA_CENTER,
                textColor=colors.HexColor("#8A94A6"),
            ),
        )
    )

    # --------------------------------------------------------
    # FOOTER
    # --------------------------------------------------------

    def add_page_footer(canvas, doc):
        canvas.saveState()

        canvas.setStrokeColor(
            colors.HexColor("#CBD5E1")
        )

        canvas.line(
            16 * mm,
            10 * mm,
            A4[0] - 16 * mm,
            10 * mm,
        )

        canvas.setFont(
            FONT_NAME,
            7.5,
        )

        canvas.setFillColor(
            colors.HexColor("#64748B")
        )

        canvas.drawString(
            16 * mm,
            6 * mm,
            "Moneo  |  Monthly Statement",
        )

        canvas.drawRightString(
            A4[0] - 16 * mm,
            6 * mm,
            f"Page {doc.page}",
        )
        canvas.restoreState()

    # --------------------------------------------------------
    # BUILD PDF
    # --------------------------------------------------------

    doc.build(
        elements,
        onFirstPage=add_page_footer,
        onLaterPages=add_page_footer,
    )
    pdf_buffer.seek(0)
    return pdf_buffer