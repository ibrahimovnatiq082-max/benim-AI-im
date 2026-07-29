"""
Multi-Agent AI Orchestration System for Plater AI
11 specialized agents working together on projects
"""
from typing import List, Optional, Literal, AsyncGenerator, Dict, Any
from pydantic import BaseModel
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
import asyncio
import json
import uuid
import time


# Agent definitions with specialized system prompts
AGENTS = {
    "planner": {
        "id": "planner",
        "name": "Planner Agent",
        "icon": "ClipboardList",
        "color": "blue",
        "estimated_seconds": 15,
        "system_prompt": """You are the Planner Agent for Plater AI. Your role is to:
1. Understand the user's project request deeply
2. Create a detailed project plan
3. Divide the project into concrete tasks
4. Identify what type of project this is (portfolio, game, landing page, dashboard, etc.)
5. List required sections/pages
6. Identify what technologies are needed

Respond in USER'S LANGUAGE (detect from their message).

Output STRICTLY as JSON:
{
  "project_type": "string (portfolio/landing_page/game/dashboard/blog/ecommerce/etc)",
  "project_name": "string",
  "description": "string (2-3 sentences)",
  "sections": ["array of sections/pages"],
  "features": ["array of key features"],
  "tech_needs": {
    "needs_backend": boolean,
    "needs_database": boolean,
    "needs_animations": boolean,
    "needs_3d": boolean,
    "needs_auth": boolean
  },
  "complexity": "simple|medium|complex",
  "estimated_time_minutes": number,
  "tasks": ["array of specific development tasks"]
}"""
    },
    "designer": {
        "id": "designer",
        "name": "UI/UX Designer Agent",
        "icon": "Palette",
        "color": "purple",
        "estimated_seconds": 12,
        "system_prompt": """You are the UI/UX Designer Agent for Plater AI. Based on the project plan, create design specifications.

Focus on:
- Color palette (primary, secondary, accent, background, text)
- Typography (font families, sizes)
- Spacing system
- Component styles
- Layout structure
- Responsive breakpoints

Output STRICTLY as JSON:
{
  "theme": "modern|minimal|bold|elegant|playful|dark|light",
  "colors": {
    "primary": "hex",
    "secondary": "hex",
    "accent": "hex",
    "background": "hex",
    "surface": "hex",
    "text_primary": "hex",
    "text_secondary": "hex"
  },
  "typography": {
    "heading_font": "font-family",
    "body_font": "font-family",
    "code_font": "font-family"
  },
  "spacing": {
    "unit": "8px",
    "container_max_width": "1200px"
  },
  "components": ["list of key components needed"],
  "layout_style": "description",
  "responsive_breakpoints": {"mobile": "640px", "tablet": "768px", "desktop": "1024px"},
  "design_notes": "string"
}"""
    },
    "database": {
        "id": "database",
        "name": "Database Agent",
        "icon": "Database",
        "color": "orange",
        "estimated_seconds": 10,
        "system_prompt": """You are the Database Agent. Design database schema if needed.

If the project doesn't need a database, return:
{"needed": false, "reason": "static site"}

If needed, output:
{
  "needed": true,
  "database_type": "MongoDB|PostgreSQL|SQLite",
  "collections_or_tables": [
    {
      "name": "string",
      "fields": [{"name": "string", "type": "string", "required": boolean}],
      "relationships": ["description"]
    }
  ],
  "indexes": ["list"],
  "notes": "string"
}"""
    },
    "seo": {
        "id": "seo",
        "name": "SEO Agent",
        "icon": "Search",
        "color": "green",
        "estimated_seconds": 8,
        "system_prompt": """You are the SEO Agent. Generate SEO optimization for the project.

Output STRICTLY as JSON:
{
  "title": "string (60 chars max)",
  "description": "string (155 chars max)",
  "keywords": ["array"],
  "og_tags": {
    "og:title": "string",
    "og:description": "string",
    "og:type": "website",
    "og:image": "https://placeholder.com/1200x630"
  },
  "twitter_tags": {
    "twitter:card": "summary_large_image",
    "twitter:title": "string",
    "twitter:description": "string"
  },
  "sitemap_urls": ["array of URLs"],
  "robots_txt": "User-agent: *\\nAllow: /",
  "structured_data": {"@context": "https://schema.org", "@type": "WebSite"}
}"""
    },
    "accessibility": {
        "id": "accessibility",
        "name": "Accessibility Agent",
        "icon": "Accessibility",
        "color": "cyan",
        "estimated_seconds": 10,
        "system_prompt": """You are the Accessibility Agent. Ensure WCAG 2.1 AA compliance.

Output STRICTLY as JSON:
{
  "wcag_level": "AA",
  "aria_requirements": ["list of ARIA labels/roles needed"],
  "keyboard_navigation": ["requirements"],
  "color_contrast_checks": [{"element": "string", "recommendation": "string"}],
  "semantic_html_notes": ["notes"],
  "focus_management": "requirements",
  "screen_reader_support": ["features to add"],
  "recommendations": ["prioritized list"]
}"""
    },
    "security": {
        "id": "security",
        "name": "Security Agent",
        "icon": "Shield",
        "color": "red",
        "estimated_seconds": 10,
        "system_prompt": """You are the Security Agent. Identify security requirements and prevent vulnerabilities.

Output STRICTLY as JSON:
{
  "risk_level": "low|medium|high",
  "csp_headers": ["Content-Security-Policy directives"],
  "xss_protections": ["measures"],
  "input_sanitization": ["fields to sanitize"],
  "https_required": boolean,
  "auth_requirements": ["if any"],
  "vulnerabilities_to_avoid": ["list"],
  "safe_dependencies": ["allowed CDNs"],
  "recommendations": ["prioritized security list"]
}"""
    },
    "performance": {
        "id": "performance",
        "name": "Performance Agent",
        "icon": "Zap",
        "color": "yellow",
        "estimated_seconds": 10,
        "system_prompt": """You are the Performance Agent. Optimize for speed and efficiency.

Output STRICTLY as JSON:
{
  "target_metrics": {
    "lcp": "< 2.5s",
    "fid": "< 100ms",
    "cls": "< 0.1"
  },
  "optimizations": {
    "images": ["lazy-loading", "webp format", "responsive images"],
    "css": ["minification", "critical CSS"],
    "javascript": ["defer non-critical", "code splitting"],
    "fonts": ["preload", "font-display: swap"]
  },
  "caching_strategy": "string",
  "cdn_usage": ["recommendations"],
  "bundle_size_target_kb": number,
  "recommendations": ["prioritized list"]
}"""
    },
    "frontend": {
        "id": "frontend",
        "name": "Frontend Developer Agent",
        "icon": "Code2",
        "color": "indigo",
        "estimated_seconds": 40,
        "system_prompt": """You are the Frontend Developer Agent. Generate the complete website code based on ALL specifications from other agents (design, SEO, accessibility, security, performance).

CRITICAL RULES:
1. Generate SEPARATE code blocks: ```html, ```css, ```javascript
2. HTML: body content only (no <html>, <head>, <body> tags) - but include <script src=""> for CDN libs
3. Apply design colors, fonts, spacing from designer specs
4. Include SEO meta tags in HTML (as data-seo comments if needed)
5. Add ARIA labels from accessibility specs
6. Follow security requirements (safe CSP-compliant code)
7. Apply performance optimizations (lazy loading, defer, etc.)
8. Support 3D via Three.js CDN, animations via CSS/GSAP, games via Canvas
9. Fully responsive, modern, beautiful, error-free
10. Respond in user's language for any comments/text

Use ONLY inline responses like:
```html
[code]
```
```css
[code]
```
```javascript
[code]
```

Brief explanation in user's language (2 sentences max)."""
    },
    "backend": {
        "id": "backend",
        "name": "Backend Developer Agent",
        "icon": "Server",
        "color": "pink",
        "estimated_seconds": 15,
        "system_prompt": """You are the Backend Developer Agent. Generate backend code if needed.

If backend is not needed (static site), output:
{"needed": false, "reason": "static site - no backend required"}

If needed, output:
{
  "needed": true,
  "framework": "FastAPI|Express|Next.js API",
  "endpoints": [
    {"method": "GET|POST|PUT|DELETE", "path": "/api/...", "description": "string", "example_code": "string"}
  ],
  "authentication": "JWT|OAuth|None",
  "middleware": ["list"],
  "example_server_code": "brief example",
  "notes": "string"
}"""
    },
    "qa": {
        "id": "qa",
        "name": "QA Agent",
        "icon": "TestTube",
        "color": "emerald",
        "estimated_seconds": 12,
        "system_prompt": """You are the QA Agent. Test the generated code and find bugs.

Given the HTML, CSS, JS code, analyze it and output:
{
  "status": "passed|failed|warnings",
  "tests_run": number,
  "tests_passed": number,
  "bugs_found": [
    {"severity": "critical|high|medium|low", "type": "string", "description": "string", "fix_suggestion": "string"}
  ],
  "code_quality_score": number (0-100),
  "checklist": {
    "html_valid": boolean,
    "css_valid": boolean,
    "js_no_errors": boolean,
    "responsive": boolean,
    "cross_browser": boolean,
    "accessibility_ok": boolean
  },
  "recommendations": ["list"]
}"""
    },
    "deployment": {
        "id": "deployment",
        "name": "Deployment Agent",
        "icon": "Rocket",
        "color": "violet",
        "estimated_seconds": 8,
        "system_prompt": """You are the Deployment Agent. Prepare the project for deployment.

Output STRICTLY as JSON:
{
  "deployment_ready": boolean,
  "recommended_hosts": ["Vercel", "Netlify", "GitHub Pages", "Cloudflare Pages"],
  "build_steps": ["list"],
  "environment_variables": ["list if any"],
  "custom_domain_instructions": "string",
  "production_checklist": [
    {"item": "string", "status": "done|pending"}
  ],
  "files_to_include": ["index.html", "styles.css", "script.js", "sitemap.xml", "robots.txt"],
  "estimated_deploy_time": "1-2 minutes",
  "next_steps": ["ordered list for user"]
}"""
    }
}


