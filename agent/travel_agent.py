import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.prebuilt import create_react_agent

# Using Groq API with llama-3.3-70b-versatile model for fast travel planning

# Global user preferences storage (in production would use a database)
user_preferences_store = {}

@tool
def search_flights(origin: str, destination: str, date: str, max_budget: float = 1000.0) -> str:
    """
    Search for available flights between two cities.
    
    Args:
        origin: Departure city
        destination: Arrival city
        date: Travel date in YYYY-MM-DD format
        max_budget: Maximum budget per person for the flight
        
    Returns:
        JSON string with flight options including prices, times, airlines
    """
    flights = [
        {
            "airline": "Air India",
            "flight_number": "AI202",
            "departure_time": "08:00",
            "arrival_time": "10:30",
            "duration": "2h 30m",
            "price": min(max_budget * 0.6, 450),
            "stops": 0,
            "class": "Economy"
        },
        {
            "airline": "IndiGo",
            "flight_number": "6E345",
            "departure_time": "14:00",
            "arrival_time": "16:45",
            "duration": "2h 45m",
            "price": min(max_budget * 0.4, 350),
            "stops": 0,
            "class": "Economy"
        },
        {
            "airline": "SpiceJet",
            "flight_number": "SG890",
            "departure_time": "18:30",
            "arrival_time": "21:15",
            "duration": "2h 45m",
            "price": min(max_budget * 0.35, 320),
            "stops": 0,
            "class": "Economy"
        }
    ]
    
    result = {
        "origin": origin,
        "destination": destination,
        "date": date,
        "flights_found": len(flights),
        "flights": flights
    }
    
    return json.dumps(result, indent=2)

@tool
def search_hotels(city: str, check_in: str, check_out: str, max_price_per_night: float = 150.0, accommodation_style: str = "any") -> str:
    """
    Search for hotels in a destination city.
    
    Args:
        city: Destination city
        check_in: Check-in date in YYYY-MM-DD format
        check_out: Check-out date in YYYY-MM-DD format
        max_price_per_night: Maximum budget per night
        accommodation_style: Preference like 'luxury', 'budget-friendly', 'mid-range', or 'any'
        
    Returns:
        JSON string with hotel options including prices, ratings, amenities
    """
    all_hotels = [
        {
            "name": "Beach Paradise Resort",
            "rating": 4.5,
            "price_per_night": min(max_price_per_night * 0.8, 120),
            "location": "Beachfront",
            "amenities": ["Pool", "WiFi", "Breakfast", "Spa", "Beach Access"],
            "reviews": 1250,
            "style": "luxury"
        },
        {
            "name": "Cozy Inn & Suites",
            "rating": 4.2,
            "price_per_night": min(max_price_per_night * 0.5, 80),
            "location": "City Center",
            "amenities": ["WiFi", "Breakfast", "Parking", "Gym"],
            "reviews": 890,
            "style": "mid-range"
        },
        {
            "name": "Budget Stay Hotel",
            "rating": 3.8,
            "price_per_night": min(max_price_per_night * 0.3, 50),
            "location": "Near Beach",
            "amenities": ["WiFi", "AC", "24/7 Reception"],
            "reviews": 456,
            "style": "budget-friendly"
        }
    ]
    
    # Filter by style preference
    if accommodation_style != "any":
        filtered_hotels = [h for h in all_hotels if h["style"] == accommodation_style]
        if filtered_hotels:
            all_hotels = filtered_hotels
    
    result = {
        "city": city,
        "check_in": check_in,
        "check_out": check_out,
        "hotels_found": len(all_hotels),
        "hotels": all_hotels
    }
    
    return json.dumps(result, indent=2)

