from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
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
from agents import AgentRequest, run_multi_agent_pipeline, AGENTS

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
    provider: Literal["openai", "anthropic", "gemini", "groq"]
    model: str
    system_message: Optional[str] = """You are an elite full-stack web developer and creative code architect capable of building ANY web project - from simple landing pages to complex 3D games and multi-section portfolios.

🌐 LANGUAGE DETECTION (CRITICAL):
- ALWAYS detect the language the user is writing in and respond in THAT SAME LANGUAGE
- If user writes in Turkish → respond in Turkish
- If user writes in English → respond in English  
- If user writes in Azerbaijani → respond in Azerbaijani
- If user writes in Spanish → respond in Spanish
- If user writes in any other language → respond in that language
- Never mix languages, never assume the language
- Your explanations, comments, and any text OUTSIDE the code should be in the user's language

🎯 CAPABILITIES - You can build:
- 3D games with Three.js (from CDN: https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js)
- 2D games with Canvas API (arcade games, puzzles, platformers, snake, tetris, etc.)
- Multi-section portfolios (10+ sections: hero, about, skills, projects, timeline, testimonials, blog, contact)
- Landing pages (SaaS, product, marketing)
- E-commerce sites with cart functionality
- Dashboards with charts (using Chart.js from CDN)
- Interactive web apps
- Animation-heavy sites (using GSAP from CDN if needed)
- Blog layouts, magazines, news sites
- Restaurant/cafe sites with menus
- Real estate listings
- Educational platforms

📦 EXTERNAL LIBRARIES YOU CAN USE (via CDN):
- Three.js for 3D: https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js
- GSAP for animations: https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js
- Chart.js for charts: https://cdn.jsdelivr.net/npm/chart.js
- Anime.js: https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js
- Font Awesome: https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css
- Google Fonts: <link href="https://fonts.googleapis.com/css2?family=..." rel="stylesheet">

⚡ CRITICAL RULES:
1. ALWAYS provide complete, working, ERROR-FREE code
2. Generate SEPARATE code blocks: ```html, ```css, ```javascript
3. HTML should NOT include <style> or <script> tags - those go in CSS/JS blocks
4. HTML must be inside <body> only (no <html>, <head>, <body> tags - just the body content)
5. External library <script src=""> and <link href=""> tags DO go in HTML (they'll be placed in head)
6. Test your code mentally - no undefined variables, no missing brackets
7. For 3D/games: include game loop, controls, scoring, restart mechanism
8. For portfolios: include 6-10+ sections with smooth scrolling, animations
9. When user uploads an image/video URL, USE THAT EXACT URL in the code
10. Support responsive design (mobile-first)

📐 FORMAT (STRICT):

[Brief explanation in USER'S LANGUAGE - 2-3 sentences]

```html
[HTML body content only - no <html>, <head>, <body> wrappers, but include <script src="cdn..."></script> and <link> tags for external libs at the top]
```

```css
[Complete CSS - modern, responsive, beautiful]
```

```javascript
[Complete, working JavaScript]
```

[Optional: 1-2 sentences about what you built, in user's language]

🎨 QUALITY STANDARDS:
- Zero errors, zero console warnings
- Mobile-responsive (works 320px to 4K)
- Beautiful modern design with proper spacing, typography
- Smooth animations (60fps)
- Accessible (semantic HTML, ARIA labels)
- Performance optimized
- Cross-browser compatible

💡 FOR LARGE PROJECTS:
- Break code into logical sections with comments
- Use CSS variables for theming
- Use JavaScript modules/classes for organization
- Include proper error handling
- Add loading states for async operations

Remember: You are building PRODUCTION-READY code that works PERFECTLY the first time."""

# Routes
@api_router.get("/")
async def root():
    return {"message": "AI Website Builder API"}


