import os
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
from database import init_db, get_db, Itinerary, Booking

# Initialize FastAPI app
app = FastAPI(title="Travel Planner AI Agent")

# Initialize database
init_db()

# Initialize Stripe (API key will be set from environment)
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')

# Initialize the AI agent (only if API key is available)
agent = None
try:
    if os.environ.get('GROQ_API_KEY'):
        agent = TravelPlannerAgent()
    else:
        print("Warning: GROQ_API_KEY not set. AI agent features will be unavailable.")
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

@app.post("/api/plan", response_model=TravelResponse)
async def plan_trip(query: TravelQuery):
    """
    Main endpoint for travel planning.
    Accepts natural language queries and returns AI-generated travel plans.
    """
    if agent is None:
        return TravelResponse(
            status="error",
            response="⚠️ AI Agent is currently unavailable. Please configure the GROQ_API_KEY environment variable to enable AI-powered trip planning. You can still use the booking features!",
            request=query.query,
            error="AI agent is not available. Please set GROQ_API_KEY environment variable."
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

@app.post("/api/bookings")
async def create_booking(booking: BookingRequest, db: Session = Depends(get_db)):
    """Create a new booking with server-side price calculation."""
    try:
        # SECURITY: Calculate price server-side using canonical trip prices
        # Ignore any client-provided total_price
        
        if booking.trip_id not in TRIP_PRICES:
            raise HTTPException(
                status_code=400, 
                detail=f"Unknown trip ID: {booking.trip_id}"
            )
        
        # Validate passenger count
        if booking.passengers < 1 or booking.passengers > 10:
            raise HTTPException(
                status_code=400,
                detail="Passenger count must be between 1 and 10"
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
    return {"status": "healthy", "service": "Travel Planner AI Agent"}

if __name__ == "__main__":
    # Run the server on 0.0.0.0:5000 for Replit
    uvicorn.run(app, host="0.0.0.0", port=5000)
