from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Business(Base):
    __tablename__ = "businesses"

    id = Column(Integer, primary_key=True, index=True)
    business_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)

    customers = relationship("Customer", back_populates="business", cascade="all, delete-orphan")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    notes = Column(String, nullable=True)

    business = relationship("Business", back_populates="customers")
    renewal_items = relationship("RenewalItem", back_populates="customer", cascade="all, delete-orphan")


class RenewalItem(Base):
    __tablename__ = "renewal_items"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    item_type = Column(String, nullable=False)
    reference_number = Column(String, nullable=True)
    start_date = Column(Date, nullable=False)
    cycle_months = Column(Integer, nullable=False)
    expiry_date = Column(Date, nullable=False)

    customer = relationship("Customer", back_populates="renewal_items")