@tool
def get_weather_forecast(city: str, date: str) -> str:
    """
    Get weather forecast for a destination.
    
    Args:
        city: Destination city
        date: Date for weather forecast in YYYY-MM-DD format
        
    Returns:
        JSON string with weather information
    """
    # Simulate different weather based on month
    month = int(date.split("-")[1])
    
    if month in [12, 1, 2]:  # Winter
        weather = {
            "city": city,
            "date": date,
            "temperature_high": "25°C",
            "temperature_low": "18°C",
            "condition": "Sunny and pleasant",
            "humidity": "55%",
            "precipitation_chance": "5%",
            "recommendation": "Perfect weather for outdoor activities! Light jacket for evenings."
        }
    elif month in [3, 4, 5]:  # Summer
        weather = {
            "city": city,
            "date": date,
            "temperature_high": "32°C",
            "temperature_low": "26°C",
            "condition": "Hot and sunny",
            "humidity": "70%",
            "precipitation_chance": "15%",
            "recommendation": "Hot weather - stay hydrated and use sunscreen. Beach time recommended!"
        }
    else:  # Monsoon/Fall
        weather = {
            "city": city,
            "date": date,
            "temperature_high": "28°C",
            "temperature_low": "22°C",
            "condition": "Partly cloudy with occasional showers",
            "humidity": "80%",
            "precipitation_chance": "60%",
            "recommendation": "Pack an umbrella and rain jacket. Great for indoor activities."
        }
    
    return json.dumps(weather, indent=2)

@tool
def search_activities(city: str, categories: Optional[List[str]] = None) -> str:
    """
    Search for activities and attractions in a destination.
    
    Args:
        city: Destination city
        categories: List of interest categories like ['adventure', 'culture', 'food', 'beach', 'nightlife']
        
    Returns:
        JSON string with activity options
    """
    all_activities = [
        {
            "name": "Scuba Diving Adventure",
            "category": "adventure",
            "duration": "3 hours",
            "price": 75,
            "rating": 4.7,
            "description": "Explore vibrant coral reefs and marine life with expert instructors"
        },
        {
            "name": "Beach Sunset Cruise",
            "category": "beach",
            "duration": "2 hours",
            "price": 50,
            "rating": 4.6,
            "description": "Romantic sunset cruise along the coast with dinner included"
        },
        {
            "name": "Local Food & Spice Tour",
            "category": "food",
            "duration": "4 hours",
            "price": 40,
            "rating": 4.8,
            "description": "Taste authentic local cuisine and visit spice plantations"
        },
        {
            "name": "Historical Fort & Museum Visit",
            "category": "culture",
            "duration": "3 hours",
            "price": 15,
            "rating": 4.4,
            "description": "Explore centuries-old Portuguese architecture and local history"
        },
        {
            "name": "Parasailing Experience",
            "category": "adventure",
            "duration": "1 hour",
            "price": 60,
            "rating": 4.9,
            "description": "Soar 300 feet above the beach with breathtaking aerial views"
        },
        {
            "name": "Yoga & Meditation Retreat",
            "category": "wellness",
            "duration": "2 hours",
            "price": 30,
            "rating": 4.5,
            "description": "Beachside morning yoga and meditation session"
        },
        {
            "name": "Night Market & Street Food",
            "category": "nightlife",
            "duration": "3 hours",
            "price": 25,
            "rating": 4.7,
            "description": "Explore bustling night markets and taste local street food"
        }
    ]
    
    # Filter by categories if specified
    if categories:
        filtered = [a for a in all_activities if a["category"] in categories]
        if filtered:
            all_activities = filtered
    
    result = {
        "city": city,
        "activities_found": len(all_activities),
        "activities": all_activities
    }
    
    return json.dumps(result, indent=2)

