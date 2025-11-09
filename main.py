import os
import math
from fastapi import FastAPI, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel
from agent.travel_agent import TravelPlannerAgent
import uvicorn
import stripe
from stripe._error import StripeError
from typing import Optional, Dict, Any, List
from datetime import datetime
import json
from sqlalchemy.orm import Session
from database import init_db, get_db, Itinerary, Booking, CalendarEvent, User, Session as DBSession

# Initialize FastAPI app
app = FastAPI(title="TripMind AI Agent")

# Initialize database
init_db()

# Initialize Stripe (API key will be set from environment)
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')

# Initialize the AI agent (only if API key is available)
agent = None
try:
    if os.environ.get('OPENROUTER_API_KEY'):
        agent = TravelPlannerAgent()
    else:
        print("Warning: OPENROUTER_API_KEY not set. AI agent features will be unavailable.")
except Exception as e:
    print(f"Warning: Failed to initialize AI agent: {e}. AI agent features will be unavailable.")

# In-memory storage for bookings (fallback, but we'll use database)
bookings_store = {}

# Server-side trip pricing (canonical source of truth)
TRIP_PRICES = {
    "goa-beach": 450.00,
    "paris-family": 750.00,
    "manali-adventure": 200.00
}

# Request/Response models
class TravelQuery(BaseModel):
    query: str

class TravelResponse(BaseModel):
    status: str
    response: str
    request: str = ""
    error: str = ""

class BookingRequest(BaseModel):
    trip_id: str
    trip_name: str
    destination: str
    start_date: str
    end_date: str
    total_price: float
    passengers: int
    email: Optional[str] = None
    flight_details: Optional[Dict[str, Any]] = None
    hotel_details: Optional[Dict[str, Any]] = None
    special_requests: Optional[str] = None

class PaymentRequest(BaseModel):
    booking_id: str
    amount: float

class AuthSignInRequest(BaseModel):
    email: str
    password: str
    remember_me: Optional[bool] = False

class AuthSignUpRequest(BaseModel):
    name: str
    email: str
    password: str

