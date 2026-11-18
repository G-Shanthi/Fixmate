from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "customer" or "technician"

    # Technician-specific fields (null for customers)
    category = Column(String, nullable=True)  # Plumbing, Electrical, AC Repair, etc.
    experience_years = Column(Integer, nullable=True)
    base_charge = Column(Integer, nullable=True)
    rating = Column(Float, default=5.0)
    reviews_count = Column(Integer, default=0)


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_code = Column(String, unique=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tech_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    service = Column(String, nullable=False)
    problem = Column(String, nullable=False)
    address = Column(String, nullable=False)
    scheduled_time = Column(String, nullable=False)
    charge = Column(Integer, nullable=False)
    status = Column(String, default="Pending Acceptance")  # Pending Acceptance -> Accepted & On the Way -> Completed
    rated = Column(Boolean, default=False)
    rating_given = Column(Integer, nullable=True)
    review_text = Column(String, nullable=True)