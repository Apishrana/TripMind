# TripMind AI Agent

## Overview
TripMind is an autonomous AI-powered travel planning application that processes natural language queries to create complete travel itineraries. It uses LangGraph's ReAct agent framework to orchestrate specialized tools for flights, hotels, weather, activities, and itinerary generation. The application features a FastAPI backend and a vanilla JavaScript frontend, offering a robust platform for intelligent travel planning.

The project includes a complete authentication system with sign-in/sign-up, secure password hashing, and database-backed user sessions. It also boasts a full booking system with secure Stripe payment integration, allowing users to book and pay for trips directly within the platform. The user interface is designed with modern aesthetics, including animations, glassmorphic effects, and responsive multi-page layouts.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (Latest)
- **Fixed Critical Booking Flow Bug** (2025-11-09): Resolved "StructuredTool not callable" error
  - Issue: LangChain @tool decorated functions were being called as regular functions in /api/booking-options
  - Root cause: search_flights and search_hotels are StructuredTool objects, not callable functions
  - Solution: Changed to use .invoke() method with proper argument dictionaries
  - Impact: Booking options endpoint now successfully returns flight and hotel data
  - Testing: Confirmed working through API endpoint tests (returns 200 OK with valid data)
- **Migrated to OpenRouter.ai** (2025-11-09): Switched from Groq to OpenRouter for AI model access
  - Updated from ChatGroq to ChatOpenAI with OpenRouter base URL (https://openrouter.ai/api/v1)
  - Model: meta-llama/llama-3.3-70b-instruct (previously llama-3.3-70b-versatile)
  - Configuration: Now uses OPENROUTER_API_KEY environment variable
  - Benefits: Access to 100+ AI models, better pricing flexibility, easy model switching
  - Updated: main.py, agent/travel_agent.py, README.md, docker-compose.yml, replit.md
  - Testing: AI planning endpoint confirmed working with full trip generation
- **Improved Booking Flow Error Handling** (2025-11-08): Enhanced debugging and user experience
  - Replaced browser alerts with modern toast notifications
  - Added comprehensive console logging for trip details and API responses
  - Implemented proper HTTP status checking before parsing JSON
  - Check both data.message and data.error fields for complete error information

## System Architecture

### Application Architecture
The system employs a monolithic backend with an embedded static frontend. The backend is a FastAPI REST API server that handles travel query processing and serves static files. The frontend is built with vanilla JavaScript, prioritizing deployment simplicity and a lightweight frontend.

### AI Agent Architecture
The AI agent is built using LangGraph with a ReAct (Reasoning + Acting) pattern. It utilizes `create_react_agent` for autonomous planning, powered by Meta's Llama 3.3 70B Instruct model via OpenRouter.ai. The agent operates through a reasoning loop where the LLM analyzes queries, decides which tools to invoke, executes them, and evaluates results to formulate complex multi-step travel plans. `ChatMessageHistory` maintains conversation context within sessions.

### Tool System
A decorator-based tool registry with Pydantic type validation defines eight modular tools for:
- Flight search (`search_flights`)
- Accommodation discovery (`search_hotels`)
- Weather data (`get_weather_forecast`)
- Local attractions (`search_activities`)
- Cost estimation (`calculate_trip_budget`)
- User preferences persistence (`save_user_preferences`, `get_user_preferences`)
- Daily schedule generation (`create_day_by_day_itinerary`)

### State Management
The system uses hybrid storage:
- **Conversation State**: Ephemeral, in-memory `ChatMessageHistory` for active user sessions.
- **User Preferences**: A global in-memory dictionary (`user_preferences_store`) for user preferences, accessed via dedicated tools (would be replaced by persistent storage in production).

### UI/UX Decisions
The application features a multi-page design with animations, gradients, and responsive modals. Key design elements include:
- **Authentication**: Animated welcome page, glassmorphic feature cards, split-screen sign-in/sign-up with dark mode.
- **Plan Trip Page**: Immersive full-page split layout with an animated travel illustration, modern chat interface, quick action chips, live stats cards, and testimonials.
- **My Trips Page**: Dynamic trip cards with detailed metadata, location badges, features, and prominent pricing, with staggered fade-in animations.
- **General**: Glassmorphism effects, vibrant gradients, SVG graphics, and comprehensive dark mode support across all pages.

### Feature Specifications
- **Authentication System**: Secure sign-in/sign-up, bcrypt password hashing, database-backed sessions, dynamic navigation, and mobile responsiveness.
- **Booking System**: Secure Stripe payment integration, email validation, loading states, enhanced error handling, and comprehensive dark mode.
- **Smart Chat-to-Booking Flow**: AI automatically detects trip details, handles missing origin information, and offers "Book This Trip" or "Quick Book" options with seamless auto-population of booking pages.
- **Interactive Feature Explanations**: Clickable feature buttons provide detailed explanations in modal designs.

## External Dependencies

### AI/ML Services
- **LangChain & LangGraph**: Core frameworks for agent orchestration, tool management, and ReAct agent implementation.
- **OpenRouter.ai**: Primary LLM provider gateway, currently using Meta's Llama 3.3 70B Instruct model. Configured via `OPENROUTER_API_KEY`.

### Backend Framework
- **FastAPI**: REST API server providing automatic OpenAPI documentation, async request handling, static file serving, and Pydantic integration.
- **Uvicorn**: ASGI server for running the FastAPI application.

### Data Validation
- **Pydantic**: Used for request/response model validation, tool parameter type checking, and data serialization/deserialization.

### External APIs (Mocked)
All external APIs are currently mocked. Production integration points include:
- Flight search APIs (e.g., Amadeus, Skyscanner)
- Hotel booking APIs (e.g., Booking.com, Expedia)
- Weather services (e.g., OpenWeatherMap, Weather.com)
- Activity/attraction databases (e.g., Google Places, TripAdvisor)

### Database
- **Current**: SQLite (development) with PostgreSQL support for production.
- **Models**: User, Session, Itinerary, Booking, and CalendarEvent.