class CalendarEventRequest(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: str
    end_date: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    all_day: Optional[str] = "true"
    event_type: Optional[str] = "personal"
    tags: Optional[List[str]] = None
    color: Optional[str] = None
    booking_id: Optional[str] = None
    reminder_enabled: Optional[str] = "false"
    reminder_time: Optional[str] = None

class ItineraryRequest(BaseModel):
    trip_name: str
    destination: str
    start_date: str
    end_date: str
    duration_days: int
    budget: Optional[float] = None
    description: Optional[str] = None
    itinerary_data: Optional[Dict[str, Any]] = None

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_root():
    """Serve the main HTML page."""
    return FileResponse("static/index.html")

import secrets
from passlib.context import CryptContext

# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)

def generate_token() -> str:
    """Generate a secure random token."""
    return secrets.token_urlsafe(32)

@app.post("/api/auth/signup")
async def signup(request: AuthSignUpRequest, db: Session = Depends(get_db)):
    """User signup endpoint."""
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == request.email).first()
        if existing_user:
            return {
                "status": "error",
                "message": "Email already registered"
            }
        
        # Create new user
        new_user = User(
            name=request.name,
            email=request.email,
            password_hash=hash_password(request.password)
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Generate auth token
        token = generate_token()
        new_session = DBSession(
            token=token,
            user_id=new_user.id,
            email=new_user.email
        )
        db.add(new_session)
        db.commit()
        
        return {
            "status": "success",
            "user": {
                "name": new_user.name,
                "email": new_user.email
            },
            "token": token
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/signin")
async def signin(request: AuthSignInRequest, db: Session = Depends(get_db)):
    """User signin endpoint."""
    try:
        # Check if user exists
        user = db.query(User).filter(User.email == request.email).first()
        if not user:
            return {
                "status": "error",
                "message": "Invalid email or password"
            }
        
        # Verify password
        if not verify_password(request.password, user.password_hash):
            return {
                "status": "error",
                "message": "Invalid email or password"
            }
        
        # Generate auth token
        token = generate_token()
        new_session = DBSession(
            token=token,
            user_id=user.id,
            email=user.email
        )
        db.add(new_session)
        db.commit()
        
        return {
            "status": "success",
            "user": {
                "name": user.name,
                "email": user.email
            },
            "token": token
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/logout")
async def logout(token: str, db: Session = Depends(get_db)):
    """User logout endpoint."""
    try:
        session = db.query(DBSession).filter(DBSession.token == token).first()
        if session:
            db.delete(session)
            db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/plan", response_model=TravelResponse)
async def plan_trip(query: TravelQuery):
    """
    Main endpoint for travel planning.
    Accepts natural language queries and returns AI-generated travel plans.
    """
    # Validate query is not empty
    if not query.query or not query.query.strip():
        return TravelResponse(
            status="error",
            response="❌ Query cannot be empty. Please provide a destination or travel plan request.",
            request=query.query,
            error="Query is required"
        )
    
    if agent is None:
        return TravelResponse(
            status="error",
            response="⚠️ AI Agent is currently unavailable. Please configure the OPENROUTER_API_KEY environment variable to enable AI-powered trip planning. You can still use the booking features!",
            request=query.query,
            error="AI agent is not available. Please set OPENROUTER_API_KEY environment variable."
        )
    try:
        result = agent.plan_trip(query.query)
        
        return TravelResponse(
            status=result.get("status", "success"),
            response=result.get("response", ""),
            request=result.get("request", query.query),
            error=result.get("error", "")
        )
    except Exception as e:
        return TravelResponse(
            status="error",
            response=f"❌ An error occurred: {str(e)}",
            request=query.query,
            error=str(e)
        )

@app.post("/api/reset")
async def reset_memory():
    """Reset the agent's conversation memory."""
    if agent is None:
        return {"status": "error", "message": "AI agent is not available"}
    try:
        agent.reset_memory()
        return {"status": "success", "message": "Memory cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
async def get_history():
    """Get conversation history."""
    if agent is None:
        return {"status": "success", "history": []}
    try:
        history = agent.get_conversation_history()
        return {"status": "success", "history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/preferences")
async def get_preferences():
    """Get saved user preferences."""
    try:
        from agent.travel_agent import user_preferences_store
        return {
            "status": "success",
            "preferences": user_preferences_store
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/booking-options")
async def get_booking_options(request: Dict[str, Any] = None):
    """Extract flight and hotel options from conversation history or provided trip details."""
    try:
        # Get trip details from request or conversation history
        destination = None
        origin = "Mumbai"  # Default origin
        start_date = None
        end_date = None
        budget = None
        passengers = 1
        
        if request and request.get("trip_details"):
            # Use provided trip details
            trip = request["trip_details"]
            destination = trip.get("destination")
            origin = trip.get("origin", "Mumbai")
            start_date = trip.get("start_date")
            end_date = trip.get("end_date")
            budget = trip.get("budget")
            passengers = trip.get("passengers", 1)
        elif agent is not None:
            # Extract from conversation history
            history = agent.get_conversation_history()
            import re
            for entry in history:
                content = entry.get("content", "")
                
                # Extract dates
                date_pattern = r'\d{4}-\d{2}-\d{2}'
                dates = re.findall(date_pattern, content)
                if dates:
                    if not start_date:
                        start_date = dates[0]
                    if len(dates) > 1:
                        end_date = dates[1]
                    elif not end_date:
                        end_date = dates[0]
                
                # Extract destination
                dest_patterns = [
                    r'(?:destination|going to|visit|trip to|travel to)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
                    r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:trip|vacation|getaway)',
                ]
                for pattern in dest_patterns:
                    dest_match = re.search(pattern, content, re.IGNORECASE)
                    if dest_match and not destination:
                        destination = dest_match.group(1)
                        break
                
                # Extract budget
                budget_match = re.search(r'\$(\d+(?:\.\d{2})?)', content)
                if budget_match and not budget:
                    budget = float(budget_match.group(1))
                
                # Extract passengers
                passenger_match = re.search(r'(\d+)\s*(?:passenger|person|people|guest)', content, re.IGNORECASE)
                if passenger_match and passengers == 1:
                    passengers = int(passenger_match.group(1))
        
        # Use defaults if not found
        if not destination:
            destination = "Goa"
        if not start_date:
            from datetime import datetime, timedelta
            start_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        if not end_date:
            from datetime import datetime, timedelta
            end_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
        if not budget:
            budget = 1000.0
        
        # Get flight options using the agent's search_flights tool
        flights_data = []
        hotels_data = []
        
        if agent is not None:
            from agent.travel_agent import search_flights, search_hotels
            import json
            from datetime import datetime, timedelta
            
            # Search flights - use .invoke() for LangChain tools
            flight_budget = budget * 0.4  # Allocate 40% of budget to flights
            flights_result = search_flights.invoke({
                "origin": origin,
                "destination": destination,
                "date": start_date,
                "max_budget": flight_budget / passengers
            })
            flights_json = json.loads(flights_result)
            flights_data = flights_json.get("flights", [])
            
            # Search hotels - use .invoke() for LangChain tools
            hotel_budget = budget * 0.4  # Allocate 40% of budget to hotels per night
            num_nights = (datetime.strptime(end_date, "%Y-%m-%d") - datetime.strptime(start_date, "%Y-%m-%d")).days
            hotels_result = search_hotels.invoke({
                "city": destination,
                "check_in": start_date,
                "check_out": end_date,
                "max_price_per_night": hotel_budget / num_nights if num_nights > 0 else hotel_budget
            })
            hotels_json = json.loads(hotels_result)
            hotels_data = hotels_json.get("hotels", [])
        else:
            # Fallback: Generate sample flights and hotels
            flights_data = [
                {
                    "airline": "Air India",
                    "flight_number": "AI202",
                    "departure_time": "08:00",
                    "arrival_time": "10:30",
                    "duration": "2h 30m",
                    "price": min(budget * 0.3, 450),
                    "stops": 0,
                    "class": "Economy"
                },
                {
                    "airline": "IndiGo",
                    "flight_number": "6E345",
                    "departure_time": "14:00",
                    "arrival_time": "16:45",
                    "duration": "2h 45m",
                    "price": min(budget * 0.25, 350),
                    "stops": 0,
                    "class": "Economy"
                },
                {
                    "airline": "SpiceJet",
                    "flight_number": "SG890",
                    "departure_time": "18:30",
                    "arrival_time": "21:15",
                    "duration": "2h 45m",
                    "price": min(budget * 0.2, 320),
                    "stops": 0,
                    "class": "Economy"
                }
            ]
            
            num_nights = (datetime.strptime(end_date, "%Y-%m-%d") - datetime.strptime(start_date, "%Y-%m-%d")).days
            hotels_data = [
                {
                    "name": "Grand Luxury Resort & Spa",
                    "rating": 4.8,
                    "price_per_night": min(budget * 0.35 / num_nights if num_nights > 0 else budget * 0.35, 180),
                    "location": "Beachfront Premium",
                    "amenities": ["Infinity Pool", "WiFi", "Breakfast", "Spa", "Beach Access", "Fine Dining", "Concierge"],
                    "reviews": 2340,
                    "style": "luxury"
                },
                {
                    "name": "Ocean View Beach Resort",
                    "rating": 4.6,
                    "price_per_night": min(budget * 0.3 / num_nights if num_nights > 0 else budget * 0.3, 145),
                    "location": "Beachfront",
                    "amenities": ["Pool", "WiFi", "Breakfast", "Spa", "Beach Access", "Restaurant"],
                    "reviews": 1680,
                    "style": "luxury"
                },
                {
                    "name": "Boutique Heritage Hotel",
                    "rating": 4.5,
                    "price_per_night": min(budget * 0.28 / num_nights if num_nights > 0 else budget * 0.28, 125),
                    "location": "Historic District",
                    "amenities": ["WiFi", "Breakfast", "Rooftop Bar", "Art Gallery", "Cultural Tours"],
                    "reviews": 945,
                    "style": "luxury"
                },
                {
                    "name": "Riverside Comfort Inn",
                    "rating": 4.3,
                    "price_per_night": min(budget * 0.22 / num_nights if num_nights > 0 else budget * 0.22, 95),
                    "location": "Riverside",
                    "amenities": ["WiFi", "Breakfast", "Gym", "River View", "Restaurant"],
                    "reviews": 1120,
                    "style": "mid-range"
                },
                {
                    "name": "City Center Business Hotel",
                    "rating": 4.2,
                    "price_per_night": min(budget * 0.2 / num_nights if num_nights > 0 else budget * 0.2, 85),
                    "location": "City Center",
                    "amenities": ["WiFi", "Breakfast", "Parking", "Gym", "Business Center"],
                    "reviews": 1450,
                    "style": "mid-range"
                },
                {
                    "name": "Garden View Suites",
                    "rating": 4.1,
                    "price_per_night": min(budget * 0.18 / num_nights if num_nights > 0 else budget * 0.18, 75),
                    "location": "Garden District",
                    "amenities": ["WiFi", "Kitchenette", "Parking", "Garden Access"],
                    "reviews": 780,
                    "style": "mid-range"
                },
                {
                    "name": "Travelers Hub Hostel",
                    "rating": 4.0,
                    "price_per_night": min(budget * 0.12 / num_nights if num_nights > 0 else budget * 0.12, 45),
                    "location": "Near Beach",
                    "amenities": ["WiFi", "Shared Kitchen", "Common Area", "Lockers"],
                    "reviews": 620,
                    "style": "budget-friendly"
                },
                {
                    "name": "Cozy Stay Inn",
                    "rating": 3.9,
                    "price_per_night": min(budget * 0.15 / num_nights if num_nights > 0 else budget * 0.15, 55),
                    "location": "Suburban Area",
                    "amenities": ["WiFi", "AC", "24/7 Reception", "Parking"],
                    "reviews": 530,
                    "style": "budget-friendly"
                },
                {
                    "name": "Backpackers Paradise",
                    "rating": 3.8,
                    "price_per_night": min(budget * 0.1 / num_nights if num_nights > 0 else budget * 0.1, 35),
                    "location": "City Outskirts",
                    "amenities": ["WiFi", "Shared Rooms", "Breakfast", "Tours Desk"],
                    "reviews": 415,
                    "style": "budget-friendly"
                },
                {
                    "name": "Airport Express Hotel",
                    "rating": 4.0,
                    "price_per_night": min(budget * 0.16 / num_nights if num_nights > 0 else budget * 0.16, 65),
                    "location": "Near Airport",
                    "amenities": ["WiFi", "Shuttle Service", "24/7 Reception", "Quick Check-in"],
                    "reviews": 890,
                    "style": "mid-range"
                }
            ]
        
        return {
            "status": "success",
            "trip_details": {
                "origin": origin,
                "destination": destination,
                "start_date": start_date,
                "end_date": end_date,
                "budget": budget,
                "passengers": passengers
            },
            "flights": flights_data,
            "hotels": hotels_data
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "flights": [],
            "hotels": []
        }

@app.post("/api/bookings")
async def create_booking(booking: BookingRequest, db: Session = Depends(get_db)):
    """Create a new booking with server-side price calculation."""
    try:
        # Validate passenger count
        if booking.passengers < 1 or booking.passengers > 10:
            raise HTTPException(
                status_code=400,
                detail="Passenger count must be between 1 and 10"
            )
        
        # Determine if this is a dynamic booking (AI-generated) or pre-defined trip
        is_dynamic_booking = booking.trip_id.startswith("booking-")
        
        if is_dynamic_booking:
            # For dynamic bookings, calculate price from flight and hotel details
            if not booking.flight_details or not booking.hotel_details:
                raise HTTPException(
                    status_code=400,
                    detail="Flight and hotel details are required for dynamic bookings"
                )
            
            # Extract and validate pricing from flight details
            if 'price' not in booking.flight_details:
                raise HTTPException(
                    status_code=400,
                    detail="Flight price is required for dynamic bookings"
                )
            
            try:
                flight_price = float(booking.flight_details['price'])
                if not math.isfinite(flight_price):
                    raise ValueError("Flight price must be a valid finite number")
                if flight_price <= 0:
                    raise ValueError("Flight price must be positive")
            except (ValueError, TypeError) as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid flight price: {str(e)}"
                )
            
            # Extract and validate pricing from hotel details
            if 'price_per_night' not in booking.hotel_details:
                raise HTTPException(
                    status_code=400,
                    detail="Hotel price per night is required for dynamic bookings"
                )
            
            try:
                hotel_price_per_night = float(booking.hotel_details['price_per_night'])
                if not math.isfinite(hotel_price_per_night):
                    raise ValueError("Hotel price must be a valid finite number")
                if hotel_price_per_night <= 0:
                    raise ValueError("Hotel price must be positive")
            except (ValueError, TypeError) as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid hotel price: {str(e)}"
                )
            
            # Validate and calculate number of nights from dates
            try:
                start = datetime.strptime(booking.start_date, '%Y-%m-%d')
                end = datetime.strptime(booking.end_date, '%Y-%m-%d')
                
                if end <= start:
                    raise HTTPException(
                        status_code=400,
                        detail="End date must be after start date"
                    )
                
                nights = (end - start).days
                if nights < 1:
                    nights = 1
            except ValueError as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid date format. Use YYYY-MM-DD: {str(e)}"
                )
            
            # Calculate total: (flight × passengers) + (hotel × nights)
            flight_total = flight_price * booking.passengers
            hotel_total = hotel_price_per_night * nights
            calculated_total = flight_total + hotel_total
            base_price = calculated_total / booking.passengers  # For record keeping
        else:
            # For pre-defined trips, use existing secure pricing
            if booking.trip_id not in TRIP_PRICES:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Unknown trip ID: {booking.trip_id}"
                )
            
            # Calculate total using TRUSTED server-side pricing
            base_price = TRIP_PRICES[booking.trip_id]
            calculated_total = base_price * booking.passengers
        
        booking_id = f"BK{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Extract email from flight_details if not provided directly
        email = booking.email
        if not email and booking.flight_details and isinstance(booking.flight_details, dict):
            email = booking.flight_details.get('email')
        
        # Extract special_requests from flight_details if not provided directly
        special_requests = booking.special_requests
        if not special_requests and booking.flight_details and isinstance(booking.flight_details, dict):
            special_requests = booking.flight_details.get('special_requests')
        
        # Create booking in database
        db_booking = Booking(
            booking_id=booking_id,
            trip_id=booking.trip_id,
            trip_name=booking.trip_name,
            destination=booking.destination,
            start_date=booking.start_date,
            end_date=booking.end_date,
            base_price=base_price,
            total_price=calculated_total,
            passengers=booking.passengers,
            email=email,
            flight_details=booking.flight_details or {},
            hotel_details=booking.hotel_details or {},
            special_requests=special_requests,
            status="pending",
            payment_status="unpaid"
        )
        
        db.add(db_booking)
        db.commit()
        db.refresh(db_booking)
        
        # Also store in memory for backward compatibility
        booking_data = {
            "id": booking_id,
            "booking_id": booking_id,
            "trip_id": booking.trip_id,
            "trip_name": booking.trip_name,
            "destination": booking.destination,
            "start_date": booking.start_date,
            "end_date": booking.end_date,
            "base_price": base_price,
            "total_price": calculated_total,
            "passengers": booking.passengers,
            "email": email,
            "flight_details": booking.flight_details,
            "hotel_details": booking.hotel_details,
            "special_requests": special_requests,
            "status": "pending",
            "payment_status": "unpaid",
            "created_at": db_booking.created_at.isoformat() if db_booking.created_at else datetime.now().isoformat()
        }
        bookings_store[booking_id] = booking_data
        
        return {
            "status": "success",
            "booking_id": booking_id,
            "booking": booking_data
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bookings")
async def get_bookings(db: Session = Depends(get_db), status: Optional[str] = None):
    """Get all bookings, optionally filtered by status."""
    try:
        query = db.query(Booking).order_by(Booking.created_at.desc())
        
        if status:
            query = query.filter(Booking.status == status)
        
        bookings = query.all()
        
        result = []
        for booking in bookings:
            result.append({
                "id": booking.booking_id,
                "booking_id": booking.booking_id,
                "trip_id": booking.trip_id,
                "trip_name": booking.trip_name,
                "destination": booking.destination,
                "start_date": booking.start_date,
                "end_date": booking.end_date,
                "base_price": booking.base_price,
                "total_price": booking.total_price,
                "passengers": booking.passengers,
                "email": booking.email,
                "flight_details": booking.flight_details,
                "hotel_details": booking.hotel_details,
                "special_requests": booking.special_requests,
                "status": booking.status,
                "payment_status": booking.payment_status,
                "created_at": booking.created_at.isoformat() if booking.created_at else None,
                "confirmed_at": booking.confirmed_at.isoformat() if booking.confirmed_at else None,
                "cancelled_at": booking.cancelled_at.isoformat() if booking.cancelled_at else None
            })
        
        return {
            "status": "success",
            "bookings": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bookings/{booking_id}")
async def get_booking(booking_id: str, db: Session = Depends(get_db)):
    """Get a specific booking by booking_id."""
    try:
        booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
        
        if not booking:
            # Fallback to in-memory store for backward compatibility
            if booking_id in bookings_store:
                return {
                    "status": "success",
                    "booking": bookings_store[booking_id]
                }
            raise HTTPException(status_code=404, detail="Booking not found")
        
        booking_data = {
            "id": booking.booking_id,
            "booking_id": booking.booking_id,
            "trip_id": booking.trip_id,
            "trip_name": booking.trip_name,
            "destination": booking.destination,
            "start_date": booking.start_date,
            "end_date": booking.end_date,
            "base_price": booking.base_price,
            "total_price": booking.total_price,
            "passengers": booking.passengers,
            "email": booking.email,
            "flight_details": booking.flight_details,
            "hotel_details": booking.hotel_details,
            "special_requests": booking.special_requests,
            "status": booking.status,
            "payment_status": booking.payment_status,
            "stripe_session_id": booking.stripe_session_id,
            "created_at": booking.created_at.isoformat() if booking.created_at else None,
            "confirmed_at": booking.confirmed_at.isoformat() if booking.confirmed_at else None,
            "cancelled_at": booking.cancelled_at.isoformat() if booking.cancelled_at else None,
            "updated_at": booking.updated_at.isoformat() if booking.updated_at else None
        }
        
        return {
            "status": "success",
            "booking": booking_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/create-checkout-session")
async def create_checkout_session(payment: PaymentRequest, db: Session = Depends(get_db)):
    """Create a Stripe checkout session for payment."""
    try:
        import math
        
        # Validate required fields
        if not payment.booking_id or not payment.booking_id.strip():
            raise HTTPException(
                status_code=400,
                detail="Booking ID is required"
            )
        
        # Validate amount is positive and finite (no NaN or Infinity)
        if not math.isfinite(payment.amount) or payment.amount <= 0:
            raise HTTPException(
                status_code=400,
                detail="Invalid amount. Amount must be greater than 0"
            )
        
        if not stripe.api_key:
            raise HTTPException(
                status_code=400, 
                detail="Stripe is not configured. Please set STRIPE_SECRET_KEY."
            )
        
        booking = db.query(Booking).filter(Booking.booking_id == payment.booking_id).first()
        
        if not booking:
            # Fallback to in-memory store
            if payment.booking_id not in bookings_store:
                raise HTTPException(status_code=404, detail="Booking not found")
            booking_dict = bookings_store[payment.booking_id]
            actual_amount = booking_dict['total_price']
            
            # Validate booking is in a payable state (in-memory)
            if booking_dict.get('status') == 'confirmed':
                raise HTTPException(status_code=400, detail="Booking is already confirmed")
            if booking_dict.get('status') == 'cancelled':
                raise HTTPException(status_code=400, detail="Booking is cancelled")
            if booking_dict.get('payment_status') == 'paid':
                raise HTTPException(status_code=400, detail="Booking is already paid")
            
            # Use in-memory booking data for Stripe
            booking_destination = booking_dict.get('destination', 'Unknown')
            booking_trip_name = booking_dict.get('trip_name', 'Trip')
            booking_start_date = booking_dict.get('start_date', '')
            booking_end_date = booking_dict.get('end_date', '')
            booking_passengers = booking_dict.get('passengers', 1)
            booking_email = booking_dict.get('email')
        else:
            actual_amount = booking.total_price
            
            # Validate booking is in a payable state
            if booking.status == 'confirmed':
                raise HTTPException(status_code=400, detail="Booking is already confirmed")
            if booking.status == 'cancelled':
                raise HTTPException(status_code=400, detail="Booking is cancelled")
            if booking.payment_status == 'paid':
                raise HTTPException(status_code=400, detail="Booking is already paid")
            
            # Use database booking data for Stripe
            booking_destination = booking.destination
            booking_trip_name = booking.trip_name
            booking_start_date = booking.start_date
            booking_end_date = booking.end_date
            booking_passengers = booking.passengers
            booking_email = booking.email
        
        # Optional: Log if client-provided amount differs from booking total
        if abs(payment.amount - actual_amount) > 0.01:
            print(f"Warning: Client amount ({payment.amount}) differs from booking total ({actual_amount})")
        
        # Get the domain for success/cancel URLs
        domain = os.environ.get('REPLIT_DEV_DOMAIN', 'localhost:5000')
        if os.environ.get('REPLIT_DEPLOYMENT'):
            protocol = 'https://'
        else:
            domains = os.environ.get('REPLIT_DOMAINS', '').split(',')
            domain = domains[0] if domains and domains[0] else 'localhost:5000'
            # Use http:// for localhost, https:// for other domains
            protocol = 'https://' if not domain.startswith('localhost') else 'http://'
        
        # Create Stripe checkout session using TRUSTED server-side amount
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[
                {
                    'price_data': {
                        'currency': 'usd',
                        'unit_amount': int(actual_amount * 100),  # Use booking total, not client amount
                        'product_data': {
                            'name': f"Trip to {booking_destination}",
                            'description': f"{booking_trip_name} - {booking_start_date} to {booking_end_date} ({booking_passengers} passenger(s))",
                        },
                    },
                    'quantity': 1,
                },
            ],
            mode='payment',
            success_url=f'{protocol}{domain}/?payment=success&booking_id={payment.booking_id}',
            cancel_url=f'{protocol}{domain}/?payment=cancelled&booking_id={payment.booking_id}',
            customer_email=booking_email,
            metadata={
                'booking_id': payment.booking_id,
                'expected_amount': str(actual_amount)
            }
        )
        
        # Update booking with Stripe session ID (only if using database)
        if booking:
            booking.stripe_session_id = checkout_session.id
            db.commit()
        
        return {
            "status": "success",
            "checkout_url": checkout_session.url,
            "session_id": checkout_session.id
        }
    except StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/bookings/{booking_id}/confirm")
async def confirm_booking(booking_id: str, db: Session = Depends(get_db)):
    """Confirm a booking after successful payment."""
    try:
        booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
        
        if not booking:
            # Fallback to in-memory store
            if booking_id not in bookings_store:
                raise HTTPException(status_code=404, detail="Booking not found")
            bookings_store[booking_id]["status"] = "confirmed"
            bookings_store[booking_id]["payment_status"] = "paid"
            bookings_store[booking_id]["confirmed_at"] = datetime.now().isoformat()
            return {
                "status": "success",
                "booking": bookings_store[booking_id]
            }
        
        booking.status = "confirmed"
        booking.payment_status = "paid"
        booking.confirmed_at = datetime.utcnow()
        db.commit()
        db.refresh(booking)
        
        # Also update in-memory store
        if booking_id in bookings_store:
            bookings_store[booking_id]["status"] = "confirmed"
            bookings_store[booking_id]["payment_status"] = "paid"
            bookings_store[booking_id]["confirmed_at"] = booking.confirmed_at.isoformat()
        
        booking_data = {
            "id": booking.booking_id,
            "booking_id": booking.booking_id,
            "trip_id": booking.trip_id,
            "trip_name": booking.trip_name,
            "destination": booking.destination,
            "start_date": booking.start_date,
            "end_date": booking.end_date,
            "base_price": booking.base_price,
            "total_price": booking.total_price,
            "passengers": booking.passengers,
            "email": booking.email,
            "status": booking.status,
            "payment_status": booking.payment_status,
            "confirmed_at": booking.confirmed_at.isoformat() if booking.confirmed_at else None
        }
        
        return {
            "status": "success",
            "booking": booking_data
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/bookings/{booking_id}")
async def cancel_booking(booking_id: str, db: Session = Depends(get_db)):
    """Cancel a booking."""
    try:
        booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
        
        if not booking:
            # Fallback to in-memory store
            if booking_id not in bookings_store:
                raise HTTPException(status_code=404, detail="Booking not found")
            bookings_store[booking_id]["status"] = "cancelled"
            bookings_store[booking_id]["cancelled_at"] = datetime.now().isoformat()
            return {
                "status": "success",
                "message": "Booking cancelled successfully"
            }
        
        if booking.status == "cancelled":
            raise HTTPException(status_code=400, detail="Booking is already cancelled")
        
        booking.status = "cancelled"
        booking.cancelled_at = datetime.utcnow()
        db.commit()
        
        # Also update in-memory store
        if booking_id in bookings_store:
            bookings_store[booking_id]["status"] = "cancelled"
            bookings_store[booking_id]["cancelled_at"] = booking.cancelled_at.isoformat()
        
        return {
            "status": "success",
            "message": "Booking cancelled successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/itineraries")
async def save_itinerary(request: ItineraryRequest, db: Session = Depends(get_db)):
    """Save a planned itinerary to the calendar."""
    try:
        itinerary = Itinerary(
            trip_name=request.trip_name,
            destination=request.destination,
            start_date=request.start_date,
            end_date=request.end_date,
            duration_days=request.duration_days,
            budget=request.budget,
            description=request.description,
            itinerary_data=request.itinerary_data or {}
        )
        db.add(itinerary)
        db.commit()
        db.refresh(itinerary)
        
        return {
            "status": "success",
            "itinerary_id": itinerary.id,
            "message": "Itinerary saved successfully"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/itineraries")
async def get_itineraries(db: Session = Depends(get_db)):
    """Get all itineraries for the calendar."""
    try:
        itineraries = db.query(Itinerary).order_by(Itinerary.created_at.desc()).all()
        
        result = []
        for itin in itineraries:
            result.append({
                "id": itin.id,
                "trip_name": itin.trip_name,
                "destination": itin.destination,
                "start_date": itin.start_date,
                "end_date": itin.end_date,
                "duration_days": itin.duration_days,
                "budget": itin.budget,
                "description": itin.description,
                "itinerary_data": itin.itinerary_data,
                "created_at": itin.created_at.isoformat() if itin.created_at else None
            })
        
        return {
            "status": "success",
            "itineraries": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/itineraries/{itinerary_id}")
async def get_itinerary(itinerary_id: int, db: Session = Depends(get_db)):
    """Get a specific itinerary by ID."""
    try:
        itinerary = db.query(Itinerary).filter(Itinerary.id == itinerary_id).first()
        
        if not itinerary:
            raise HTTPException(status_code=404, detail="Itinerary not found")
        
        return {
            "status": "success",
            "itinerary": {
                "id": itinerary.id,
                "trip_name": itinerary.trip_name,
                "destination": itinerary.destination,
                "start_date": itinerary.start_date,
                "end_date": itinerary.end_date,
                "duration_days": itinerary.duration_days,
                "budget": itinerary.budget,
                "description": itinerary.description,
                "itinerary_data": itinerary.itinerary_data,
                "created_at": itinerary.created_at.isoformat() if itinerary.created_at else None
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/itineraries/{itinerary_id}")
async def delete_itinerary(itinerary_id: int, db: Session = Depends(get_db)):
    """Delete an itinerary from the calendar."""
    try:
        itinerary = db.query(Itinerary).filter(Itinerary.id == itinerary_id).first()
        
        if not itinerary:
            raise HTTPException(status_code=404, detail="Itinerary not found")
        
        db.delete(itinerary)
        db.commit()
        
        return {
            "status": "success",
            "message": "Itinerary deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/bookings/from-itinerary/{itinerary_id}")
async def create_booking_from_itinerary(itinerary_id: int, passengers: int = 1, db: Session = Depends(get_db)):
    """Create a booking from a saved itinerary."""
    try:
        itinerary = db.query(Itinerary).filter(Itinerary.id == itinerary_id).first()
        
        if not itinerary:
            raise HTTPException(status_code=404, detail="Itinerary not found")
        
        # Validate passenger count
        if passengers < 1 or passengers > 10:
            raise HTTPException(
                status_code=400,
                detail="Passenger count must be between 1 and 10"
            )
        
        # Generate a trip_id from itinerary (or use a default)
        trip_id = f"itinerary-{itinerary_id}"
        
        # Calculate price based on itinerary budget or use default
        if itinerary.budget:
            base_price = itinerary.budget / (itinerary.duration_days or 1)
        else:
            # Default pricing if no budget specified
            base_price = 200.0
        
        calculated_total = base_price * passengers
        
        booking_id = f"BK{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        db_booking = Booking(
            booking_id=booking_id,
            trip_id=trip_id,
            trip_name=itinerary.trip_name,
            destination=itinerary.destination,
            start_date=itinerary.start_date,
            end_date=itinerary.end_date,
            base_price=base_price,
            total_price=calculated_total,
            passengers=passengers,
            flight_details={},
            hotel_details={},
            status="pending",
            payment_status="unpaid"
        )
        
        db.add(db_booking)
        db.commit()
        db.refresh(db_booking)
        
        booking_data = {
            "id": booking_id,
            "booking_id": booking_id,
            "trip_id": trip_id,
            "trip_name": itinerary.trip_name,
            "destination": itinerary.destination,
            "start_date": itinerary.start_date,
            "end_date": itinerary.end_date,
            "base_price": base_price,
            "total_price": calculated_total,
            "passengers": passengers,
            "status": "pending",
            "payment_status": "unpaid",
            "created_at": db_booking.created_at.isoformat() if db_booking.created_at else datetime.now().isoformat()
        }
        
        return {
            "status": "success",
            "booking_id": booking_id,
            "booking": booking_data
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "TripMind AI Agent"}

# Calendar Events API Endpoints
@app.get("/api/calendar/events")
async def get_calendar_events(start: Optional[str] = None, end: Optional[str] = None, db: Session = Depends(get_db)):
    """Get all calendar events, optionally filtered by date range."""
    try:
        # Get all calendar events
        all_events = db.query(CalendarEvent).all()
        
        # Also get bookings and convert them to calendar events
        bookings = db.query(Booking).filter(Booking.status.in_(["pending", "confirmed"])).all()
        
        events = []
        
        # Add manual calendar events
        for event in all_events:
            # Determine color based on event type
            color = event.color
            if not color:
                if event.event_type == "booking":
                    color = "#3b82f6"  # Blue for bookings
                elif event.event_type == "trip":
                    color = "#10b981"  # Green for trips
                elif event.event_type == "reminder":
                    color = "#f59e0b"  # Yellow for reminders
                else:
                    color = "#6366f1"  # Purple for personal
            
            # Format start and end dates properly
            start_str = event.start_date
            end_str = event.end_date
            
            # Add time if not all-day and time is provided
            if event.start_time and event.all_day != "true":
                start_str = f"{event.start_date}T{event.start_time}:00"
            if event.end_time and event.all_day != "true":
                end_str = f"{event.end_date}T{event.end_time}:00"
            
            events.append({
                "id": f"event_{event.id}",
                "title": event.title or "Untitled Event",
                "description": event.description or "",
                "start": start_str,
                "end": end_str,
                "allDay": event.all_day == "true",
                "backgroundColor": color,
                "borderColor": color,
                "textColor": "#ffffff",
                "extendedProps": {
                    "event_type": event.event_type or "personal",
                    "tags": event.tags if event.tags else [],
                    "booking_id": event.booking_id,
                    "reminder_enabled": event.reminder_enabled == "true",
                    "reminder_time": event.reminder_time,
                    "database_id": event.id
                }
            })
        
        # Add booking events
        for booking in bookings:
            status_color = {
                "pending": "#f59e0b",  # Yellow
                "confirmed": "#10b981",  # Green
                "cancelled": "#ef4444",  # Red
                "completed": "#6b7280"  # Gray
            }.get(booking.status, "#6366f1")
            
            events.append({
                "id": f"booking_{booking.booking_id}",
                "title": f"✈️ {booking.trip_name}",
                "description": f"Destination: {booking.destination}\nPassengers: {booking.passengers}\nStatus: {booking.status.title()}",
                "start": booking.start_date,
                "end": booking.end_date,
                "allDay": True,
                "backgroundColor": status_color,
                "borderColor": status_color,
                "textColor": "#ffffff",
                "extendedProps": {
                    "event_type": "booking",
                    "booking_id": booking.booking_id,
                    "status": booking.status,
                    "destination": booking.destination,
                    "is_booking": True
                }
            })
        
        return {
            "status": "success",
            "events": events
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/calendar/events")
async def create_calendar_event(event: CalendarEventRequest, db: Session = Depends(get_db)):
    """Create a new calendar event."""
    try:
        # Validate required fields
        if not event.title or not event.title.strip():
            return {
                "status": "error",
                "error": "Event title is required"
            }
        
        if not event.start_date or not event.end_date:
            return {
                "status": "error",
                "error": "Start date and end date are required"
            }
        
        # Validate date format
        try:
            from datetime import datetime
            start_date_obj = datetime.strptime(event.start_date, "%Y-%m-%d")
            end_date_obj = datetime.strptime(event.end_date, "%Y-%m-%d")
        except ValueError:
            return {
                "status": "error",
                "error": "Invalid date format. Please use YYYY-MM-DD format"
            }
        
        # Validate date ordering
        if end_date_obj < start_date_obj:
            return {
                "status": "error",
                "error": "End date must be on or after start date"
            }
        
        # Validate timed events (non all-day)
        if event.all_day == "false":
            # Both start_time and end_time must be provided
            if not event.start_time or not event.end_time:
                return {
                    "status": "error",
                    "error": "Start time and end time are required for timed events"
                }
            
            # Validate time format (for all timed events, not just same-day)
            try:
                start_time_obj = datetime.strptime(event.start_time, "%H:%M")
                end_time_obj = datetime.strptime(event.end_time, "%H:%M")
            except ValueError:
                return {
                    "status": "error",
                    "error": "Invalid time format. Please use HH:MM format"
                }
            
            # Validate time ordering (only for same-day events)
            if event.start_date == event.end_date:
                if end_time_obj <= start_time_obj:
                    return {
                        "status": "error",
                        "error": "End time must be after start time"
                    }
        
        # Determine color based on event type if not provided
        color = event.color
        if not color:
            if event.event_type == "booking":
                color = "#3b82f6"
            elif event.event_type == "trip":
                color = "#10b981"
            elif event.event_type == "reminder":
                color = "#f59e0b"
            else:
                color = "#6366f1"
        
        db_event = CalendarEvent(
            title=event.title.strip(),
            description=event.description,
            start_date=event.start_date,
            end_date=event.end_date,
            start_time=event.start_time,
            end_time=event.end_time,
            all_day=event.all_day or "true",
            event_type=event.event_type or "personal",
            tags=event.tags or [],
            color=color,
            booking_id=event.booking_id,
            reminder_enabled=event.reminder_enabled or "false",
            reminder_time=event.reminder_time
        )
        
        db.add(db_event)
        db.commit()
        db.refresh(db_event)
        
        return {
            "status": "success",
            "event_id": db_event.id,
            "message": "Event created successfully"
        }
    except Exception as e:
        db.rollback()
        import traceback
        error_msg = str(e)
        print(f"Error creating calendar event: {error_msg}")
        print(traceback.format_exc())
        return {
            "status": "error",
            "error": f"Failed to create event: {error_msg}"
        }

@app.put("/api/calendar/events/{event_id}")
async def update_calendar_event(event_id: int, event: CalendarEventRequest, db: Session = Depends(get_db)):
    """Update an existing calendar event."""
    try:
        db_event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
        if not db_event:
            return {
                "status": "error",
                "error": "Event not found"
            }
        
        # Validate required fields
        if not event.title or not event.title.strip():
            return {
                "status": "error",
                "error": "Event title is required"
            }
        
        db_event.title = event.title.strip()
        db_event.description = event.description
        db_event.start_date = event.start_date
        db_event.end_date = event.end_date
        db_event.start_time = event.start_time
        db_event.end_time = event.end_time
        db_event.all_day = event.all_day or "true"
        db_event.event_type = event.event_type or db_event.event_type
        db_event.tags = event.tags or db_event.tags
        if event.color:
            db_event.color = event.color
        db_event.reminder_enabled = event.reminder_enabled or db_event.reminder_enabled
        db_event.reminder_time = event.reminder_time
        db_event.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(db_event)
        
        return {
            "status": "success",
            "message": "Event updated successfully"
        }
    except Exception as e:
        db.rollback()
        import traceback
        error_msg = str(e)
        print(f"Error updating calendar event: {error_msg}")
        print(traceback.format_exc())
        return {
            "status": "error",
            "error": f"Failed to update event: {error_msg}"
        }

@app.delete("/api/calendar/events/{event_id}")
async def delete_calendar_event(event_id: int, db: Session = Depends(get_db)):
    """Delete a calendar event."""
    try:
        db_event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
        if not db_event:
            return {
                "status": "error",
                "error": "Event not found"
            }
        
        db.delete(db_event)
        db.commit()
        
        return {
            "status": "success",
            "message": "Event deleted successfully"
        }
    except Exception as e:
        db.rollback()
        import traceback
        error_msg = str(e)
        print(f"Error deleting calendar event: {error_msg}")
        print(traceback.format_exc())
        return {
            "status": "error",
            "error": f"Failed to delete event: {error_msg}"
        }

@app.get("/api/calendar/stats")
async def get_calendar_stats(db: Session = Depends(get_db)):
    """Get calendar statistics including total and upcoming events."""
    try:
        from datetime import datetime, date
        today = date.today()
        
        all_events = db.query(CalendarEvent).all()
        total_events = len(all_events)
        
        upcoming_events = 0
        for event in all_events:
            try:
                event_start = datetime.strptime(event.start_date, "%Y-%m-%d").date()
                if event_start >= today:
                    upcoming_events += 1
            except:
                pass
        
        return {
            "status": "success",
            "total_events": total_events,
            "upcoming_events": upcoming_events,
            "past_events": total_events - upcoming_events
        }
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"Error getting calendar stats: {error_msg}")
        print(traceback.format_exc())
        return {
            "status": "error",
            "error": f"Failed to get calendar stats: {error_msg}"
        }

if __name__ == "__main__":
    # Run the server on 0.0.0.0:5000 for Replit
    uvicorn.run(app, host="0.0.0.0", port=5000)
