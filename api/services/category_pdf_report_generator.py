import io
import os
from collections import defaultdict
from datetime import datetime
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy.orm import Session

from models.transaction import Transaction
from models.user import User


NAVY = colors.HexColor("#14213D")
BLUE = colors.HexColor("#24428C")
TEAL = colors.HexColor("#0F9F91")
BRAND_TEAL = colors.HexColor("#0D9488")
PALE_BLUE = colors.HexColor("#D6E2F7")
PALE_TEAL = colors.HexColor("#E6F7F4")
LIGHT = colors.HexColor("#F1F5F9")
BORDER = colors.HexColor("#A9B8CD")
INK = colors.HexColor("#253047")
MUTED = colors.HexColor("#4B5870")
WHITE = colors.white
RED = colors.HexColor("#C2414B")


def _register_pdf_fonts():
    """
    Register a Unicode font where available so the rupee symbol renders
    correctly. Falls back to built-in Helvetica on systems without one.
    """
    candidates = [
        ("FinanceUnicode", r"C:\Windows\Fonts\segoeui.ttf"),
        ("FinanceUnicode", r"C:\Windows\Fonts\arial.ttf"),
        ("FinanceUnicode", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        ("FinanceUnicode", "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"),
    ]
    bold_candidates = [
        ("FinanceUnicode-Bold", r"C:\Windows\Fonts\segoeuib.ttf"),
        ("FinanceUnicode-Bold", r"C:\Windows\Fonts\arialbd.ttf"),
        ("FinanceUnicode-Bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        ("FinanceUnicode-Bold", "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"),
    ]

    regular_registered = "FinanceUnicode" in pdfmetrics.getRegisteredFontNames()
    bold_registered = "FinanceUnicode-Bold" in pdfmetrics.getRegisteredFontNames()

    if not regular_registered:
        for name, path in candidates:
            if os.path.exists(path):
                try:
                    pdfmetrics.registerFont(TTFont(name, path))
                    regular_registered = True
                    break
                except Exception:
                    continue

    if not bold_registered:
        for name, path in bold_candidates:
            if os.path.exists(path):
                try:
                    pdfmetrics.registerFont(TTFont(name, path))
                    bold_registered = True
                    break
                except Exception:
                    continue

    regular = "FinanceUnicode" if regular_registered else "Helvetica"
    bold = "FinanceUnicode-Bold" if bold_registered else "Helvetica-Bold"
    if regular_registered and bold_registered:
        pdfmetrics.registerFontFamily(
            "FinanceUnicode",
            normal="FinanceUnicode",
            bold="FinanceUnicode-Bold",
            italic="FinanceUnicode",
            boldItalic="FinanceUnicode-Bold",
        )
    return regular, bold


def _money(value: float) -> str:
    return f"₹{float(value or 0):,.2f}"


def generate_category_pdf_report(db: Session, user: User, year: int, month: int) -> io.BytesIO:
    """Create a polished category-wise report without changing the monthly statement PDF."""
    if month < 1 or month > 12:
        raise ValueError("Month must be between 1 and 12.")

    regular_font, bold_font = _register_pdf_fonts()

    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == user.id, Transaction.date.isnot(None))
        .order_by(Transaction.date.asc(), Transaction.id.asc())
        .all()
    )
    month_txns = [t for t in transactions if t.date.year == year and t.date.month == month]
    expenses = [t for t in month_txns if (t.type or "").lower() == "expense"]
    total_spent = sum(float(t.amount or 0) for t in expenses)

    totals = defaultdict(float)
    grouped = defaultdict(list)
    for txn in expenses:
        category = (txn.category or "Other").strip() or "Other"
        totals[category] += float(txn.amount or 0)
        grouped[category].append(txn)

    month_name = datetime(year, month, 1).strftime("%B %Y")
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=13 * mm,
        bottomMargin=17 * mm,
        title=f"Moneo - Category-wise Spending ({month_name})",
        author="Moneo",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "FinanceTitle",
        parent=styles["Title"],
        fontName=bold_font,
        fontSize=21,
        leading=25,
        alignment=TA_CENTER,
        textColor=BRAND_TEAL,
        spaceAfter=3,
    )
    subtitle_style = ParagraphStyle(
        "FinanceSubtitle",
        parent=styles["Normal"],
        fontName=regular_font,
        fontSize=9,
        leading=13,
        alignment=TA_CENTER,
        textColor=MUTED,
        spaceAfter=12,
    )
    section_style = ParagraphStyle(
        "FinanceSection",
        parent=styles["Heading2"],
        fontName=bold_font,
        fontSize=11,
        leading=14,
        textColor=BLUE,
        spaceBefore=8,
        spaceAfter=6,
        keepWithNext=True,
    )
    cell_style = ParagraphStyle(
        "FinanceCell",
        parent=styles["Normal"],
        fontName=regular_font,
        fontSize=8.5,
        leading=11,
        textColor=INK,
        alignment=TA_LEFT,
        wordWrap="CJK",
    )
    right_style = ParagraphStyle(
        "FinanceRight",
        parent=cell_style,
        alignment=TA_RIGHT,
    )
    header_style = ParagraphStyle(
        "FinanceHeader",
        parent=cell_style,
        fontName=bold_font,
        fontSize=8,
        leading=10,
        textColor=WHITE,
    )
    detail_header_style = ParagraphStyle(
        "FinanceDetailHeader",
        parent=cell_style,
        fontName=bold_font,
        fontSize=8,
        leading=10,
        textColor=NAVY,
    )
    metric_label = ParagraphStyle(
        "FinanceMetricLabel",
        parent=cell_style,
        fontSize=8,
        leading=10,
        textColor=INK,
    )
    metric_value = ParagraphStyle(
        "FinanceMetricValue",
        parent=cell_style,
        fontName=bold_font,
        fontSize=13,
        leading=16,
        textColor=NAVY,
    )
    metric_spend = ParagraphStyle(
        "FinanceMetricSpend",
        parent=metric_value,
        textColor=TEAL,
    )

    elements = [
        Spacer(1, 2 * mm),
        Paragraph("MONEO", title_style),
        Paragraph(f"CATEGORY-WISE SPENDING&nbsp;&nbsp;·&nbsp;&nbsp;{escape(month_name)}", subtitle_style),
    ]

    user_line = Table(
        [[
            Paragraph(f"<b>{escape(user.name or 'User')}</b>", cell_style),
            Paragraph(escape(user.email or ""), ParagraphStyle(
                "UserEmail", parent=cell_style, textColor=MUTED, alignment=TA_RIGHT
            )),
        ]],
        colWidths=[90 * mm, 90 * mm],
    )
    user_line.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    elements.extend([user_line, Spacer(1, 5 * mm)])

    summary_rows = [
        [
            Paragraph("TOTAL SPENT", metric_label),
            Paragraph("CATEGORIES", metric_label),
            Paragraph("TRANSACTIONS", metric_label),
        ],
        [
            Paragraph(_money(total_spent), metric_spend),
            Paragraph(str(len(totals)), metric_value),
            Paragraph(str(len(expenses)), metric_value),
        ],
    ]
    summary = Table(summary_rows, colWidths=[60 * mm, 60 * mm, 60 * mm], rowHeights=[8 * mm, 12 * mm])
    summary.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE_TEAL),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#88CFC4")),
        ("INNERGRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#A5DDD4")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.extend([summary, Spacer(1, 5 * mm), Paragraph("Spending by category", section_style)])

    category_rows = [[
        Paragraph("Category", header_style),
        Paragraph("Transactions", header_style),
        Paragraph("Amount", header_style),
        Paragraph("Share of spending", header_style),
    ]]
    sorted_categories = sorted(totals.items(), key=lambda pair: pair[1], reverse=True)
    for category, amount in sorted_categories:
        count = len(grouped[category])
        percentage = (amount / total_spent * 100) if total_spent else 0
        category_rows.append([
            Paragraph(escape(category), cell_style),
            Paragraph(str(count), cell_style),
            Paragraph(_money(amount), right_style),
            Paragraph(f"{percentage:.1f}%", right_style),
        ])
    if not sorted_categories:
        category_rows.append([
            Paragraph("No expense transactions found for this month.", cell_style),
            Paragraph("0", cell_style),
            Paragraph(_money(0), right_style),
            Paragraph("0.0%", right_style),
        ])

    category_table = Table(
        category_rows,
        colWidths=[55 * mm, 32 * mm, 43 * mm, 50 * mm],
        repeatRows=1,
        hAlign="LEFT",
    )
    category_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("GRID", (0, 0), (-1, -1), 0.55, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT]),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    elements.append(category_table)

    # Detailed transaction tables grouped by category.
    for category, amount in sorted_categories:
        elements.append(Spacer(1, 4 * mm))
        elements.append(Paragraph(f"{escape(category)}&nbsp;&nbsp;·&nbsp;&nbsp;{_money(amount)}", section_style))
        detail_rows = [[
            Paragraph("Date", detail_header_style),
            Paragraph("Description", detail_header_style),
            Paragraph("Amount", detail_header_style),
        ]]
        for txn in grouped[category]:
            description = txn.merchant or txn.note or "Transaction"
            txn_date = txn.date.strftime("%d %b %Y") if txn.date else "—"
            detail_rows.append([
                Paragraph(escape(txn_date), cell_style),
                Paragraph(escape(str(description)), cell_style),
                Paragraph(_money(float(txn.amount or 0)), right_style),
            ])

        detail_table = Table(
            detail_rows,
            colWidths=[32 * mm, 98 * mm, 50 * mm],
            repeatRows=1,
            hAlign="LEFT",
        )
        detail_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PALE_BLUE),
            ("TEXTCOLOR", (0, 0), (-1, 0), BLUE),
            ("GRID", (0, 0), (-1, -1), 0.55, BORDER),
            ("LINEBELOW", (0, 0), (-1, 0), 0.85, colors.HexColor("#8FA3BF")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(KeepTogether([detail_table]))

    def footer(canvas, document):
        canvas.saveState()
        canvas.setStrokeColor(BORDER)
        canvas.setLineWidth(0.6)
        canvas.line(15 * mm, 11 * mm, A4[0] - 15 * mm, 11 * mm)
        canvas.setFont(regular_font, 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(15 * mm, 6.5 * mm, "Moneo  |  Category-wise Report")
        canvas.drawRightString(A4[0] - 15 * mm, 6.5 * mm, f"Page {document.page}")
        canvas.restoreState()

    doc.build(elements, onFirstPage=footer, onLaterPages=footer)
    buffer.seek(0)
    return buffer