# Agent execution phases - defines parallel vs sequential
EXECUTION_PHASES = [
    # Phase 1: Planning (must be first)
    {"phase": 1, "agents": ["planner"], "parallel": False},
    # Phase 2: Specifications (can run in parallel after plan)
    {"phase": 2, "agents": ["designer", "database", "seo"], "parallel": True},
    # Phase 3: Security & Accessibility & Performance specs (parallel)
    {"phase": 3, "agents": ["accessibility", "security", "performance"], "parallel": True},
    # Phase 4: Actual code generation (sequential, needs all specs)
    {"phase": 4, "agents": ["frontend"], "parallel": False},
    # Phase 5: Backend (can be parallel with QA if needed, but simpler sequential)
    {"phase": 5, "agents": ["backend"], "parallel": False},
    # Phase 6: QA testing
    {"phase": 6, "agents": ["qa"], "parallel": False},
    # Phase 7: Deployment prep
    {"phase": 7, "agents": ["deployment"], "parallel": False},
]


class AgentRequest(BaseModel):
    user_prompt: str
    api_key: str
    provider: Literal["openai", "anthropic", "gemini"]
    model: str


def build_agent_context(agent_id: str, user_prompt: str, previous_results: Dict[str, Any]) -> str:
    """Build the context for an agent based on previous agent results"""
    context = f"USER REQUEST: {user_prompt}\n\n"
    
    if previous_results.get("planner"):
        context += f"PROJECT PLAN:\n{json.dumps(previous_results['planner'], ensure_ascii=False, indent=2)}\n\n"
    
    if agent_id == "frontend":
        # Frontend needs everything
        for key in ["designer", "seo", "accessibility", "security", "performance"]:
            if previous_results.get(key):
                context += f"{key.upper()} SPECS:\n{json.dumps(previous_results[key], ensure_ascii=False, indent=2)}\n\n"
    elif agent_id == "backend":
        if previous_results.get("database"):
            context += f"DATABASE SCHEMA:\n{json.dumps(previous_results['database'], ensure_ascii=False, indent=2)}\n\n"
        if previous_results.get("planner"):
            tech = previous_results['planner'].get('tech_needs', {})
            if not tech.get('needs_backend'):
                context += "NOTE: According to plan, backend is NOT needed.\n\n"
    elif agent_id == "qa":
        if previous_results.get("frontend"):
            fe = previous_results['frontend']
            code_summary = f"HTML length: {len(fe.get('html', ''))}, CSS length: {len(fe.get('css', ''))}, JS length: {len(fe.get('js', ''))}"
            context += f"FRONTEND CODE:\n{code_summary}\nHTML sample: {fe.get('html', '')[:500]}\nCSS sample: {fe.get('css', '')[:500]}\nJS sample: {fe.get('js', '')[:500]}\n\n"
    elif agent_id == "deployment":
        if previous_results.get("frontend"):
            context += "Frontend code has been generated.\n"
        if previous_results.get("qa"):
            context += f"QA RESULT:\n{json.dumps(previous_results.get('qa', {}), ensure_ascii=False, indent=2)[:1000]}\n\n"
    
    context += f"\n\nGenerate output for {agent_id.upper()} AGENT strictly following the format specified in your system prompt."
    return context


