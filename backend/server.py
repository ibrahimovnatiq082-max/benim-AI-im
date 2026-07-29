from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    api_key: str
    provider: Literal["openai", "anthropic", "gemini", "qwen", "mistral"]
    model: str
    system_message: Optional[str] = "You are an expert web developer. Generate complete, production-ready HTML, CSS, and JavaScript code based on user requirements. Always provide full, working code that can be directly used in a browser. Include all necessary styles and functionality."

# Routes
@api_router.get("/")
async def root():
    return {"message": "AI Website Builder API"}

@api_router.post("/chat")
async def chat_stream(request: ChatRequest):
    """Stream AI responses based on user's API key and selected provider/model"""
    try:
        # Create a unique session ID for this conversation
        session_id = str(uuid.uuid4())
        
        # Initialize LlmChat with user's API key
        chat = LlmChat(
            api_key=request.api_key,
            session_id=session_id,
            system_message=request.system_message
        )
        
        # Configure the model based on provider
        chat.with_model(request.provider, request.model)
        
        # Get the last user message
        last_message = request.messages[-1]
        user_message = UserMessage(text=last_message.content)
        
        # Stream response
        async def event_generator():
            try:
                async for event in chat.stream_message(user_message):
                    if isinstance(event, TextDelta):
                        # Send each token as SSE
                        yield f"data: {json.dumps({'content': event.content})}\n\n"
                    elif isinstance(event, StreamDone):
                        yield f"data: {json.dumps({'done': True})}\n\n"
                        break
            except Exception as e:
                error_msg = str(e)
                yield f"data: {json.dumps({'error': error_msg})}\n\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive"
            }
        )
    except Exception as e:
        logging.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
