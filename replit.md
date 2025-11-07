# Travel Planner & Automation AI Agent

## Overview
An autonomous AI agent that plans travel itineraries, finds flights/hotels, manages travel preferences, and automates travel-related tasks using natural language understanding.

## Project Architecture

### Tech Stack
- **Backend**: Python + FastAPI
- **AI/ML**: LangChain + OpenAI GPT-5
- **Frontend**: HTML/CSS/JavaScript (vanilla)
- **APIs**: Simulated travel APIs (flights, hotels, activities, weather)

### Key Features
1. **Autonomous Planning**: Multi-step reasoning for complete trip planning
2. **Natural Language Understanding**: Parse complex travel requests
3. **Memory System**: Remembers user preferences across sessions
4. **Budget Optimization**: Finds best options within constraints
5. **Comprehensive Planning**: Flights, hotels, activities, weather, itineraries
6. **Smart Recommendations**: Context-aware suggestions

### File Structure
```
.
├── main.py                 # FastAPI application and API endpoints
├── agent/
│   └── travel_agent.py     # Core AI agent with LangChain
├── static/
│   └── index.html          # Web interface
├── pyproject.toml          # Python dependencies
└── replit.md              # This file
```

### API Endpoints
- `GET /` - Main web interface
- `POST /api/plan` - Travel planning endpoint
- `POST /api/reset` - Clear conversation memory
- `GET /api/history` - Get conversation history
- `GET /api/preferences` - Get saved preferences
- `GET /health` - Health check

### Agent Capabilities
1. **Flight Search**: Simulated flight search with pricing
2. **Hotel Search**: Hotel recommendations with ratings
3. **Weather Forecast**: Destination weather information
4. **Activity Search**: Local attractions and experiences
5. **Budget Calculator**: Cost breakdown and optimization
6. **Preference Memory**: Save and retrieve user preferences
7. **Itinerary Creation**: Day-by-day trip planning

## Recent Changes
- Initial setup with FastAPI and LangChain
- Implemented autonomous travel planning agent
- Created interactive web interface
- Added memory system for user preferences
- Integrated multi-step reasoning workflow

## Environment Variables
- `OPENAI_API_KEY`: Required for GPT-5 API access

## Running the Application
The app runs on `http://0.0.0.0:5000` and is accessible via Replit's webview.

## Demo Examples
1. "Plan a 5-day beach trip in Goa under $500, December"
2. "I want to visit Paris for 7 days with my family, budget is $3000, we love museums and food"
3. "Plan a weekend adventure trip to Manali for trekking and camping, budget $200"
4. "I prefer luxury hotels, vegetarian food, and cultural activities. Save this for future trips."

## Future Enhancements
- Real API integrations (Amadeus, Skyscanner, Booking.com)
- Email/Calendar automation
- Payment integration
- Multi-user support with database
- Advanced NLP for better entity extraction
