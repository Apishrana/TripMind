# Travel Planner AI Agent

## Overview

An autonomous AI-powered travel planning application that uses natural language processing to create complete travel itineraries. The system leverages LangGraph's reactive agent framework to orchestrate multiple specialized tools, enabling multi-step reasoning and intelligent decision-making. Users interact through a conversational web interface where they can request travel plans in natural language, and the AI agent autonomously researches flights, hotels, activities, weather, and budgets to generate comprehensive itineraries.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Architecture
**Pattern**: Monolithic backend with static frontend
- **Backend**: FastAPI server exposing REST API endpoints
- **Frontend**: Vanilla JavaScript single-page application (no framework)
- **Deployment**: Self-contained Python application with embedded static file serving

**Rationale**: Simplifies deployment and reduces complexity. FastAPI provides async capabilities and automatic API documentation. Vanilla JS keeps the frontend lightweight and eliminates build tooling requirements.

### AI Agent Architecture
**Framework**: LangGraph with ReAct (Reasoning + Acting) pattern
- **Agent Type**: `create_react_agent` - autonomous multi-step planning agent
- **LLM Provider**: Google Gemini AI (gemini-2.5-flash or gemini-2.5-pro models)
- **Tool Orchestration**: LLM decides which tools to invoke and in what sequence
- **Memory Management**: ChatMessageHistory maintains conversation context across interactions

**Rationale**: LangGraph's ReAct agent enables true autonomous behavior where the LLM reasons about which actions to take. This allows the agent to chain multiple tools (e.g., search flights → check weather → find hotels → calculate budget) without hardcoded workflows. Google Gemini provides cost-effective, high-quality language understanding.

### Tool System
**Pattern**: Decorator-based tool registry with typed inputs
- **Implementation**: LangChain `@tool` decorators for function-to-tool conversion
- **Tool Count**: 8 specialized tools covering different travel planning domains
- **Type Safety**: Pydantic validation for tool parameters

**Tools**:
1. `search_flights` - Flight search with pricing
2. `search_hotels` - Accommodation discovery
3. `get_weather_forecast` - Weather data retrieval
4. `search_activities` - Local attractions/experiences
5. `calculate_trip_budget` - Cost estimation
6. `save_user_preferences` - Preference persistence
7. `get_user_preferences` - Preference retrieval
8. `create_day_by_day_itinerary` - Daily schedule generation

**Rationale**: Modular tool design allows the agent to compose complex plans from simple building blocks. Each tool has a single responsibility, making them easier to test and maintain. The decorator pattern provides automatic schema generation for the LLM.

### State Management
**Pattern**: Hybrid - in-memory for conversations, global store for preferences
- **Conversation Memory**: ChatMessageHistory (per-session, ephemeral)
- **User Preferences**: Python dictionary (global, in-memory)
- **No Database**: Current implementation uses in-process storage

**Rationale**: For prototyping and demos, in-memory storage eliminates database setup complexity. Conversation history only needs to persist during active sessions. User preferences are stored globally to enable cross-session personalization.

**Production Consideration**: The global `user_preferences_store` dictionary would need migration to persistent storage (database, Redis, etc.) for production deployments to handle multiple users and server restarts.

### API Design
**Pattern**: RESTful JSON API with single planning endpoint
- **Endpoint**: `POST /api/plan` - accepts natural language queries
- **Request Format**: JSON with `query` field
- **Response Format**: Structured JSON with status, response, request echo, and error fields

**Rationale**: Simple API surface reduces integration complexity. Single endpoint handles all travel planning queries since the agent's autonomous nature allows it to interpret diverse intents from natural language.

### Frontend Architecture
**Pattern**: Static file serving with client-side rendering
- **No Build Process**: Direct HTML/CSS/JS files served via FastAPI StaticFiles
- **Real-time Updates**: Fetch API for async backend communication
- **Responsive Design**: CSS-based responsive layout without frameworks

**Rationale**: Zero build complexity speeds development iteration. Modern browsers handle vanilla JS efficiently. Gradient-based UI design provides visual appeal without heavy CSS frameworks.

## External Dependencies

### AI/ML Services
- **Google Gemini AI**: Primary LLM provider via `langchain_google_genai`
  - Models: gemini-2.5-flash or gemini-2.5-pro
  - Requires: `GEMINI_API_KEY` environment variable (passed as `google_api_key` parameter)
  - Purpose: Natural language understanding, reasoning, tool selection
  - Migration Note (Nov 2025): Migrated from OpenAI to Google Gemini for cost-effective AI credits

