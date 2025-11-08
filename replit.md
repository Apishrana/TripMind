# Travel Planner AI Agent

## Overview

An autonomous AI-powered travel planning application that processes natural language queries to create complete travel itineraries. The system uses LangGraph's ReAct (Reasoning + Acting) agent framework to orchestrate multiple specialized tools, enabling the AI to autonomously chain actions like searching flights, finding hotels, checking weather, and generating day-by-day itineraries. Built with FastAPI for the backend and vanilla JavaScript for the frontend, it provides a simple yet powerful interface for intelligent travel planning.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Architecture
**Pattern**: Monolithic backend with embedded static frontend

**Backend**: FastAPI REST API server
- Exposes `/api/plan` endpoint for travel query processing
- Serves static files directly (no separate frontend server)
- Async request handling for better concurrency
- Automatic API documentation via FastAPI

**Frontend**: Vanilla JavaScript single-page application
- No framework dependencies (React, Vue, etc.)
- Direct DOM manipulation for UI updates
- Simple HTTP requests to backend API
- Eliminates build tooling and transpilation

**Rationale**: This architecture minimizes deployment complexity by bundling everything into a single Python application. FastAPI provides modern async capabilities while vanilla JS keeps the frontend lightweight and eliminates the need for Node.js, webpack, or other build tools.

### AI Agent Architecture
**Framework**: LangGraph with ReAct pattern

**Core Components**:
- **Agent Type**: `create_react_agent` - autonomous planning agent that reasons about which actions to take
- **LLM Provider**: OpenAI GPT-4o (referenced in code comments, though implementation may support multiple providers)
- **Reasoning Loop**: LLM analyzes user query → decides which tool to invoke → executes tool → evaluates result → repeats until complete
- **Memory**: ChatMessageHistory maintains conversation context across multiple interactions within a session

**Rationale**: The ReAct pattern enables true autonomous behavior where the LLM doesn't just respond but actively decides which tools to use and in what sequence. This allows complex multi-step planning like "search flights, then find hotels near the airport, then check weather, then create a daily itinerary" from a single user query. LangGraph provides the state machine to orchestrate this reasoning loop reliably.

### Tool System
**Pattern**: Decorator-based tool registry with Pydantic type validation

**Architecture**:
- **Registration**: LangChain `@tool` decorator converts Python functions into agent-callable tools
- **Type Safety**: Pydantic models validate all tool parameters
- **Modularity**: Each tool has single responsibility and clear input/output contract

**Available Tools** (8 total):
1. `search_flights` - Flight search with pricing, schedules, and airline information
2. `search_hotels` - Accommodation discovery with ratings and amenities
3. `get_weather_forecast` - Weather data retrieval for trip planning
4. `search_activities` - Local attractions, experiences, and points of interest
5. `calculate_trip_budget` - Cost estimation across all travel components
6. `save_user_preferences` - Persist user preferences (budget, interests, travel style)
7. `get_user_preferences` - Retrieve stored user preferences
8. `create_day_by_day_itinerary` - Generate structured daily schedules

**Rationale**: Modular tool design allows the agent to compose complex travel plans from simple, testable building blocks. Each tool handles one aspect of travel planning, making the system maintainable and extensible. The decorator pattern provides clean separation between business logic and agent integration.

### State Management
**Pattern**: Hybrid storage - ephemeral conversation memory + global preference store

**Conversation State**:
- **Storage**: ChatMessageHistory (in-memory, per-session)
- **Lifecycle**: Persists only during active user session
- **Contents**: User queries and AI responses for context-aware conversations

**User Preferences**:
- **Storage**: Global dictionary `user_preferences_store` (in-memory)
- **Persistence**: Survives across sessions but resets on server restart
- **Access**: Via `save_user_preferences` and `get_user_preferences` tools

**Rationale**: Conversation memory is intentionally ephemeral since each planning session is typically independent. User preferences use a simple global store to demonstrate the concept without database complexity. In production, this would be replaced with persistent storage (database).

**Production Consideration**: The current in-memory preference store will lose data on server restart. For production deployment, this should be replaced with a database (PostgreSQL, MongoDB, etc.) or file-based persistence.

### Data Flow
**Request Lifecycle**:
1. User submits natural language query via frontend
2. POST request to `/api/plan` endpoint
3. TravelPlannerAgent receives query and initializes ReAct loop
4. Agent invokes tools autonomously based on LLM reasoning
5. Tools return mock or real data (depending on integration)
6. Agent synthesizes final travel plan
7. Response returned to frontend for display

**Tool Invocation Pattern**:
- LLM analyzes query and generates tool calls with parameters
- LangGraph executor runs tool functions
- Tool results fed back to LLM for next reasoning step
- Process continues until agent determines plan is complete

## External Dependencies

### AI/ML Services
**LangChain & LangGraph**:
- Core framework for agent orchestration and tool management
- Provides ReAct agent implementation and state machine
- Handles LLM provider abstraction

**Groq API**:
- Primary LLM provider (Llama 3.3 70B Versatile model)
- Ultra-fast inference speed on Groq's LPU architecture
- Used for natural language understanding and reasoning
- Generates tool invocations and synthesizes final responses
- Configured via GROQ_API_KEY environment variable

### Backend Framework
**FastAPI**:
- REST API server with automatic OpenAPI documentation
- Async request handling
- Static file serving
- Pydantic integration for request/response validation

**Uvicorn**:
- ASGI server for running FastAPI application
- Production-ready HTTP server

### Data Validation
**Pydantic**:
- Request/response model validation
- Tool parameter type checking
- Data serialization/deserialization

### External APIs (Mocked)
**Current Status**: All tools return mock data

**Production Integration Points**:
- Flight search APIs (e.g., Amadeus, Skyscanner)
- Hotel booking APIs (e.g., Booking.com, Expedia)
- Weather services (e.g., OpenWeatherMap, Weather.com)
- Activity/attraction databases (e.g., Google Places, TripAdvisor)

**Rationale**: Mock data allows development and testing without API costs or rate limits. The tool interface is designed to easily swap mock implementations for real API integrations.

### Database (Future)
**Current**: In-memory dictionaries for user preferences
**Recommended**: PostgreSQL or MongoDB for production
- User preference persistence
- Conversation history archival
- Trip plan storage