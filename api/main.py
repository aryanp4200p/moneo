import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from core.config import settings
from core.database import Base, engine
from routers.receipt_ocr import router as receipt_ocr_router


# ============================================================
# IMPORT ALL MODELS
# ============================================================
# These imports are important.
# They make sure SQLAlchemy registers every model and
# relationship before the application starts.

from models import (
    user,
    transaction,
    budget,
    financial_health,
    session,
    recurring_transaction,
    wealth_item,
)


# ============================================================
# IMPORT ROUTERS
# ============================================================

from routers import (
    auth,
    transactions,
    budgets,
    advisor,
    health_score,
    reports,
    recurring_transactions,
)


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="Personal Finance Manager API",
    description=(
        "Personal Finance Manager with authentication, "
        "transactions, budgets, recurring transactions, "
        "financial health, AI advice, wealth planning, "
        "predictive finance, insights, and receipt OCR."
    ),
    version="0.1.0",
)


# ============================================================
# UPLOAD DIRECTORIES
# ============================================================

BASE_DIR = os.path.dirname(__file__)

UPLOAD_ROOT = os.path.join(
    BASE_DIR,
    "uploads",
)

PROFILE_UPLOAD_DIR = os.path.join(
    UPLOAD_ROOT,
    "profile",
)

RECEIPT_UPLOAD_DIR = os.path.join(
    UPLOAD_ROOT,
    "receipts",
)

os.makedirs(
    PROFILE_UPLOAD_DIR,
    exist_ok=True,
)

os.makedirs(
    RECEIPT_UPLOAD_DIR,
    exist_ok=True,
)


# ============================================================
# STATIC FILES
# ============================================================

app.mount(
    "/uploads",
    StaticFiles(
        directory=UPLOAD_ROOT,
    ),
    name="uploads",
)


# ============================================================
# CORS
# ============================================================

allowed_origins = list(
    {
        origin
        for origin in [
            settings.FRONTEND_ORIGIN,
            "https://moneo-vert.vercel.app",
            "http://localhost:5173",
        ]
        if origin
    }
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# API ROUTERS
# ============================================================

app.include_router(
    auth.router,
)

app.include_router(
    transactions.router,
)

app.include_router(
    receipt_ocr_router,
)

app.include_router(
    budgets.router,
)

app.include_router(
    advisor.router,
)

app.include_router(
    health_score.router,
)

app.include_router(
    reports.router,
)

app.include_router(
    recurring_transactions.router,
)


# ============================================================
# DATABASE STARTUP
# ============================================================

@app.on_event("startup")
def on_startup():
    """
    Create any missing tables and safely add new columns/indexes
    needed for refresh token rotation.
    """
    Base.metadata.create_all(
        bind=engine,
    )

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                ALTER TABLE user_sessions
                  ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(128),
                  ADD COLUMN IF NOT EXISTS refresh_token_expires_at TIMESTAMPTZ;
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_user_sessions_refresh_token_hash
                ON user_sessions (refresh_token_hash);
                """
            )
        )


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "finance-manager-api",
        "version": "0.1.0",
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "healthy",
    }