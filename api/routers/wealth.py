from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user

from models.wealth_item import WealthItem

from schemas.wealth import (
    WealthItemCreate,
    WealthItemOut,
    WealthItemUpdate,
    WealthSummary,
)


router = APIRouter(
    prefix="/wealth",
    tags=["Wealth"],
)


def _owned(
    db: Session,
    item_id: int,
    user_id: int,
):

    item = (
        db.query(WealthItem)
        .filter(
            WealthItem.id == item_id,
            WealthItem.user_id == user_id,
        )
        .first()
    )

    if not item:

        raise HTTPException(
            status_code=404,
            detail="Wealth item not found",
        )

    return item


@router.get(
    "",
    response_model=WealthSummary,
)
def get_wealth_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    items = (
        db.query(WealthItem)
        .filter(
            WealthItem.user_id
            == current_user.id
        )
        .order_by(
            WealthItem.id.desc()
        )
        .all()
    )

    assets = [
        item
        for item in items
        if item.kind == "asset"
    ]

    liabilities = [
        item
        for item in items
        if item.kind == "liability"
    ]

    total_assets = sum(
        float(item.value)
        for item in assets
    )

    total_liabilities = sum(
        float(item.value)
        for item in liabilities
    )

    return WealthSummary(
        total_assets=round(
            total_assets,
            2,
        ),

        total_liabilities=round(
            total_liabilities,
            2,
        ),

        net_worth=round(
            total_assets
            - total_liabilities,
            2,
        ),

        assets=assets,

        liabilities=liabilities,
    )


@router.post(
    "/items",
    response_model=WealthItemOut,
    status_code=status.HTTP_201_CREATED,
)
def create_item(
    payload: WealthItemCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    item = WealthItem(
        user_id=current_user.id,
        **payload.model_dump(),
    )

    db.add(item)

    db.commit()

    db.refresh(item)

    return item


@router.put(
    "/items/{item_id}",
    response_model=WealthItemOut,
)
def update_item(
    item_id: int,
    payload: WealthItemUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    item = _owned(
        db,
        item_id,
        current_user.id,
    )

    update_data = payload.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():

        setattr(
            item,
            field,
            value,
        )

    db.commit()

    db.refresh(item)

    return item


@router.delete(
    "/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    item = _owned(
        db,
        item_id,
        current_user.id,
    )

    db.delete(item)

    db.commit()

    return None