async def handle_groq_chat(request):
    """Handle Groq API via OpenAI-compatible endpoint with streaming"""
    from openai import AsyncOpenAI
    
    client = AsyncOpenAI(
        api_key=request.api_key,
        base_url="https://api.groq.com/openai/v1"
    )
    
    # Build messages including system prompt
    messages = [{"role": "system", "content": request.system_message}]
    # Include last 10 messages for context
    for msg in request.messages[-10:]:
        messages.append({"role": msg.role, "content": msg.content})
    
    async def event_generator():
        try:
            stream = await client.chat.completions.create(
                model=request.model,
                messages=messages,
                stream=True,
                temperature=0.7,
                max_tokens=8000,
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    yield f"data: {json.dumps({'content': content})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
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


@api_router.post("/chat")
async def chat_stream(request: ChatRequest):
    """Stream AI responses based on user's API key and selected provider/model"""
    try:
        # Handle Groq via direct OpenAI-compatible API
        if request.provider == "groq":
            return await handle_groq_chat(request)
        
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
        
        # Build conversation context from history
        # Include last 10 messages for context (excluding the current one)
        history_messages = request.messages[:-1][-10:] if len(request.messages) > 1 else []
        
        # Build the current message with context
        last_message = request.messages[-1]
        context_str = ""
        if history_messages:
            context_str = "Previous conversation:\n"
            for msg in history_messages:
                role_label = "User" if msg.role == "user" else "Assistant"
                # Truncate long messages for context
                content = msg.content[:2000] + "..." if len(msg.content) > 2000 else msg.content
                context_str += f"{role_label}: {content}\n\n"
            context_str += f"Current request: {last_message.content}"
            user_message = UserMessage(text=context_str)
        else:
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


class ValidateCodeRequest(BaseModel):
    html: str = ""
    css: str = ""
    js: str = ""


@api_router.post("/validate")
async def validate_code(request: ValidateCodeRequest):
    """Validate generated code for common errors"""
    errors = []
    warnings = []
    
    # Basic HTML validation
    if request.html:
        html = request.html.strip()
        if html and not html.lower().startswith(('<!doctype', '<html', '<')):
            warnings.append("HTML: Missing DOCTYPE declaration")
        # Check for unclosed tags (basic)
        open_tags = html.count('<div')
        close_tags = html.count('</div>')
        if open_tags != close_tags:
            warnings.append(f"HTML: Possible unclosed div tags ({open_tags} open, {close_tags} close)")
    
    # Basic CSS validation
    if request.css:
        # Check for unclosed braces
        open_braces = request.css.count('{')
        close_braces = request.css.count('}')
        if open_braces != close_braces:
            errors.append(f"CSS: Mismatched braces ({open_braces} open, {close_braces} close)")
    
    # Basic JS validation
    if request.js:
        # Check for unclosed braces
        open_braces = request.js.count('{')
        close_braces = request.js.count('}')
        if open_braces != close_braces:
            errors.append(f"JavaScript: Mismatched braces ({open_braces} open, {close_braces} close)")
        # Check for unclosed parentheses
        open_parens = request.js.count('(')
        close_parens = request.js.count(')')
        if open_parens != close_parens:
            warnings.append(f"JavaScript: Mismatched parentheses ({open_parens} open, {close_parens} close)")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "checked": {
            "html": bool(request.html),
            "css": bool(request.css),
            "js": bool(request.js)
        }
    }


class PublishRequest(BaseModel):
    html: str = ""
    css: str = ""
    js: str = ""
    title: Optional[str] = "My Website"


@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload image or video file, returns URL"""
    try:
        # Read file content
        content = await file.read()
        
        # Validate file type
        allowed_types = {
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
        }
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail=f"File type not allowed: {file.content_type}")
        
        # Size limit: 10MB
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Max 10MB allowed.")
        
        # Generate unique ID
        file_id = str(uuid.uuid4())
        file_ext = file.filename.split('.')[-1].lower() if '.' in file.filename else 'bin'
        
        # Store in MongoDB (base64 encoded)
        import base64
        b64_content = base64.b64encode(content).decode('utf-8')
        
        await db.uploaded_files.insert_one({
            "file_id": file_id,
            "filename": file.filename,
            "content_type": file.content_type,
            "data": b64_content,
            "size": len(content),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "success": True,
            "file_id": file_id,
            "url": f"/api/file/{file_id}",
            "filename": file.filename,
            "content_type": file.content_type,
            "size": len(content)
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/file/{file_id}")
async def get_file(file_id: str):
    """Serve uploaded file"""
    from fastapi.responses import Response
    import base64
    
    file_doc = await db.uploaded_files.find_one({"file_id": file_id}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    content = base64.b64decode(file_doc["data"])
    return Response(
        content=content,
        media_type=file_doc["content_type"],
        headers={"Cache-Control": "public, max-age=31536000"}
    )


@api_router.post("/publish")
async def publish_site(request: PublishRequest):
    """Publish site and return a shareable URL"""
    try:
        site_id = str(uuid.uuid4())[:12]
        
        # Combine HTML, CSS, JS into a single file
        full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{request.title}</title>
    <style>
{request.css}
    </style>
</head>
<body>
{request.html}
<script>
{request.js}
</script>
</body>
</html>"""
        
        # Store in MongoDB
        await db.published_sites.insert_one({
            "site_id": site_id,
            "title": request.title,
            "html": full_html,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "success": True,
            "site_id": site_id,
            "url": f"/api/site/{site_id}",
            "message": "Site published successfully!"
        }
    except Exception as e:
        logging.error(f"Publish error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/site/{site_id}")
async def get_published_site(site_id: str):
    """Get published site HTML"""
    from fastapi.responses import HTMLResponse
    site = await db.published_sites.find_one({"site_id": site_id}, {"_id": 0})
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return HTMLResponse(content=site["html"])

@api_router.post("/agents/execute")
async def execute_multi_agent(request: AgentRequest):
    """Execute the multi-agent pipeline for website generation"""
    async def event_generator():
        try:
            async for event in run_multi_agent_pipeline(
                user_prompt=request.user_prompt,
                api_key=request.api_key,
                provider=request.provider,
                model=request.model,
            ):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'pipeline_error', 'error': str(e)[:200]})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@api_router.get("/agents/list")
async def list_agents():
    """List all available agents"""
    return {
        "agents": [
            {
                "id": agent_id,
                "name": AGENTS[agent_id]["name"],
                "icon": AGENTS[agent_id]["icon"],
                "color": AGENTS[agent_id]["color"],
                "estimated_seconds": AGENTS[agent_id]["estimated_seconds"],
            }
            for agent_id in AGENTS
        ]
    }


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
