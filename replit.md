# TripMind AI Agent

## Overview
TripMind is an autonomous AI-powered travel planning application that processes natural language queries to create complete travel itineraries. It utilizes LangGraph's ReAct agent framework to orchestrate specialized tools for tasks such as searching flights, finding hotels, checking weather, and generating day-by-day itineraries. The application features a FastAPI backend and a vanilla JavaScript frontend, offering a robust platform for intelligent travel planning.

The project includes a complete authentication system with sign-in/sign-up functionality, secure password hashing, and database-backed user sessions. It also boasts a full booking system with secure Stripe payment integration, allowing users to book and pay for trips directly within the platform. The user interface is designed with modern aesthetics, including animations, glassmorphic effects, and responsive multi-page layouts.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (Latest)
- **Improved Booking Flow Error Handling**: Enhanced error reporting and debugging for booking functionality
  - Replaced browser alerts with modern toast notifications for better UX
  - Added comprehensive console logging to track booking flow issues
  - Implemented proper HTTP status checking before parsing responses
  - Log trip details before sending to API for easier debugging
  - Check both data.message and data.error fields for complete error information
  - Better error messages help identify root cause of booking failures
- **Plan Trip Page Scrolling Enabled**: Fixed content accessibility on Plan Trip page
  - Changed overflow from hidden to auto on main container
  - Vertical scrolling now works properly to access all content
  - Prevents horizontal scrolling while allowing vertical navigation
  - Maintains fixed layout and split-screen design
  - Chat messages and graphics remain properly positioned
- **Expanded Accommodation Options**: Enhanced booking page with comprehensive hotel variety
  - Increased from 3 to 10 hotel options across all price ranges
  - Luxury tier: Grand resorts, beach resorts, boutique hotels ($125-$180/night)
  - Mid-range tier: Business hotels, riverside inns, garden suites, airport hotels ($65-$95/night)
  - Budget tier: Hostels, budget inns, backpacker lodges ($35-$55/night)
  - Diverse locations: Beachfront, city center, historic district, riverside, airport, suburban
  - Varied amenities tailored to each accommodation style
  - Realistic ratings (3.8-4.8 stars) and authentic review counts
  - All options dynamically scale with user budget via `/api/booking-options` endpoint
- **Automated Trip Booking Flow**: Streamlined booking experience with automatic trip saving and booking activation
  - When AI generates a trip plan, it automatically saves to My Trips (as an itinerary in the database)
  - Booking page opens automatically after trip is saved, no manual button clicking required
  - Toast notifications provide clear feedback on save success/failure
  - Graceful error handling ensures booking modal still opens even if auto-save fails
  - Works for both immediate trip detection and delayed origin completion flows
  - Trip details include destination, origin, dates, passengers, budget, and duration
  - All trips are saved to `/api/itineraries` with AI-generated flag for tracking
- **Enhanced Profile Dropdown Menu**: Redesigned with comprehensive account management options
  - Account Settings - View account information
  - My Trips - Access saved trip plans
  - My Bookings - View confirmed bookings
  - Calendar - Access travel calendar
  - Preferences - Manage travel preferences
  - Switch Account - Sign out and switch to different account
  - Sign Out - Logout with confirmation message
  - Profile displays user name, email, and auto-generated initials
  - All menu items fully functional with smooth animations
- **Cursor Hiding on Button Hover**: Implemented cursor: none on all interactive element hover states
  - All buttons hide cursor on hover (primary, secondary, inline, booking, view, delete, submit, social)
  - Navigation elements hide cursor (logo, links, booking button, theme toggle)
  - Profile menu elements hide cursor (trigger and dropdown items)
  - Plan Trip page chips and buttons hide cursor on hover
  - Calendar controls and events hide cursor (with !important overrides for FullCalendar)
  - Auth page buttons and mini-features hide cursor on hover
  - Interactive cards hide cursor (feature cards, trip cards)
  - Modal close buttons hide cursor in both light and dark modes
  - Consistent implementation across all CSS files
