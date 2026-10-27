from datetime import date, datetime, timezone
import logging

logger = logging.getLogger(__name__)
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from core.database import get_db
from core.security import get_current_user

from models.user import User
from models.transaction import Transaction
from models.advisor_conversation import (
    AdvisorConversation,
    AdvisorMessage,
)

from schemas.advisor import (
    AdvisorChatRequest,
    AdvisorChatResponse,
)

from services.monthly_comparison import (
    compare_month_over_month,
)

from services.ai_advisor import (
    generate_tips_for_insights,
    generate_financial_advice,
)

from services.health_score import (
    compute_financial_health_score,
    get_score_history,
)

from services.budget_progress import (
    get_budget_progress,
)

from services.overspending_prediction import (
    predict_overspending,
)


router = APIRouter(
    prefix="/advisor",
    tags=["advisor"],
)


# ============================================================
# MONTHLY INSIGHTS
# ============================================================

@router.get("/monthly-insights")
def monthly_insights(
    year: int = Query(default=None),
    month: int = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return month-over-month category comparison with AI advice."""

    today = date.today()
    year = year or today.year
    month = month or today.month

    insights = compare_month_over_month(
        db,
        current_user.id,
        year,
        month,
    )

    insights_with_advice = generate_tips_for_insights(insights)

    return {
        "year": year,
        "month": month,
        "insights": insights_with_advice,
    }


# ============================================================
# FINANCIAL HEALTH SCORE
# ============================================================

@router.get("/health-score")
def health_score(
    year: int = Query(default=None),
    month: int = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the authenticated user's financial health score."""

    today = date.today()
    year = year or today.year
    month = month or today.month

    return compute_financial_health_score(
        db,
        current_user.id,
        year,
        month,
    )


# ============================================================
# HEALTH SCORE HISTORY
# ============================================================

@router.get("/health-score/history")
def health_score_history(
    limit: int = Query(default=6, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return historical financial health scores."""

    return {
        "history": get_score_history(
            db,
            current_user.id,
            limit,
        )
    }


# ============================================================
# LIST SAVED CONVERSATIONS
# ============================================================

@router.get("/conversations")
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return conversations belonging to the authenticated user."""

    conversations = (
        db.query(AdvisorConversation)
        .filter(
            AdvisorConversation.user_id == current_user.id
        )
        .order_by(
            desc(AdvisorConversation.updated_at),
            desc(AdvisorConversation.id),
        )
        .all()
    )

    return [
        {
            "id": conversation.id,
            "title": conversation.title,
            "created_at": (
                conversation.created_at.isoformat()
                if conversation.created_at
                else None
            ),
            "updated_at": (
                conversation.updated_at.isoformat()
                if conversation.updated_at
                else None
            ),
        }
        for conversation in conversations
    ]


# ============================================================
# LOAD MESSAGES FOR ONE CONVERSATION
# ============================================================

@router.get("/conversations/{conversation_id}/messages")
def get_conversation_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Load messages only when the conversation belongs to the user."""

    conversation = (
        db.query(AdvisorConversation)
        .filter(
            AdvisorConversation.id == conversation_id,
            AdvisorConversation.user_id == current_user.id,
        )
        .first()
    )

    if conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    messages = (
        db.query(AdvisorMessage)
        .filter(
            AdvisorMessage.conversation_id == conversation.id
        )
        .order_by(AdvisorMessage.id.asc())
        .all()
    )

    return {
        "conversation_id": conversation.id,
        "messages": [
            {
                "id": message.id,
                "role": message.role,
                "content": message.content,
                "created_at": (
                    message.created_at.isoformat()
                    if message.created_at
                    else None
                ),
            }
            for message in messages
        ],
    }


# ============================================================
# NATURAL-LANGUAGE AI FINANCIAL ADVISOR
# ============================================================

@router.post(
    "/chat",
    response_model=AdvisorChatResponse,
)
def advisor_chat(
    payload: AdvisorChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Answer a financial question using verified financial data.

    A conversation_id continues an existing conversation.
    If no conversation_id is supplied, a new conversation is created.
    """

    message_text = payload.message.strip()

    if not message_text:
        raise HTTPException(
            status_code=422,
            detail="Message cannot be empty.",
        )

    today = date.today()
    year = today.year
    month = today.month

    # --------------------------------------------------------
    # GET OR CREATE CONVERSATION
    # --------------------------------------------------------

    if payload.conversation_id is not None:
        conversation = (
            db.query(AdvisorConversation)
            .filter(
                AdvisorConversation.id == payload.conversation_id,
                AdvisorConversation.user_id == current_user.id,
            )
            .first()
        )

        if conversation is None:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found.",
            )

    else:
        conversation = AdvisorConversation(
            user_id=current_user.id,
            title=message_text[:60],
        )
        db.add(conversation)
        db.flush()

    # Give a conversation a useful title if it has not received one.
    if (
        not conversation.title
        or conversation.title == "New conversation"
    ):
        conversation.title = message_text[:60]

    # --------------------------------------------------------
    # LOAD RECENT CONVERSATION HISTORY
    # --------------------------------------------------------

    previous_messages = (
        db.query(AdvisorMessage)
        .filter(
            AdvisorMessage.conversation_id == conversation.id
        )
        .order_by(AdvisorMessage.id.desc())
        .limit(12)
        .all()
    )

    # Restore chronological order for the model.
    conversation_history = [
        {
            "role": item.role,
            "content": item.content,
        }
        for item in reversed(previous_messages)
    ]

    # --------------------------------------------------------
    # CURRENT MONTH DATE RANGE
    # --------------------------------------------------------

    month_start = date(year, month, 1)

    if month == 12:
        month_end = date(year + 1, 1, 1)
    else:
        month_end = date(year, month + 1, 1)

    # --------------------------------------------------------
    # FETCH AUTHENTICATED USER'S CATEGORIZED TRANSACTIONS
    # --------------------------------------------------------

    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.status == "categorized",
            Transaction.date >= month_start,
            Transaction.date < month_end,
        )
        .all()
    )

    total_income = 0.0
    total_expenses = 0.0
    category_spending = defaultdict(float)

    for transaction in transactions:
        amount = float(transaction.amount or 0)

        if transaction.type == "income":
            total_income += amount

        elif transaction.type == "expense":
            total_expenses += amount

            category = (
                transaction.category or "Uncategorized"
            )

            category_spending[category] += amount

    # --------------------------------------------------------
    # BUDGET PROGRESS
    # --------------------------------------------------------

    budget_progress = get_budget_progress(
        db,
        current_user.id,
        year,
        month,
    )

    # --------------------------------------------------------
    # OVERSPENDING PREDICTIONS
    # --------------------------------------------------------

    predictions = predict_overspending(
        db,
        current_user.id,
        year,
        month,
    )

    # --------------------------------------------------------
    # MONTHLY COMPARISON
    # --------------------------------------------------------

    monthly_insights = compare_month_over_month(
        db,
        current_user.id,
        year,
        month,
    )

    # --------------------------------------------------------
    # FINANCIAL HEALTH SCORE
    # --------------------------------------------------------

    health_score = compute_financial_health_score(
        db,
        current_user.id,
        year,
        month,
    )

    # --------------------------------------------------------
    # TRUSTED FINANCIAL CONTEXT
    # --------------------------------------------------------

    financial_context = {
        "period": f"{year}-{month:02d}",

        "current_month_income": round(
            total_income, 2
        ),

        "current_month_expenses": round(
            total_expenses, 2
        ),

        "current_month_balance": round(
            total_income - total_expenses, 2
        ),

        "spending_by_category": {
            category: round(amount, 2)
            for category, amount in sorted(
                category_spending.items(),
                key=lambda item: item[1],
                reverse=True,
            )
        },

        "budget_progress": budget_progress,
        "overspending_predictions": predictions,
        "monthly_comparison": monthly_insights,
        "financial_health": health_score,
    }

    # --------------------------------------------------------
    # SAVE USER MESSAGE
    # --------------------------------------------------------

    db.add(
        AdvisorMessage(
            conversation_id=conversation.id,
            role="user",
            content=message_text,
        )
    )

    # --------------------------------------------------------
    # GENERATE AND SAVE AI RESPONSE
    # --------------------------------------------------------

    try:
        answer = generate_financial_advice(
            message_text,
            financial_context,
            conversation_history=conversation_history,
        )

        if not answer or not answer.strip():
            raise RuntimeError(
                "The AI advisor returned an empty response."
            )

        db.add(
            AdvisorMessage(
                conversation_id=conversation.id,
                role="assistant",
                content=answer.strip(),
            )
        )

        conversation.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(conversation)

    except Exception:
        db.rollback()
        logger.exception("Moneo advisor chat failed")

        # Log the actual exception server-side in your normal
        # application logger before deployment.
        raise HTTPException(
            status_code=503,
            detail=(
                "The AI advisor could not complete your request. "
                "Please try again."
            ),
        )

    return {
        "answer": answer.strip(),
        "conversation_id": conversation.id,
    }
