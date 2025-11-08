# TripMind AI Agent

## Overview
TripMind is an autonomous AI-powered travel planning application that processes natural language queries to create complete travel itineraries. It utilizes LangGraph's ReAct agent framework to orchestrate specialized tools for tasks such as searching flights, finding hotels, checking weather, and generating day-by-day itineraries. The application features a FastAPI backend and a vanilla JavaScript frontend, offering a robust platform for intelligent travel planning.

The project includes a complete authentication system with sign-in/sign-up functionality, secure password hashing, and database-backed user sessions. It also boasts a full booking system with secure Stripe payment integration, allowing users to book and pay for trips directly within the platform. The user interface is designed with modern aesthetics, including animations, glassmorphic effects, and responsive multi-page layouts.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Application Architecture
The system employs a monolithic backend with an embedded static frontend. The backend is a FastAPI REST API server that handles travel query processing and serves static files. The frontend is built with vanilla JavaScript, eliminating framework dependencies and complex build tooling. This architecture prioritizes deployment simplicity and a lightweight frontend.

### AI Agent Architecture
The AI agent is built using LangGraph with a ReAct (Reasoning + Acting) pattern. It utilizes `create_react_agent` for autonomous planning, powered by OpenAI GPT-4o for natural language understanding and reasoning. The agent operates through a reasoning loop where the LLM analyzes queries, decides which tools to invoke, executes them, and evaluates results to formulate complex multi-step travel plans. `ChatMessageHistory` maintains conversation context within sessions.

### Tool System
A decorator-based tool registry with Pydantic type validation defines eight modular tools:
- `search_flights`: Flight search with pricing and schedules.
- `search_hotels`: Accommodation discovery.
- `get_weather_forecast`: Weather data.
- `search_activities`: Local attractions and experiences.
- `calculate_trip_budget`: Cost estimation.
- `save_user_preferences`: Persist user preferences.
- `get_user_preferences`: Retrieve user preferences.
- `create_day_by_day_itinerary`: Generate daily schedules.
This modular design ensures maintainability and extensibility.

### State Management
The system uses hybrid storage:
- **Conversation State**: Ephemeral, in-memory `ChatMessageHistory` for active user sessions.
- **User Preferences**: A global in-memory dictionary (`user_preferences_store`) for user preferences, accessed via dedicated tools. This would be replaced by persistent storage in a production environment.

### UI/UX Decisions
The application features a multi-page design with stunning animations, eye-catching gradients, and responsive modals. Specific design elements include:
- **Authentication**: Animated welcome page with floating gradient orbs, glassmorphic feature cards, and split-screen sign-in/sign-up pages with dark mode support.
- **Plan Trip Page**: Immersive full-page split layout with an animated travel illustration, modern chat interface, quick action chips, live stats cards, and testimonials.
- **My Trips Page**: Redesigned dynamic trip cards with detailed metadata, location badges, features, and prominent pricing. Features staggered fade-in animations and clickable cards that lead to a detailed booking modal.
- **General**: Glassmorphism effects, vibrant gradients, SVG graphics, and comprehensive dark mode support across all pages.

### Feature Specifications
- **Authentication System**: Secure sign-in/sign-up, bcrypt password hashing, database-backed sessions, dynamic navigation, and mobile responsiveness.
- **Booking System**: Secure Stripe payment integration, email validation, loading states, enhanced error handling, and comprehensive dark mode.
- **Smart Chat-to-Booking Flow**: AI automatically detects trip details, intelligently handles missing origin information, and offers "Book This Trip" or "Quick Book" options with seamless auto-population of booking pages.
- **Interactive Feature Explanations**: Clickable feature buttons on the welcome page provide detailed explanations in professional modal designs.

## External Dependencies

### AI/ML Services
- **LangChain & LangGraph**: Core frameworks for agent orchestration, tool management, and ReAct agent implementation.
- **Groq API**: Primary LLM provider (Llama 3.3 70B Versatile model) for ultra-fast inference, natural language understanding, reasoning, and response synthesis. Configured via `GROQ_API_KEY`.

### Backend Framework
- **FastAPI**: REST API server providing automatic OpenAPI documentation, async request handling, static file serving, and Pydantic integration.
- **Uvicorn**: ASGI server for running the FastAPI application.

### Data Validation
- **Pydantic**: Used for request/response model validation, tool parameter type checking, and data serialization/deserialization.

### External APIs (Mocked)
All external APIs are currently mocked for development and testing. Production integration points include:
- Flight search APIs (e.g., Amadeus, Skyscanner)
- Hotel booking APIs (e.g., Booking.com, Expedia)
- Weather services (e.g., OpenWeatherMap, Weather.com)
- Activity/attraction databases (e.g., Google Places, TripAdvisor)

### Database
- **Current**: SQLite (development) with PostgreSQL support for production.
- **Models**: User, Session, Itinerary, Booking, and CalendarEvent to store user accounts, authentication tokens, trip plans, Stripe-integrated bookings, and calendar events.