def parse_agent_output(agent_id: str, raw_output: str) -> Dict[str, Any]:
    """Parse agent output - JSON for most, code blocks for frontend"""
    if agent_id == "frontend":
        # Extract code blocks
        import re
        html_match = re.search(r'```html\s*\n([\s\S]*?)```', raw_output)
        css_match = re.search(r'```css\s*\n([\s\S]*?)```', raw_output)
        js_match = re.search(r'```(?:javascript|js)\s*\n([\s\S]*?)```', raw_output)
        
        # Extract explanation (text outside code blocks)
        explanation = re.sub(r'```[\w]*\s*\n[\s\S]*?```', '', raw_output).strip()
        
        return {
            "html": html_match.group(1).strip() if html_match else "",
            "css": css_match.group(1).strip() if css_match else "",
            "js": js_match.group(1).strip() if js_match else "",
            "explanation": explanation[:500]
        }
    else:
        # Try to parse as JSON
        try:
            # Extract JSON from response (may be wrapped in ```json ... ```)
            import re
            json_match = re.search(r'```(?:json)?\s*\n?([\s\S]*?)```', raw_output)
            if json_match:
                json_str = json_match.group(1).strip()
            else:
                # Try to find JSON object
                json_match = re.search(r'\{[\s\S]*\}', raw_output)
                json_str = json_match.group(0) if json_match else raw_output
            
            return json.loads(json_str)
        except Exception as e:
            return {"raw_output": raw_output[:1000], "parse_error": str(e)}


