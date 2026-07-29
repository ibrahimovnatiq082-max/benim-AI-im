# AI Website Builder

A modern AI-powered website builder that lets users generate complete websites using their own API keys. Similar to Bolt.new and other AI coding tools.

## Features

### ✨ AI-Powered Generation
- Generate complete websites from text prompts
- Support for multiple AI providers:
  - OpenAI (GPT-5.4, GPT-5.4 Mini, GPT-5.2)
  - Anthropic Claude (Sonnet 4.6, Opus 4.7, Opus 4.8)
  - Google Gemini (3.1 Pro, 3.5 Flash, 3 Flash)
- Real-time streaming responses
- Automatic code extraction (HTML, CSS, JavaScript)

### 🎨 Live Preview
- Real-time website preview in iframe
- Device preview modes:
  - Desktop (full width)
  - Tablet (768px)
  - Mobile (375px)
- Instant updates when code is generated

### 💻 Code Editor
- View generated code in tabs:
  - Preview (live website)
  - HTML
  - CSS
  - JavaScript
- Syntax highlighting with Prism.js
- Copy code to clipboard
- Clean, IDE-like interface

### 📦 Export Options
- Download as ZIP file (all files together)
- Download individual files:
  - index.html
  - styles.css
  - script.js

### 🔐 Secure API Key Management
- Users provide their own API keys
- Keys stored ONLY in browser localStorage
- Never stored on server
- Keys passed per-request to backend proxy
- Can update or remove keys anytime

## Tech Stack

### Backend
- FastAPI (Python)
- emergentintegrations library for LLM integration
- Server-side event streaming (SSE)
- MongoDB for potential future data storage

### Frontend
- React 19
- Tailwind CSS
- Shadcn UI components
- React Router for navigation
- React Markdown for chat rendering
- Prism.js for code highlighting
- JSZip for ZIP generation

## Design

- **Theme**: Dark (zinc-950 base)
- **Fonts**: 
  - IBM Plex Sans (headings)
  - Inter (body text)
  - JetBrains Mono (code)
- **Style**: Minimal, flat, IDE-like
- **Layout**: Split-screen (preview left, chat right)
- **No gradients**: Clean, professional look

## Usage

1. **Get Started**: Click "Get Started" from home page
2. **Add API Key**: Click settings icon, enter your API key for chosen provider
3. **Select Model**: Choose provider (OpenAI/Anthropic/Gemini) and model
4. **Chat**: Type website requirements in chat (e.g., "Create a landing page for a SaaS product")
5. **Preview**: See generated website in real-time
6. **Edit**: Ask AI to modify design, colors, layout, etc.
7. **Export**: Download as ZIP or individual files

## Example Prompts

- "Create a modern portfolio website for a photographer"
- "Build a landing page for a SaaS product with pricing section"
- "Make a simple blog layout with sidebar"
- "Create a restaurant menu page with images"
- "Build a contact form page with validation"

## API Endpoints

### GET /api/
- Health check endpoint
- Returns: `{"message": "AI Website Builder API"}`

### POST /api/chat
- Stream AI responses
- Request body:
  ```json
  {
    "messages": [{"role": "user", "content": "..."}],
    "api_key": "sk-...",
    "provider": "openai",
    "model": "gpt-5.4"
  }
  ```
- Response: Server-Sent Events (SSE) stream

## Environment Variables

### Backend (.env)
- `MONGO_URL`: MongoDB connection string
- `DB_NAME`: Database name
- `CORS_ORIGINS`: Allowed origins

### Frontend (.env)
- `REACT_APP_BACKEND_URL`: Backend API URL

## Security

- API keys never stored on server
- Keys only in browser localStorage
- Backend acts as proxy (receives key per-request)
- No key logging or persistence
- CORS configured for security

## Performance

- Fast loading times
- Streaming responses (word-by-word)
- Hot reload enabled for development
- Minimal bundle size
- Optimized preview rendering

## Future Enhancements

- Save projects to cloud
- Project history and versioning
- Collaborative editing
- More AI providers (Qwen, Mistral)
- Template library
- Component library integration
- Direct deployment options
