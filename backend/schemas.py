from pydantic import BaseModel
from datetime import date
from typing import Optional


class RenewalItemCreate(BaseModel):
    item_type: str
    reference_number: Optional[str] = None
    start_date: date
    cycle_months: int


class RenewalItemOut(BaseModel):
    id: int
    item_type: str
    reference_number: Optional[str]
    start_date: date
    expiry_date: date
    cycle_months: int

    class Config:
        from_attributes = True


class CustomerCreate(BaseModel):
    name: str
    phone: str
    notes: Optional[str] = None
    renewal_item: RenewalItemCreate


class CustomerOut(BaseModel):
    id: int
    name: str
    phone: str
    notes: Optional[str]
    renewal_items: list[RenewalItemOut] = []

    class Config:
        from_attributes = True


# ---- Auth schemas ----

class BusinessCreate(BaseModel):
    business_name: str
    email: str
    password: str


class BusinessOut(BaseModel):
    id: int
    business_name: str
    email: str

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"