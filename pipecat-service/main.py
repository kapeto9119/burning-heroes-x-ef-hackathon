"""
Pipecat Multi-Agent Voice Service
Main entry point for the voice service
"""

import asyncio
import aiohttp
import ssl
import os

# Fix SSL certificate verification for NLTK
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

# Download required NLTK data on first run
import nltk
try:
    nltk.data.find('tokenizers/punkt_tab')
except LookupError:
    print("📥 Downloading NLTK data...")
    nltk.download('punkt_tab', quiet=True)
    print("✅ NLTK data downloaded")
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import Optional

from pipecat.transports.daily.transport import DailyTransport, DailyParams
from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineTask, PipelineParams
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.adapters.schemas.tools_schema import ToolsSchema
from pipecat.services.llm_service import FunctionCallParams
# TranscriptProcessor not needed - Gemini Live handles transcription internally

import config
from agents.prompts import UNIFIED_AGENT_PROMPT, SALES_AGENT_PROMPT, SUPPORT_AGENT_PROMPT, OPERATIONS_AGENT_PROMPT, TECHNICAL_AGENT_PROMPT
from services import WorkflowClient

# Initialize FastAPI    c
app = FastAPI(title="Pipecat Multi-Agent Voice Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
workflow_client = WorkflowClient()
active_sessions = {}


class SessionRequest(BaseModel):
    user_id: Optional[str] = None


class SessionResponse(BaseModel):
    room_url: str
    room_name: str
    token: str


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "pipecat-voice",
        "version": "1.0.0"
    }


