import random
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from passlib.context import CryptContext

import models
import schemas
from database import engine, get_db

# Create database tables automatically
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="FixMate API", version="1.0.0")

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- 1. AUTHENTICATION ROUTES ---
@app.post("/api/register")
def register_user(user: schemas.UserRegister, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = pwd_context.hash(user.password)
    new_user = models.User(
        name=user.name,
        email=user.email,
        password_hash=hashed_pw,
        role=user.role,
        category=user.category if user.role == "technician" else None,
        experience_years=user.experience_years if user.role == "technician" else None,
        base_charge=user.base_charge if user.role == "technician" else None,
        rating=5.0 if user.role == "technician" else None,
        reviews_count=0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "role": new_user.role,
        "category": new_user.category
    }

@app.post("/api/login")
def login_user(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.email == credentials.email,
        models.User.role == credentials.role
    ).first()

    if not user or not pwd_context.verify(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials or role")

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "category": user.category
    }

# --- 2. TECHNICIAN DISCOVERY ---
@app.get("/api/technicians")
def get_technicians(category: str = None, db: Session = Depends(get_db)):
    query = db.query(models.User).filter(models.User.role == "technician")
    if category:
        query = query.filter(models.User.category == category)
    return query.all()

# --- 3. REPAIR BOOKINGS & TRACKING ---
@app.post("/api/bookings")
def create_booking(booking: schemas.BookingCreate, db: Session = Depends(get_db)):
    code = f"BK-{random.randint(1000, 9999)}"
    new_booking = models.Booking(
        booking_code=code,
        customer_id=booking.customer_id,
        tech_id=booking.tech_id,
        service=booking.service,
        problem=booking.problem,
        address=booking.address,
        scheduled_time=booking.scheduled_time,
        charge=booking.charge,
        status="Pending Acceptance"
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return new_booking

@app.get("/api/bookings/customer/{customer_id}")
def get_customer_bookings(customer_id: int, db: Session = Depends(get_db)):
    return db.query(models.Booking).filter(models.Booking.customer_id == customer_id).order_by(models.Booking.id.desc()).all()

@app.get("/api/bookings/technician/{tech_id}")
def get_technician_jobs(tech_id: int, db: Session = Depends(get_db)):
    return db.query(models.Booking).filter(models.Booking.tech_id == tech_id).order_by(models.Booking.id.desc()).all()

@app.patch("/api/bookings/{booking_id}/status")
def update_booking_status(booking_id: int, payload: schemas.BookingStatusUpdate, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = payload.status
    db.commit()
    db.refresh(booking)
    return booking

# --- 4. CUSTOMER RATINGS & REVIEWS ---
@app.post("/api/bookings/{booking_id}/rate")
def rate_booking(booking_id: int, payload: schemas.BookingRatingCreate, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.rated:
        raise HTTPException(status_code=400, detail="Booking already rated")

    booking.rated = True
    booking.rating_given = payload.stars
    booking.review_text = payload.review_text

    # Recalculate technician's average rating
    tech = db.query(models.User).filter(models.User.id == booking.tech_id).first()
    if tech:
        total_score = (tech.rating * tech.reviews_count) + payload.stars
        tech.reviews_count += 1
        tech.rating = round(total_score / tech.reviews_count, 2)

    db.commit()
    return {"message": "Rating submitted successfully", "new_tech_rating": tech.rating if tech else None}