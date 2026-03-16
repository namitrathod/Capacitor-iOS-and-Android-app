from typing import Any, List

from fastapi import APIRouter
from sqlmodel import SQLModel, select

from app.api.deps import CurrentUser, SessionDep
from app.models import Sale


class SaleRead(SQLModel):
    id: int
    user_id: int
    product_id: int
    quantity: int
    price: float


class SaleCreate(SQLModel):
    user_id: int
    product_id: int
    quantity: int
    price: float


class SalesPage(SQLModel):
    data: List[SaleRead]
    count: int


router = APIRouter()


@router.get("/", response_model=SalesPage)
def list_sales(session: SessionDep, current_user: CurrentUser) -> Any:
    statement = select(Sale)
    sales = session.exec(statement).all()
    return SalesPage(data=sales, count=len(sales))


@router.post("/", response_model=SaleRead)
def create_sale(
    *, session: SessionDep, current_user: CurrentUser, sale_in: SaleCreate
) -> Any:
    sale = Sale(
        user_id=sale_in.user_id,
        product_id=sale_in.product_id,
        quantity=sale_in.quantity,
        price=sale_in.price,
    )
    session.add(sale)
    session.commit()
    session.refresh(sale)
    return sale

