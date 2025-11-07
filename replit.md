# Travel Planner & Automation AI Agent

## Overview
An autonomous AI agent that plans complete travel itineraries using natural language understanding, multi-step reasoning, and intelligent tool orchestration. The agent autonomously searches flights, hotels, activities, checks weather, calculates budgets, and creates detailed day-by-day itineraries while remembering user preferences across sessions.

## Project Status
✅ **Fully Functional** - Ready for demo and deployment

## Tech Stack
- **Backend**: Python 3.11 + FastAPI + Uvicorn
- **AI Framework**: LangGraph + LangChain
- **LLM**: OpenAI GPT-5 (latest model, August 2025)
- **Frontend**: HTML5/CSS3/JavaScript (vanilla, responsive design)
- **APIs**: 8 autonomous travel planning tools

## Key Features Implemented

### 1. **Autonomous Multi-Step Planning** ✨
- Uses LangGraph's `create_react_agent` for true autonomous decision-making
- LLM-driven tool orchestration - agent decides which tools to use and in what order
- Multi-step reasoning: agent chains multiple tools to build complete plans

### 2. **Intelligent Tool System** 🛠️
8 specialized tools with `@tool` decorators:
- `search_flights` - Find flights with prices, times, airlines
- `search_hotels` - Discover accommodations matching preferences
- `get_weather_forecast` - Weather information for travel dates
- `search_activities` - Local attractions and experiences
- `calculate_trip_budget` - Detailed cost breakdowns
- `save_user_preferences` - Store travel preferences
- `get_user_preferences` - Retrieve saved preferences
- `create_day_by_day_itinerary` - Generate detailed daily plans

### 3. **Memory & Personalization** 🧠
- **Conversation Memory**: Chat history preserved across interactions
- **Preference Storage**: Global store for cross-session preference recall
- **Context-Aware**: Agent proactively uses saved preferences when planning

### 4. **Smart Recommendations** 🎯
- Budget optimization - finds best options within constraints
- Weather-aware planning - considers seasonal conditions
- Interest-based filtering - matches activities to user preferences
- Multi-option presentation - provides alternatives with reasoning

### 5. **Beautiful Web Interface** 🎨
- Modern gradient design with purple/blue theme
- Quick example prompts for easy testing
- Real-time chat interface with loading states
- Responsive layout with sidebar and chat area
- Feature badges and visual hierarchy

## File Structure
```
.
├── agent/
│   └── travel_agent.py         # Core AI agent with LangGraph & tools
├── static/
│   └── index.html              # Interactive web interface
├── main.py                     # FastAPI application & API endpoints
├── pyproject.toml              # Python dependencies
└── replit.md                   # This documentation
```

## API Endpoints
- `GET /` - Main web interface
- `POST /api/plan` - Autonomous travel planning (agent orchestration)
- `POST /api/reset` - Clear conversation memory
- `GET /api/history` - Get conversation history
- `GET /api/preferences` - Get saved user preferences
- `GET /health` - Health check endpoint

## Agent Architecture

### How It Works
1. **User Input** → Natural language request via web interface
2. **Agent Reasoning** → LLM analyzes request and plans tool sequence
3. **Tool Execution** → Agent autonomously calls multiple tools:
   - Checks saved preferences first
   - Searches flights matching budget
   - Finds hotels based on preferences
   - Gets weather forecast
   - Discovers activities matching interests
   - Calculates detailed budget
   - Creates day-by-day itinerary
4. **Smart Response** → Agent synthesizes tool outputs into comprehensive plan
5. **Memory Update** → Saves new preferences and conversation context

### Autonomy Features
- ✅ Self-directed tool selection
- ✅ Multi-step reasoning chains
- ✅ Context-aware decision making
- ✅ Budget constraint handling
- ✅ Preference-based recommendations
- ✅ Error handling and graceful fallbacks

## Demo Examples

### Example 1: Beach Vacation
```
"Plan a 5-day beach trip in Goa under $500, December"
```
**Agent Actions**:
1. Checks preferences
2. Searches flights to Goa
3. Finds budget-friendly hotels
4. Gets December weather
5. Suggests beach activities
6. Calculates total budget
7. Creates 5-day itinerary

### Example 2: Family Trip with Preferences
```
"I want to visit Paris for 7 days with my family, budget is $3000, we love museums and food"
```
**Agent Actions**:
1. Saves preferences (family travel, museums, food)
2. Searches Paris flights
3. Finds family-friendly hotels
4. Gets Paris weather
5. Filters cultural & food activities
6. Budgets $3000 across all categories
7. Creates 7-day cultural itinerary

### Example 3: Adventure Weekend
```
"Plan a weekend adventure trip to Manali for trekking and camping, budget $200"
```
**Agent Actions**:
1. Detects adventure preference
2. Finds budget flights to Manali
3. Suggests adventure hotels/camps
4. Checks mountain weather
5. Lists trekking activities
6. Optimizes $200 budget
7. Creates 2-day adventure plan

### Example 4: Save Preferences
```
"I prefer luxury hotels, vegetarian food, and cultural activities. Save this for future trips."
```
**Agent Actions**:
1. Extracts preferences from text
2. Stores in global preference store
3. Confirms saved preferences
4. Will apply to all future planning

## Environment Variables
- `OPENAI_API_KEY` - Required for GPT-5 API access (managed via Replit Secrets)

## Running the Application
```bash
python main.py
```
Runs on `http://0.0.0.0:5000` - accessible via Replit's webview

## Recent Changes (November 7, 2025)
- ✅ Implemented LangGraph-based autonomous agent with `create_react_agent`
- ✅ Created 8 specialized tools with proper `@tool` decorators
- ✅ Integrated conversation memory with `ChatMessageHistory`
- ✅ Built global preference store for cross-session persistence
- ✅ Designed modern web interface with gradient styling
- ✅ Added comprehensive system prompt for agent behavior
- ✅ Implemented FastAPI endpoints with error handling
- ✅ Configured Replit workflow for port 5000 webview

## Technical Highlights

### Autonomy & Intelligence
- Uses GPT-5's native tool calling for autonomous decisions
- Agent decides tool sequence based on context, not hardcoded logic
- Multi-step reasoning: "I need budget → check preferences → search flights → find hotels → calculate total"
- Adapts to user preferences automatically

### Code Quality
- Type hints throughout (`typing` module)
- Proper error handling with try/except
- Clean separation: agent logic / API layer / frontend
- Tool outputs in structured JSON for LLM parsing
- Docstrings on all functions and tools

### Scalability Considerations
- Global preference store (production would use database)
- Stateless API design (except in-memory chat history)
- Tool outputs include all necessary context
- Agent handles variable-length tool sequences

## Future Enhancements
- 🔄 Real API integrations (Amadeus, Skyscanner, Booking.com, OpenWeatherMap)
- 📧 Email/calendar automation with tool integrations
- 💳 Payment processing integration
- 🗄️ Database for multi-user support and persistent storage
- 🌐 i18n support for multiple languages
- 📊 Analytics dashboard for popular destinations
- 🔐 User authentication and session management
- 🚀 Advanced NER for better entity extraction
- 📱 Mobile-responsive PWA

## Deployment Ready
This application is ready to be published on Replit! Click the "Deploy" button to make it live with a public URL.

## Credits
Built with:
- LangChain/LangGraph for AI agent orchestration
- OpenAI GPT-5 for natural language understanding
- FastAPI for modern Python web framework
- Replit for hosting and development environment
