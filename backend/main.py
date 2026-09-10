from dateutil.relativedelta import relativedelta
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import date, timedelta
import models
import schemas
from database import engine, get_db
from security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_business,
)

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="DueDesk API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Renewal Reminder API is running"}


# ---- Auth endpoints ----

@app.post("/signup", response_model=schemas.BusinessOut)
def signup(business: schemas.BusinessCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Business).filter(models.Business.email == business.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_business = models.Business(
        business_name=business.business_name,
        email=business.email,
        hashed_password=hash_password(business.password),
    )
    db.add(db_business)
    db.commit()
    db.refresh(db_business)
    return db_business


@app.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm gives us form_data.username and form_data.password
    # we're using "username" to mean "email" here - that's just this form's field name
    business = db.query(models.Business).filter(models.Business.email == form_data.username).first()
    if not business or not verify_password(form_data.password, business.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token({"business_id": business.id})
    return {"access_token": token, "token_type": "bearer"}


# ---- Customer endpoints (now protected + scoped to logged-in business) ----

@app.post("/customers", response_model=schemas.CustomerOut)
def create_customer(
    customer: schemas.CustomerCreate,
    db: Session = Depends(get_db),
    current_business: models.Business = Depends(get_current_business),
):
    expiry_date = customer.renewal_item.start_date + relativedelta(
      months=customer.renewal_item.cycle_months
    )

    db_customer = models.Customer(
        business_id=current_business.id,
        name=customer.name,
        phone=customer.phone,
        notes=customer.notes,
    )
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)

    db_item = models.RenewalItem(
        customer_id=db_customer.id,
        item_type=customer.renewal_item.item_type,
        reference_number=customer.renewal_item.reference_number,
        start_date=customer.renewal_item.start_date,
        cycle_months=customer.renewal_item.cycle_months,
        expiry_date=expiry_date,
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_customer)

    return db_customer


@app.get("/customers", response_model=list[schemas.CustomerOut])
def list_customers(
    db: Session = Depends(get_db),
    current_business: models.Business = Depends(get_current_business),
):
    return db.query(models.Customer).filter(models.Customer.business_id == current_business.id).all()


@app.get("/customers/{customer_id}", response_model=schemas.CustomerOut)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_business: models.Business = Depends(get_current_business),
):
    customer = (
        db.query(models.Customer)
        .filter(models.Customer.id == customer_id, models.Customer.business_id == current_business.id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@app.delete("/customers/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_business: models.Business = Depends(get_current_business),
):
    customer = (
        db.query(models.Customer)
        .filter(models.Customer.id == customer_id, models.Customer.business_id == current_business.id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(customer)
    db.commit()
    return "Deleted Successfully"


@app.get("/customers/due-soon/{days}", response_model=list[schemas.CustomerOut])
def get_due_soon(
    days: int,
    db: Session = Depends(get_db),
    current_business: models.Business = Depends(get_current_business),
):
    cutoff_date = date.today() + timedelta(days=days)

    return (
        db.query(models.Customer)
        .join(models.RenewalItem)
        .filter(
            models.Customer.business_id == current_business.id,
            models.RenewalItem.expiry_date <= cutoff_date,
        )
        .all()
    )