async def run_single_agent(
    agent_id: str,
    user_prompt: str,
    previous_results: Dict[str, Any],
    api_key: str,
    provider: str,
    model: str
) -> AsyncGenerator[Dict[str, Any], None]:
    """Run a single agent and yield progress events"""
    agent_config = AGENTS[agent_id]
    start_time = time.time()
    
    # Emit start event
    yield {
        "type": "agent_start",
        "agent_id": agent_id,
        "agent_name": agent_config["name"],
        "estimated_seconds": agent_config["estimated_seconds"],
    }
    
    try:
        # Build context
        context = build_agent_context(agent_id, user_prompt, previous_results)
        
        # Initialize LLM chat
        session_id = f"{agent_id}-{uuid.uuid4()}"
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=agent_config["system_prompt"]
        )
        chat.with_model(provider, model)
        
        # Send message and stream (buffered - we don't need token-by-token for agents)
        user_message = UserMessage(text=context)
        raw_output = ""
        token_count = 0
        
        async for event in chat.stream_message(user_message):
            if isinstance(event, TextDelta):
                raw_output += event.content
                token_count += 1
                # Emit progress every N tokens
                if token_count % 20 == 0:
                    elapsed = time.time() - start_time
                    progress = min(90, int((elapsed / agent_config["estimated_seconds"]) * 100))
                    yield {
                        "type": "agent_progress",
                        "agent_id": agent_id,
                        "progress": progress,
                        "elapsed_seconds": round(elapsed, 1),
                    }
            elif isinstance(event, StreamDone):
                break
        
        # Parse output
        parsed = parse_agent_output(agent_id, raw_output)
        elapsed = time.time() - start_time
        
        yield {
            "type": "agent_complete",
            "agent_id": agent_id,
            "agent_name": agent_config["name"],
            "result": parsed,
            "elapsed_seconds": round(elapsed, 1),
            "progress": 100,
        }
    except Exception as e:
        yield {
            "type": "agent_error",
            "agent_id": agent_id,
            "agent_name": agent_config["name"],
            "error": str(e)[:200],
            "elapsed_seconds": round(time.time() - start_time, 1),
        }