### Python Frameworks
- **FastAPI**: Web framework for REST API
  - Provides async request handling and automatic OpenAPI documentation
  
- **Uvicorn**: ASGI server for running FastAPI application
  - Production-ready async server

- **LangGraph**: Agent orchestration framework
  - Enables reactive agent pattern with multi-step reasoning
  
- **LangChain**: LLM application framework
  - Provides tool abstraction, prompt templates, message history
  - Components: `langchain_core`, `langchain_community`

- **Pydantic**: Data validation and settings management
  - Validates API request/response models
  - Provides type safety for tool parameters

### Data Storage
**Current**: In-memory Python dictionaries
- No external database configured
- `user_preferences_store`: global dictionary for user preferences
- `ChatMessageHistory`: per-session conversation storage

**Future Consideration**: System is designed to swap in persistent storage (PostgreSQL, MongoDB, Redis) by replacing the global dictionary with database calls in the preference save/get tools.

### Static Assets
- **No CDN dependencies**: All CSS/JS is inline or self-hosted
- **No frontend framework**: Pure HTML5/CSS3/JavaScript
- **No external fonts or libraries**: Self-contained design

## Installation & Setup

### Prerequisites
- Python 3.11 or higher
- pip (Python package manager)
- (Optional) Docker and Docker Compose for containerized deployment

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AI
   ```

2. **Install dependencies**
   ```bash
   # Using pip
   pip install -r requirements.txt
   
   # Or use the build script
   chmod +x build.sh
   ./build.sh
   
   # Or use Make
   make install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys:
   # - OPENROUTER_API_KEY (required for AI features)
   # - STRIPE_SECRET_KEY (required for payments)
   # - DATABASE_URL (optional, defaults to SQLite)
   ```

4. **Run the application**
   ```bash
   python3 main.py
   
   # Or use Make
   make run
   ```

5. **Access the application**
   - Open your browser to `http://localhost:5000`
   - API documentation available at `http://localhost:5000/docs`

### Docker Deployment

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```
   
   This will start:
   - Web application on port 5000
   - PostgreSQL database on port 5432

2. **Or build Docker image manually**
   ```bash
   docker build -t travel-planner-ai .
   docker run -p 5000:5000 --env-file .env travel-planner-ai
   ```

### Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database (optional - defaults to SQLite)
DATABASE_URL=postgresql://user:password@localhost:5432/traveldb

# AI Agent (required for AI features)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Stripe (required for payments)
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
```

## Build Commands

### Using Make
```bash
make install      # Install dependencies
make run          # Run the application
make build        # Build the application
make docker-build # Build Docker image
make docker-up    # Start Docker containers
make docker-down  # Stop Docker containers
make clean        # Clean build artifacts
```

### Using Build Script
```bash
./build.sh        # Automated build and setup
```

## Features

### ✅ Implemented
- 🤖 AI-powered travel planning with natural language queries
- ✈️ Flight and hotel search simulation
- 🌤️ Weather forecasting
- 🎯 Activity recommendations
- 💰 Budget calculation
- 📅 Itinerary creation and calendar management
- 💳 Complete booking system with Stripe integration
- 🗄️ Database persistence for bookings and itineraries
- 📋 User preference management
- 🔒 Secure payment processing

### 🚀 Production Ready
- Database-backed storage (SQLite/PostgreSQL)
- Docker containerization
- Health check endpoints
- Error handling and validation
- Server-side price validation
- Secure payment processing

## API Endpoints

- `GET /` - Main web interface
- `POST /api/plan` - AI travel planning
- `GET /api/bookings` - List all bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/{id}` - Get booking details
- `POST /api/create-checkout-session` - Create Stripe payment session
- `GET /api/itineraries` - List all itineraries
- `POST /api/itineraries` - Save itinerary
- `GET /health` - Health check

Full API documentation available at `/docs` when server is running.

## Development

### Project Structure
```
.
├── main.py              # FastAPI application
├── database.py          # Database models and setup
├── agent/
│   └── travel_agent.py  # AI agent implementation
├── static/
│   ├── index.html       # Frontend HTML
│   ├── app.js           # Frontend JavaScript
│   └── styles.css       # Frontend styles
├── requirements.txt     # Python dependencies
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose setup
└── .env.example         # Environment variables template
```

## License

This project is part of a hackathon submission.