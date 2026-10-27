from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import get_current_user
from models.user import User
from services.pdf_report_generator import generate_monthly_pdf_report
from services.category_pdf_report_generator import generate_category_pdf_report

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/pdf", response_class=StreamingResponse)
def download_pdf_report(
    year: int = Query(..., description="Year e.g., 2026"),
    month: int = Query(..., description="Month e.g., 8"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Existing monthly statement endpoint is intentionally preserved.
    try:
        pdf_buffer = generate_monthly_pdf_report(db, current_user, year, month)
        headers = {"Content-Disposition": f"attachment; filename=financial_report_{year}_{month:02d}.pdf"}
        return StreamingResponse(pdf_buffer, media_type="application/pdf", headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF report: {str(e)}")

@router.get("/category-pdf", response_class=StreamingResponse)
def download_category_pdf_report(
    year: int = Query(..., description="Year e.g., 2026"),
    month: int = Query(..., description="Month e.g., 8"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Separate category-wise report; does not alter /reports/pdf."""
    try:
        pdf_buffer = generate_category_pdf_report(db, current_user, year, month)
        headers = {"Content-Disposition": f"attachment; filename=category_report_{year}_{month:02d}.pdf"}
        return StreamingResponse(pdf_buffer, media_type="application/pdf", headers=headers)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating category-wise PDF report: {str(e)}")