@app.post("/end-session")
async def end_session(room_name: str):
    """
    End a voice session and cleanup resources
    """
    try:
        if room_name in active_sessions:
            session_data = active_sessions[room_name]
            
            # Get task from session data
            task = session_data.get("task") if isinstance(session_data, dict) else session_data
            
            # Cancel task
            await task.cancel()
            
            print(f"[Session] Ended session: {room_name}")
            return {"success": True, "message": "Session ended"}
        
        return {"success": True, "message": "Session not found (already ended)"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/start-session", response_model=SessionResponse)
async def start_session(request: SessionRequest):
    """
    Create a new Daily room and start voice session.
    A room is a virtual space where the user and the bot can have a conversation.
    """
    try:
        # Create SSL context that doesn't verify certificates (for development)
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        # Create Daily room
        # aiohttp is used to make HTTP requests to the Daily.co API
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        async with aiohttp.ClientSession(connector=connector) as session:
            headers = {
                "Authorization": f"Bearer {config.DAILY_API_KEY}",
                "Content-Type": "application/json"
            }
            
            # Create room
            # Daily.co API endpoint for creating a new room, this returns a room URL and name
            async with session.post(
                "https://api.daily.co/v1/rooms",
                headers=headers,
                json={
                    "properties": {
                        # Set max participants to 2
                        "max_participants": 2,
                        # Disable chat
                        "enable_chat": False,
                        # Disable screenshare
                        "enable_screenshare": False,
                        # Disable recording
                        "enable_recording": False,
                        # CRITICAL: Start with audio enabled by default
                        "start_audio_off": False,
                        # Auto-subscribe to tracks
                        "autojoin": True
                    }
                }
            ) as response:
                if response.status != 200:
                    raise HTTPException(status_code=500, detail="Failed to create Daily room")
                
                room_data = await response.json()
                room_name = room_data["name"]
                room_url = room_data["url"]
            
            # Create token for user
            # Daily.co API endpoint for creating a new token, this returns a token for the user
            async with session.post(
                "https://api.daily.co/v1/meeting-tokens",
                headers=headers,
                json={
                    "properties": {
                        # Set room name
                        "room_name": room_name,
                        # CRITICAL: Set is_owner to True so user can control audio
                        "is_owner": True
                    }
                }
            ) as response:
                if response.status != 200:
                    raise HTTPException(status_code=500, detail="Failed to create token")
                
                token_data = await response.json()
                token = token_data["token"]
        
        # Start bot in background
        # asyncio.create_task is used for this, and it runs the bot in the background
        asyncio.create_task(run_bot(room_url, room_name, request.user_id))
        
        # Return session response
        return SessionResponse(
            room_url=room_url,
            room_name=room_name,
            token=token
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def run_bot(room_url: str, room_name: str, user_id: Optional[str]):
    """
    Run the Pipecat bot with multi-agent orchestration using Gemini Live
    """
    try:
        # Initialize workflow client
        workflow_client = WorkflowClient()
        current_agent_ref = {"name": "orchestrator"}  # Use dict to allow modification in nested functions
        
        # Agent prompts mapping (for reference - we use unified prompt now)
        agent_prompts = {
            "orchestrator": UNIFIED_AGENT_PROMPT,  # Unified prompt handles routing + all specialists
            "sales": SALES_AGENT_PROMPT,
            "support": SUPPORT_AGENT_PROMPT,
            "operations": OPERATIONS_AGENT_PROMPT,
            "technical": TECHNICAL_AGENT_PROMPT
        }
        
        # Function to track agent routing (for frontend notification)
        async def switch_to_agent(agent_name: str, llm_service, transport_ref):
            """
            Track agent routing and notify frontend.
            Note: With unified prompt, we don't actually switch prompts - 
            the bot just changes its behavior based on the routing.
            """
            if agent_name in agent_prompts and agent_name != current_agent_ref["name"]:
                old_agent = current_agent_ref["name"]
                print(f"[Agent Routing] {old_agent} → {agent_name} (unified prompt continues)")
                current_agent_ref["name"] = agent_name
                
                # Send agent switch notification to frontend for UI updates
                try:
                    import json
                    message = {
                        "type": "agent_switch",
                        "agent": agent_name,
                        "previous_agent": old_agent
                    }
                    # Try to send via Daily's app message
                    if hasattr(transport_ref, '_client') and transport_ref._client:
                        # Use Daily's sendAppMessage if available
                        daily_client = transport_ref._client
                        if hasattr(daily_client, 'sendAppMessage'):
                            daily_client.sendAppMessage(json.dumps(message), "*")
                            print(f"[Agent Routing] ✅ Sent notification to frontend")
                        else:
                            print(f"[Agent Routing] ⚠️ Daily client doesn't support sendAppMessage")
                    else:
                        print(f"[Agent Routing] ⚠️ No Daily client available for notification")
                except Exception as e:
                    print(f"[Agent Routing] ⚠️ Failed to send notification: {e}")
                
                return True
            return False
        
        # Define function for agent routing (triggers behavior change in unified prompt)
        route_to_agent_function = FunctionSchema(
            name="route_to_agent",
            description="Route to specialist domain and switch your behavior. After calling this, YOU BECOME that specialist and help build workflows.",
            properties={
                "agent": {
                    "type": "string",
                    "description": "The specialist agent: sales (for CRM/leads), support (for tickets/helpdesk), operations (for data/scheduling), technical (for API/webhooks)",
                    "enum": ["sales", "support", "operations", "technical"]
                },
                "reason": {
                    "type": "string",
                    "description": "One sentence explaining why you're routing to this agent"
                }
            },
            required=["agent", "reason"]
        )
        
        # Define function for workflow generation
        generate_workflow_function = FunctionSchema(
            name="generate_workflow",
            description="Generate a workflow based on user requirements. Call this when you have gathered enough information about what the user wants to automate.",
            properties={
                "description": {
                    "type": "string",
                    "description": "Complete description of the workflow based on the conversation"
                },
                "trigger": {
                    "type": "string",
                    "description": "Trigger type: webhook, schedule, or manual",
                    "enum": ["webhook", "schedule", "manual"]
                },
                "services": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of services to use (e.g., slack, gmail, hubspot, postgres)"
                },
                "schedule": {
                    "type": "string",
                    "description": "Schedule time if trigger is schedule (e.g., 'daily at 9 AM', 'every Monday')"
                }
            },
            required=["description"]
        )
        
        # Define function for searching available nodes/integrations
        search_nodes_function = FunctionSchema(
            name="search_nodes",
            description="Search available n8n nodes and integrations. Use this to answer questions about what services, triggers, or actions are available (e.g., 'Does n8n support Airtable?', 'What Salesforce triggers exist?')",
            properties={
                "query": {
                    "type": "string",
                    "description": "Search query describing the service or integration (e.g., 'Salesforce', 'email triggers', 'Airtable')"
                }
            },
            required=["query"]
        )
        
        tools = ToolsSchema(standard_tools=[route_to_agent_function, generate_workflow_function, search_nodes_function])
        
        # Daily transport with responsive VAD settings - lets user interrupt easily
        transport = DailyTransport(
            room_url,
            None,  # Token not needed for bot
            "Workflow Assistant",
            DailyParams(
                audio_in_enabled=True,
                audio_out_enabled=True,
                # Use vad_analyzer instead of vad_enabled (deprecated)
            vad_analyzer=SileroVADAnalyzer(
                params=VADParams(
                    stop_secs=1.2,      # Give bot 1.2s to finish speaking
                    start_secs=0.3,     # 300ms before detecting user (give bot space)
                    min_volume=0.6,     # Higher threshold - bot less easily interrupted
                    confidence=0.7      # Higher confidence - less sensitive during bot speech
                )
            )
                # vad_audio_passthrough is deprecated - audio passthrough is now always enabled
            )
        )
        
        # Function handler for agent routing
        async def handle_route_to_agent(params: FunctionCallParams):
            """Handle routing to specialist agent"""
            print(f"[Function Call] ✅ route_to_agent was called!")
            args = params.arguments
            agent = args.get("agent")
            reason = args.get("reason", "")
            
            print(f"[Routing] Switching to {agent} agent. Reason: {reason}")
            
            # Switch to the specialist agent and notify frontend
            switched = await switch_to_agent(agent, params.llm, transport)
            
            if switched:
                # Tell the bot to continue as the specialist - SHORT responses
                specialist_message = {
                    "sales": "Got it! What CRM?",
                    "support": "Perfect! What ticketing system?",
                    "operations": "Nice! What data sources?",
                    "technical": "Cool! What services?"
                }.get(agent, f"Great! Let's go!")
                
                response = {
                    "routed": True,
                    "agent": agent,
                    "message": specialist_message
                }
            else:
                response = {
                    "routed": False,
                    "error": f"Could not route to {agent}"
                }
            
            # Run LLM after routing so the new agent can introduce itself
            await params.result_callback(response)
        
        # Function handler for workflow generation
        async def handle_generate_workflow(params: FunctionCallParams):
            """Handle generate_workflow function call - generates workflow and sends to frontend"""
            args = params.arguments
            print(f"[Function Call] ✅ generate_workflow called!")
            print(f"[Workflow Gen] Description: {args.get('description')}")
            print(f"[Workflow Gen] Trigger: {args.get('trigger')}")
            print(f"[Workflow Gen] Services: {args.get('services')}")
            
            # Call backend to generate workflow
            result = await workflow_client.generate_workflow(
                description=args.get("description"),
                trigger=args.get("trigger"),
                services=args.get("services"),
                schedule=args.get("schedule")
            )
            
            if result.get("success"):
                workflow_data = result.get("data", {})
                workflow = workflow_data.get("workflow", {})
                credential_reqs = workflow_data.get("credentialRequirements", [])
                
                node_count = len(workflow.get("nodes", []))
                node_names = [n.get("name", "Unknown") for n in workflow.get("nodes", [])]
                
                print(f"[Workflow Gen] ✅ Generated workflow with {node_count} nodes: {', '.join(node_names)}")
                
                # Send workflow to frontend via backend WebSocket
                # Since Daily app messages are complex in Python Pipecat,
                # we'll send via the backend API which will broadcast via WebSocket
                try:
                    import aiohttp
                    import asyncio
                    
                    async def send_workflow_to_backend():
                        try:
                            async with aiohttp.ClientSession() as session:
                                await session.post(
                                    f"{backend_url}/api/pipecat/workflow-generated",
                                    json={
                                        "userId": user_id,
                                        "workflow": workflow,
                                        "credentialRequirements": credential_reqs
                                    },
                                    timeout=aiohttp.ClientTimeout(total=5)
                                )
                            print(f"[Workflow Gen] ✅ Sent workflow to backend for broadcast")
                        except Exception as e:
                            print(f"[Workflow Gen] ⚠️ Failed to send via backend: {e}")
                    
                    # Fire and forget
                    asyncio.create_task(send_workflow_to_backend())
                except Exception as e:
                    import traceback
                    print(f"[Workflow Gen] ⚠️ Failed to send to frontend: {e}")
                    print(f"[Workflow Gen] Traceback: {traceback.format_exc()}")
                
                # Format voice-friendly response for LLM
                credential_msg = ""
                if credential_reqs:
                    services = [c.get("service") for c in credential_reqs]
                    credential_msg = f" You'll need to set up credentials for: {', '.join(services)}."
                
                response = {
                    "workflow_generated": True,
                    "workflow_id": workflow.get("id"),
                    "node_count": node_count,
                    "nodes": ", ".join(node_names),
                    "message": f"Done! Created {node_count} nodes.{credential_msg} Deploy it?"
                }
            else:
                error_msg = result.get("error", "Unknown error")
                print(f"[Workflow Gen] ❌ Failed: {error_msg}")
                response = {
                    "workflow_generated": False,
                    "error": error_msg,
                    "message": f"Oops, error! Can you give me more details?"
                }
            
            # Return result to LLM so it can respond to user
            await params.result_callback(response)
        
        # Function handler for searching nodes
        async def handle_search_nodes(params: FunctionCallParams):
            """Handle search_nodes function call - searches available integrations"""
            args = params.arguments
            query = args.get("query", "")
            
            print(f"[Function Call] ✅ search_nodes called!")
            print(f"[Node Search] Query: {query}")
            
            # Call backend to search nodes via MCP
            result = await workflow_client.search_nodes(query, limit=5)
            
            if result.get("success"):
                data = result.get("data", {})
                nodes = data.get("nodes", [])
                count = data.get("count", 0)
                
                print(f"[Node Search] ✅ Found {count} nodes for: {query}")
                
                if count > 0:
                    # Format node list for voice
                    node_list = []
                    for node in nodes[:5]:  # Top 5 results
                        name = node.get("name", "Unknown")
                        desc = node.get("description", "")
                        node_list.append(f"{name}: {desc}")
                    
                    response = {
                        "found": True,
                        "count": count,
                        "nodes": node_list,
                        "message": f"Yes! Found {count}. Top one: {node_list[0].split(':')[0]}."
                    }
                else:
                    response = {
                        "found": False,
                        "count": 0,
                        "message": f"None found for {query}. Try another term?"
                    }
            else:
                error_msg = result.get("error", "Unknown error")
                print(f"[Node Search] ❌ Failed: {error_msg}")
                response = {
                    "found": False,
                    "error": error_msg,
                    "message": f"Search error. Try again?"
                }
            
            # Return result to LLM
            await params.result_callback(response)
        
        # Conversation context - set initial system message
        # The first message establishes the bot's personality and behavior
        messages = [{
            "role": "user",
            "content": UNIFIED_AGENT_PROMPT
        }]
        context = OpenAILLMContext(messages)
        
        # Gemini Live LLM service (speech-to-speech) - follows official Pipecat pattern
        llm = GeminiLiveLLMService(
            api_key=config.GOOGLE_API_KEY,
            voice_id="Puck",  # Puck is energetic and friendly (Kore, Fenrir are alternatives)
            tools=tools
        )
        
        # Create context aggregator AFTER initializing the LLM
        # This manages conversation history automatically
        context_aggregator = llm.create_context_aggregator(context)
        
        print(f"[Bot] Gemini Live service initialized with UNIFIED prompt (routing + all specialists)")
        
        # Register function handlers
        llm.register_function("route_to_agent", handle_route_to_agent)
        llm.register_function("generate_workflow", handle_generate_workflow)
        llm.register_function("search_nodes", handle_search_nodes)
        
        print(f"[Bot] ✅ Registered functions: route_to_agent, generate_workflow, search_nodes")
        print(f"[Bot] 🔍 Agent can now search 2,500+ n8n integrations via MCP!")
        
        # Import what we need for real-time transcripts
        import datetime
        import aiohttp as aiohttp_client  # Rename to avoid conflicts
        backend_url = config.BACKEND_API_URL or "http://localhost:3001"
        
        # Helper to send transcripts in real-time
        async def send_transcript_live(role: str, content: str):
            """Send transcript to backend immediately as it happens"""
            try:
                timestamp = datetime.datetime.now().isoformat()
                
                async with aiohttp_client.ClientSession() as session:
                    await session.post(
                        f"{backend_url}/api/pipecat/transcript",
                        json={
                            "userId": user_id,
                            "role": role,
                            "content": content,
                            "timestamp": timestamp,
                            "sessionId": room_name
                        },
                        timeout=aiohttp_client.ClientTimeout(total=2)
                    )
                print(f"[Transcript LIVE] ✅ {role}: {content[:50]}")
            except Exception as e:
                print(f"[Transcript LIVE] ⚠️ Failed: {e}")
        
        # Intercept context aggregator to send transcripts live
        # Monkey-patch the context.add_message method to send transcripts immediately
        original_add_message = context.add_message
        
        def add_message_with_live_transcript(message):
            """Custom add_message that sends transcripts live"""
            # Call original method first
            result = original_add_message(message)
            
            # Extract and send transcript
            try:
                role = message.get("role", "unknown")
                
                if role != "system":  # Skip system messages
                    content = ""
                    if isinstance(message.get("content"), str):
                        content = message.get("content")
                    elif isinstance(message.get("content"), list):
                        for part in message.get("content", []):
                            if hasattr(part, 'text'):
                                content += part.text
                            elif isinstance(part, dict) and "text" in part:
                                content += part["text"]
                    
                    # Skip system prompt
                    if content and "You are a fast, energetic workflow automation specialist" not in content:
                        # Send to backend immediately!
                        asyncio.create_task(send_transcript_live(role, content))
            except Exception as e:
                print(f"[Transcript LIVE] Error: {e}")
            
            return result
        
        # Apply the monkey-patch
        context.add_message = add_message_with_live_transcript
        
        # Pipeline: Audio in -> Context -> LLM -> Context -> Audio out
        # Note: Gemini Live handles its own transcription internally
        pipeline = Pipeline([
            transport.input(),              # Receive audio from user
            context_aggregator.user(),      # Add user message to context
            llm,                            # Generate response with Gemini (with transcription events)
            context_aggregator.assistant(), # Add assistant response to context
            transport.output()              # Send audio back to user
        ])
        
        # Create task
        task = PipelineTask(
            pipeline,
            params=PipelineParams(
                allow_interruptions=True,
                enable_metrics=True,
                enable_usage_metrics=True
            )
        )
        
        # Store task for cleanup
        active_sessions[room_name] = {
            "task": task,
            "user_id": user_id
        }
        
        # Run pipeline
        runner = PipelineRunner()
        await runner.run(task)
        
    except Exception as e:
        print(f"Error running bot: {e}")
    finally:
        # Cleanup session
        if room_name in active_sessions:
            print(f"[Session] Cleaning up session: {room_name}")
            del active_sessions[room_name]


if __name__ == "__main__":
    print("🎙️  Starting Pipecat Multi-Agent Voice Service...")
    print(f"📡 Server: http://{config.HOST}:{config.PORT}")
    print(f"🔗 Backend: {config.BACKEND_API_URL}")
    print("✅ Ready!")
    
    uvicorn.run(
        app,
        host=config.HOST,
        port=config.PORT,
        log_level="info"
    )