@tool
def calculate_trip_budget(flight_cost: float, hotel_cost_per_night: float, num_nights: int, 
                         activity_costs: List[float], daily_meal_budget: float = 30.0) -> str:
    """
    Calculate total trip budget breakdown.
    
    Args:
        flight_cost: Cost of round-trip flights
        hotel_cost_per_night: Hotel cost per night
        num_nights: Number of nights staying
        activity_costs: List of activity costs to include
        daily_meal_budget: Estimated daily budget for meals
        
    Returns:
        JSON string with detailed budget breakdown
    """
    hotel_total = hotel_cost_per_night * num_nights
    meals_total = daily_meal_budget * num_nights
    activities_total = sum(activity_costs)
    transportation_total = 50  # Local transportation estimate
    
    total = flight_cost + hotel_total + meals_total + activities_total + transportation_total
    
    breakdown = {
        "flights": {
            "amount": flight_cost,
            "percentage": round((flight_cost / total * 100), 1)
        },
        "accommodation": {
            "amount": hotel_total,
            "nights": num_nights,
            "per_night": hotel_cost_per_night,
            "percentage": round((hotel_total / total * 100), 1)
        },
        "meals": {
            "amount": meals_total,
            "per_day": daily_meal_budget,
            "percentage": round((meals_total / total * 100), 1)
        },
        "activities": {
            "amount": activities_total,
            "count": len(activity_costs),
            "percentage": round((activities_total / total * 100), 1)
        },
        "local_transportation": {
            "amount": transportation_total,
            "percentage": round((transportation_total / total * 100), 1)
        },
        "total_cost": total,
        "currency": "USD"
    }
    
    return json.dumps(breakdown, indent=2)

@tool
def save_user_preferences(preferences: Dict[str, Any]) -> str:
    """
    Save user travel preferences for future reference.
    
    Args:
        preferences: Dictionary of preferences like {'accommodation_style': 'luxury', 'dietary': 'vegetarian', 'interests': ['culture', 'food']}
        
    Returns:
        Confirmation message
    """
    global user_preferences_store
    user_preferences_store.update(preferences)
    
    return json.dumps({
        "status": "success",
        "message": f"Saved {len(preferences)} preferences",
        "current_preferences": user_preferences_store
    }, indent=2)

@tool
def get_user_preferences() -> str:
    """
    Retrieve all saved user preferences.
    
    Returns:
        JSON string with all saved preferences
    """
    global user_preferences_store
    
    if not user_preferences_store:
        return json.dumps({
            "status": "empty",
            "message": "No preferences saved yet",
            "preferences": {}
        }, indent=2)
    
    return json.dumps({
        "status": "success",
        "preferences": user_preferences_store
    }, indent=2)

@tool
def create_day_by_day_itinerary(destination: str, num_days: int, activities: List[str], 
                                hotel_name: str, special_interests: Optional[List[str]] = None) -> str:
    """
    Create a detailed day-by-day travel itinerary.
    
    Args:
        destination: Destination city
        num_days: Number of days for the trip
        activities: List of activity names to include
        hotel_name: Name of the hotel
        special_interests: Optional list of special interests to emphasize
        
    Returns:
        JSON string with detailed daily itinerary
    """
    itinerary = {
        "destination": destination,
        "duration_days": num_days,
        "hotel": hotel_name,
        "days": []
    }
    
    for day in range(1, num_days + 1):
        if day == 1:
            day_plan = {
                "day": day,
                "theme": "Arrival & Settling In",
                "morning": f"Arrive at {destination}, hotel check-in at {hotel_name}",
                "afternoon": "Light exploration of nearby area, beach/pool relaxation",
                "evening": "Welcome dinner at hotel restaurant or nearby recommended spot",
                "tips": "Rest and adjust to the new environment"
            }
        elif day == num_days:
            day_plan = {
                "day": day,
                "theme": "Departure Day",
                "morning": "Final breakfast, last-minute shopping or beach time",
                "afternoon": "Hotel checkout, departure",
                "evening": "Travel home",
                "tips": "Pack souvenirs carefully, confirm flight times"
            }
        else:
            # Assign activities to middle days
            activity_idx = (day - 2) % len(activities) if activities else 0
            activity_name = activities[activity_idx] if activities else "Local exploration"
            
            day_plan = {
                "day": day,
                "theme": f"Adventure Day - {activity_name}",
                "morning": f"Scheduled activity: {activity_name}",
                "afternoon": "Lunch at local restaurant, free time for beach or pool",
                "evening": "Explore local markets, dinner at recommended restaurant",
                "tips": "Stay hydrated, bring sunscreen and camera"
            }
        
        itinerary["days"].append(day_plan)
    
    return json.dumps(itinerary, indent=2)


