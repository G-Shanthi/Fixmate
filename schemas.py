from pydantic import BaseModel
from typing import Optional

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: str  # "customer" or "technician"
    category: Optional[str] = None
    experience_years: Optional[int] = None
    base_charge: Optional[int] = None

class UserLogin(BaseModel):
    email: str
    password: str
    role: str

class BookingCreate(BaseModel):
    customer_id: int
    tech_id: int
    service: str
    problem: str
    address: str
    scheduled_time: str
    charge: int

class BookingStatusUpdate(BaseModel):
    status: str

class BookingRatingCreate(BaseModel):
    stars: int
    review_text: Optional[str] = "Great service!"