import os
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from agent.travel_agent import TravelPlannerAgent
import uvicorn

# Initialize FastAPI app
app = FastAPI(title="Travel Planner AI Agent")

# Initialize the AI agent
agent = TravelPlannerAgent()

# Request/Response models
class TravelQuery(BaseModel):
    query: str

class TravelResponse(BaseModel):
    status: str
    response: str
    request: str = ""
    error: str = ""

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
    try:
        result = agent.plan_trip(query.query)
        
        return TravelResponse(
            status=result.get("status", "success"),
            response=result.get("response", ""),
            request=result.get("request", query.query),
            error=result.get("error", "")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reset")
async def reset_memory():
    """Reset the agent's conversation memory."""
    try:
        agent.reset_memory()
        return {"status": "success", "message": "Memory cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
async def get_history():
    """Get conversation history."""
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

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "Travel Planner AI Agent"}

if __name__ == "__main__":
    # Run the server on 0.0.0.0:5000 for Replit
    uvicorn.run(app, host="0.0.0.0", port=5000)
