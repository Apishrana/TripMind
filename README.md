# TripMind AI Agent

## Overview
TripMind is an autonomous AI-powered travel planning application that processes natural language queries to create complete travel itineraries. It integrates an authentication system, secure Stripe payment processing, and a calendar system. The application features a FastAPI backend and a vanilla JavaScript frontend, offering a robust platform for intelligent travel planning with a modern UI/UX.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Application Architecture
The system uses a monolithic architecture with a FastAPI REST API backend handling travel query processing and serving static files. The frontend is built with vanilla JavaScript.

### AI Agent Architecture
The AI agent is built using LangGraph with a ReAct (Reasoning + Acting) pattern, powered by Meta's Llama 3.3 70B Instruct model via OpenRouter.ai. It orchestrates specialized tools to analyze queries, execute actions, and formulate multi-step travel plans, maintaining conversation context with `ChatMessageHistory`.

### Tool System
A decorator-based tool registry with Pydantic validation defines modular tools for:
- Flight search
- Accommodation discovery
- Weather data
- Local attractions
- Cost estimation
- User preferences persistence
- Daily schedule generation

### State Management
Conversation state is managed ephemerally in-memory using `ChatMessageHistory`. User preferences are stored in a global in-memory dictionary.

### UI/UX Decisions
The application features a multi-page design with animations, gradients, glassmorphism effects, SVG graphics, and comprehensive dark mode support. Key design elements include:
- **Authentication**: Animated welcome page, glassmorphic feature cards, split-screen sign-in/sign-up.
- **Plan Trip Page**: Immersive full-page split layout with animated travel illustration, modern chat interface, quick action chips, live stats, and testimonials.
- **My Trips Page**: Dynamic trip cards with detailed metadata, location badges, features, and prominent pricing, with staggered fade-in animations.

### Feature Specifications
- **Authentication System**: Secure sign-in/sign-up with bcrypt, database-backed sessions, dynamic navigation, and mobile responsiveness.
- **Booking System**: Secure Stripe payment integration, email validation, loading states, and enhanced error handling.
- **Smart Chat-to-Booking Flow**: AI detects trip details, handles missing information, and offers "Book This Trip" or "Quick Book" options with auto-population of booking pages.
- **Interactive Feature Explanations**: Clickable feature buttons provide detailed explanations in modal designs.

## External Dependencies

### AI/ML Services
- **LangChain & LangGraph**: Core frameworks for agent orchestration and ReAct agent implementation.
- **OpenRouter.ai**: Primary LLM provider, using Meta's Llama 3.3 70B Instruct model via `OPENROUTER_API_KEY`.

### Backend Framework
- **FastAPI**: REST API server for async request handling, static file serving, and Pydantic integration.
- **Uvicorn**: ASGI server for running FastAPI.

### Data Validation
- **Pydantic**: Used for request/response model validation and tool parameter type checking.

### External APIs (Mocked)
Currently mocked, with production integration points for:
- Flight search APIs (e.g., Amadeus, Skyscanner)
- Hotel booking APIs (e.g., Booking.com, Expedia)
- Weather services (e.g., OpenWeatherMap, Weather.com)
- Activity/attraction databases (e.g., Google Places, TripAdvisor)

### Database
- **Current**: SQLite (development).
- **Production Support**: PostgreSQL.
- **Models**: User, Session, Itinerary, Booking, and CalendarEvent.