- **Comprehensive Dark Mode Fix**: Resolved dark theme issues across all pages and modals
  - Standardized all dark mode selectors to `[data-theme="dark"]` (removed mixed `body.dark-mode` usage)
  - Fixed Home page: Hero section, features, trip cards, form inputs, buttons, modals
  - Fixed Plan Trip page: Headers, welcome state, stats, testimonials, inputs, all text elements
  - Fixed My Trips page: Trip card content, titles, descriptions, images
  - Fixed Calendar page: Edit plan modal, form fields, labels, buttons
  - Fixed Book Now popup: Booking sections, summary cards, detail sections, form elements, footer notes
  - All text gradients, backgrounds, and borders now properly themed
  - Enhanced accessibility with proper contrast in dark mode
- **Navbar Cleanup**: Simplified navigation bar design
  - Removed emojis from Calendar and Book Now buttons for a cleaner, more professional look
  - Removed emojis from Start Planning and Set Preferences buttons on home page
  - Kept theme toggle emoji for visual clarity
- **Plan Trip Page Improvements**: Enhanced layout and user experience
  - Optimized travel illustration size to 86% width (max 520px) for better visual presence while preventing text overflow
  - Centered illustration with proper margins for better visual balance
  - Fixed graphics side positioning to prevent image shifting when selecting suggestions
  - Added "✨ Others" suggestion chip that focuses input without preset text
  - Users can now easily choose custom trips or use suggested templates
- **Header Spacing Optimization**: Refined navbar spacing for better visual balance
  - Reduced nav-container padding from 1rem to 0.75rem for a more compact header
  - Adjusted nav-links gap from 2rem to 1.5rem for tighter navigation spacing
  - Added proper alignment and gap properties for cleaner layout
  - All changes maintain responsive design across breakpoints
- **Profile Menu Functionality Enhancement**: Fixed and improved profile dropdown behavior
  - Implemented smooth opacity and transform animations for dropdown open/close
  - Fixed timeout race condition using class-based state management (.show class)
  - Profile dropdown now uses single source of truth for visibility state
  - Proper z-index layering ensures dropdown appears above all content
  - Smooth transitions with pointer-events management prevent click-through issues
  - Rapid open/close toggle sequences work correctly without flickering
- **Secure Toast Notification System**: Replaced all browser alerts with modern, animated toast notifications
  - Four types: success, error, warning, info with color-coded styling
  - XSS-safe implementation using textContent instead of innerHTML
  - Auto-dismiss after 5 seconds, clickable to close manually
  - Stacked vertical display with smooth slide-in animations
  - Full dark mode support with themed colors
  - Mobile responsive positioning
- **Mobile Responsive Improvements**: Comprehensive breakpoints for all screen sizes
  - Navbar scales appropriately at 1024px, 900px, 768px, and 640px breakpoints
  - Profile dropdown repositions for optimal mobile viewing
  - Horizontal scroll support for navigation links on small screens
  - Toast notifications adjust position and sizing on mobile devices
- **Profile Menu Added**: Complete profile dropdown in navbar's rightmost corner
  - User avatar with auto-generated initials
  - Displays user name and email
  - Quick access to Settings, My Trips, and Calendar
  - Logout functionality
  - Smooth animations and full dark mode support
  - Loads user data from localStorage automatically
- **My Trips Page Enhanced**: Redesigned trip cards with rich detail display
  - Location badges showing destination
  - Trip highlights section with 3 key features per trip
  - Duration information (e.g., "5 days")
  - Prominent pricing display
  - Staggered fade-in animations for visual appeal
- **Plan Trip Page Cleanup**: Improved readability and fixed layout issues
  - Removed colorful gradient overlays for cleaner interface
  - Fixed navbar overlap with proper 80px top padding
  - Clean, neutral backgrounds for better chat visibility

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