async def run_multi_agent_pipeline(
    user_prompt: str,
    api_key: str,
    provider: str,
    model: str
) -> AsyncGenerator[Dict[str, Any], None]:
    """Run the full multi-agent pipeline"""
    previous_results: Dict[str, Any] = {}
    
    # Send initial event with all agents
    yield {
        "type": "pipeline_start",
        "agents": [
            {
                "id": agent_id,
                "name": AGENTS[agent_id]["name"],
                "icon": AGENTS[agent_id]["icon"],
                "color": AGENTS[agent_id]["color"],
                "status": "pending"
            }
            for phase in EXECUTION_PHASES
            for agent_id in phase["agents"]
        ],
        "phases": EXECUTION_PHASES,
    }
    
    for phase_config in EXECUTION_PHASES:
        phase_num = phase_config["phase"]
        agent_ids = phase_config["agents"]
        is_parallel = phase_config["parallel"]
        
        yield {
            "type": "phase_start",
            "phase": phase_num,
            "agents": agent_ids,
            "parallel": is_parallel,
        }
        
        if is_parallel and len(agent_ids) > 1:
            # Run agents in parallel using asyncio
            async def collect_agent_events(agent_id: str):
                events = []
                async for event in run_single_agent(agent_id, user_prompt, previous_results, api_key, provider, model):
                    events.append(event)
                return agent_id, events
            
            # Create queues to interleave events from parallel agents
            queues = {aid: asyncio.Queue() for aid in agent_ids}
            
            async def agent_worker(agent_id):
                try:
                    async for event in run_single_agent(agent_id, user_prompt, previous_results, api_key, provider, model):
                        await queues[agent_id].put(event)
                except Exception as e:
                    await queues[agent_id].put({"type": "agent_error", "agent_id": agent_id, "error": str(e)})
                finally:
                    await queues[agent_id].put(None)  # Sentinel
            
            # Start all workers
            workers = [asyncio.create_task(agent_worker(aid)) for aid in agent_ids]
            
            # Interleave events
            active_agents = set(agent_ids)
            while active_agents:
                # Drain all queues
                for aid in list(active_agents):
                    try:
                        event = queues[aid].get_nowait()
                        if event is None:
                            active_agents.discard(aid)
                        else:
                            yield event
                            if event.get("type") == "agent_complete":
                                previous_results[aid] = event.get("result", {})
                    except asyncio.QueueEmpty:
                        pass
                
                # Small pause to allow other coroutines to run
                await asyncio.sleep(0.05)
            
            # Ensure workers complete
            await asyncio.gather(*workers, return_exceptions=True)
        else:
            # Sequential execution
            for agent_id in agent_ids:
                async for event in run_single_agent(agent_id, user_prompt, previous_results, api_key, provider, model):
                    yield event
                    if event.get("type") == "agent_complete":
                        previous_results[agent_id] = event.get("result", {})
        
        yield {"type": "phase_complete", "phase": phase_num}
    
    # Final combined result
    final = {}
    if previous_results.get("frontend"):
        fe = previous_results["frontend"]
        final = {
            "html": fe.get("html", ""),
            "css": fe.get("css", ""),
            "js": fe.get("js", ""),
        }
    
    yield {
        "type": "pipeline_complete",
        "final_result": final,
        "all_agents_output": previous_results,
    }
