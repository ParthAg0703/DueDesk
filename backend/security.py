from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext

# This sets up bcrypt as our hashing algorithm - industry standard for passwords
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# In a real production app, this should be a long random string kept secret
# (usually loaded from an environment variable, never hardcoded like this).
# For learning/development, this is fine.
import os
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-this-later")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # tokens valid for 24 hours


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
import models

# This tells FastAPI: expect a token in the Authorization header,
# and it can be obtained by POSTing to /login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def get_current_business(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.Business:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        payload = decode_access_token(token)
        business_id = payload.get("business_id")
        if business_id is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    business = db.query(models.Business).filter(models.Business.id == business_id).first()
    if business is None:
        raise credentials_exception
    return business