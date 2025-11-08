import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./travel_planner.db"

# Set connect_args based on database type
connect_args = {}
if DATABASE_URL and DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, nullable=False)
    email = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)

class Itinerary(Base):
    __tablename__ = "itineraries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, default="default_user", index=True)
    trip_name = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    duration_days = Column(Integer)
    budget = Column(Float)
    description = Column(Text)
    itinerary_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(String, default="default_user", index=True)
    trip_id = Column(String, nullable=False)
    trip_name = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    base_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    passengers = Column(Integer, nullable=False)
    email = Column(String)
    flight_details = Column(JSON)
    hotel_details = Column(JSON)
    special_requests = Column(Text)
    status = Column(String, default="pending", index=True)  # pending, confirmed, cancelled, completed
    payment_status = Column(String, default="unpaid", index=True)  # unpaid, paid, refunded
    stripe_session_id = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    confirmed_at = Column(DateTime)
    cancelled_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CalendarEvent(Base):
    __tablename__ = "calendar_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, default="default_user", index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    start_time = Column(String)  # Optional time in HH:MM format
    end_time = Column(String)  # Optional time in HH:MM format
    all_day = Column(String, default="true")  # "true" or "false" as string
    event_type = Column(String, default="personal")  # personal, trip, booking, reminder
    tags = Column(JSON)  # Array of tag strings
    color = Column(String, default="#6366f1")  # Hex color code
    booking_id = Column(String)  # Link to booking if applicable
    reminder_enabled = Column(String, default="false")  # "true" or "false"
    reminder_time = Column(String)  # e.g., "1 day before", "1 hour before"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