class TravelPlannerAgent:
    """Autonomous AI agent for travel planning with LangChain agent executor."""
    
    def __init__(self):
        # Use GROQ_API_KEY environment variable
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.7
        )
        
        # Chat history for conversation memory
        self.chat_history = ChatMessageHistory()
        
        # Create tools list
        self.tools = [
            search_flights,
            search_hotels,
            get_weather_forecast,
            search_activities,
            calculate_trip_budget,
            save_user_preferences,
            get_user_preferences,
            create_day_by_day_itinerary
        ]
        
        # Create the agent
        self.agent_executor = self._create_agent_executor()
    
    def _create_agent_executor(self):
        """Create the LangGraph agent with tools."""
        
        # System message for the agent
        system_message = """You are an autonomous AI travel planning agent with access to powerful tools.

Your Mission:
- Understand user travel requests through natural language
- Autonomously use available tools to gather comprehensive information
- Make intelligent recommendations based on preferences, budget, and context
- Remember and apply user preferences across conversations
- Create complete, well-reasoned travel plans

Available Tools:
- search_flights: Find flight options with prices and schedules
- search_hotels: Discover hotels matching preferences and budget
- get_weather_forecast: Check weather for travel dates
- search_activities: Find attractions and activities
- calculate_trip_budget: Compute detailed cost breakdowns
- save_user_preferences: Store preferences for future trips
- get_user_preferences: Retrieve saved preferences
- create_day_by_day_itinerary: Generate detailed daily plans

Agent Behavior:
1. **Always start by checking saved preferences** using get_user_preferences
2. **Extract key information** from user request (destination, budget, dates, interests)
3. **Use tools autonomously** to gather flights, hotels, weather, activities
4. **Make smart decisions** - select best options considering budget and preferences
5. **Calculate budgets** to ensure plans fit constraints
6. **Create itineraries** with day-by-day details
7. **Save new preferences** when user mentions them
8. **Be proactive** - if user mentions they "love adventure", save it and suggest adventure activities

Response Format:
- Use clear headings and sections
- Present options with details (prices, ratings, times)
- Explain your reasoning
- Provide alternatives
- Be enthusiastic and helpful!

Remember: You have autonomy to use multiple tools in sequence to build complete travel plans!"""
        
        # Create the agent using LangGraph's create_react_agent
        agent_executor = create_react_agent(
            self.llm,
            self.tools,
            prompt=SystemMessage(content=system_message)
        )
        
        return agent_executor
    
    def plan_trip(self, user_request: str) -> Dict[str, Any]:
        """Process user travel request using the autonomous agent."""
        try:
            # Prepare chat history for the agent
            chat_history_messages = list(self.chat_history.messages)
            
            # Invoke the agent with LangGraph
            result = self.agent_executor.invoke({
                "messages": chat_history_messages + [HumanMessage(content=user_request)]
            })
            
            # Extract the final response
            final_message = result["messages"][-1]
            
            # Handle different response formats (Gemini returns list, OpenAI returns string)
            if hasattr(final_message, 'content'):
                content = final_message.content
                # If content is a list (Gemini format), extract text from it
                if isinstance(content, list):
                    response_text = ""
                    for item in content:
                        if isinstance(item, dict) and 'text' in item:
                            response_text += item['text']
                        elif isinstance(item, str):
                            response_text += item
                else:
                    response_text = str(content)
            else:
                response_text = str(final_message)
            
            # Add to chat history
            self.chat_history.add_user_message(user_request)
            self.chat_history.add_ai_message(response_text)
            
            return {
                "status": "success",
                "request": user_request,
                "response": response_text
            }
            
        except Exception as e:
            error_msg = f"I encountered an error while planning: {str(e)}\n\nPlease try rephrasing your request or provide more details."
            return {
                "status": "error",
                "request": user_request,
                "error": str(e),
                "response": error_msg
            }
    
    def reset_memory(self):
        """Clear conversation history."""
        self.chat_history.clear()
    
    def get_conversation_history(self) -> List[Dict[str, str]]:
        """Get formatted conversation history."""
        messages = []
        for msg in self.chat_history.messages:
            messages.append({
                "role": "assistant" if isinstance(msg, AIMessage) else "user",
                "content": msg.content
            })
        return messages
