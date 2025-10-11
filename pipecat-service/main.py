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
from pipecat.services.google.gemini_live import GeminiLiveLLMService
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineTask, PipelineParams
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.adapters.schemas.tools_schema import ToolsSchema
from pipecat.services.llm_service import FunctionCallParams
from pipecat.frames.frames import FunctionCallResultProperties

import config
from agents.prompts import UNIFIED_AGENT_PROMPT, SALES_AGENT_PROMPT, SUPPORT_AGENT_PROMPT, OPERATIONS_AGENT_PROMPT, TECHNICAL_AGENT_PROMPT
from services import WorkflowClient

# Initialize FastAPI
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
            task = active_sessions[room_name]
            await task.cancel()
            del active_sessions[room_name]
            return {"success": True, "message": "Session ended"}
        return {"success": False, "message": "Session not found"}
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
                        "enable_recording": False
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
                        # Set is_owner to False
                        "is_owner": False
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
        
        # Daily transport with balanced VAD settings
        transport = DailyTransport(
            room_url,
            None,  # Token not needed for bot
            "Workflow Assistant",
            DailyParams(
                audio_in_enabled=True,
                audio_out_enabled=True,
                vad_enabled=True,
                vad_analyzer=SileroVADAnalyzer(
                    params=VADParams(
                        stop_secs=1.5,      # 1.5s silence before stopping (give bot time to finish)
                        start_secs=0.4,     # 400ms of speech to start (avoid false triggers)
                        min_volume=0.65,    # Higher threshold - filters background noise
                        confidence=0.75     # Higher confidence - less sensitive
                    )
                ),
                vad_audio_passthrough=True
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
                # Tell the bot to continue as the specialist
                specialist_message = {
                    "sales": "Now I'm your sales automation specialist! Let's build a CRM workflow. What CRM do you use?",
                    "support": "Now I'm your support automation specialist! Let's build a helpdesk workflow. What ticketing system do you use?",
                    "operations": "Now I'm your operations specialist! Let's build a data workflow. What data sources do you work with?",
                    "technical": "Now I'm your technical integration specialist! Let's build an API workflow. What services need to be connected?"
                }.get(agent, f"Now I'm your {agent} specialist! How can I help you build workflows?")
                
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
                
                # Send workflow to frontend via server message (Pipecat custom messaging)
                try:
                    from pipecat.frames.frames import OutputTransportMessageFrame
                    
                    workflow_message = OutputTransportMessageFrame(
                        message={
                            "type": "workflow_generated",
                            "workflow": workflow,
                            "credentialRequirements": credential_reqs
                        }
                    )
                    
                    # Push frame to transport to send to frontend
                    await transport.send_message(workflow_message)
                    print(f"[Workflow Gen] ✅ Sent workflow to frontend via server message")
                except Exception as e:
                    print(f"[Workflow Gen] ⚠️ Failed to send to frontend: {e}")
                
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
                    "message": f"I've created your workflow with {node_count} nodes: {', '.join(node_names)}.{credential_msg} The workflow is now displayed on your screen. Would you like me to deploy it?"
                }
            else:
                error_msg = result.get("error", "Unknown error")
                print(f"[Workflow Gen] ❌ Failed: {error_msg}")
                response = {
                    "workflow_generated": False,
                    "error": error_msg,
                    "message": f"I encountered an error generating the workflow: {error_msg}. Could you provide more details about what you want to automate?"
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
                        "message": f"Yes! I found {count} integrations for {query}. Here are the top ones: {'. '.join(node_list[:3])}."
                    }
                else:
                    response = {
                        "found": False,
                        "count": 0,
                        "message": f"I couldn't find any integrations matching '{query}'. Could you try a different search term or describe what you're trying to do?"
                    }
            else:
                error_msg = result.get("error", "Unknown error")
                print(f"[Node Search] ❌ Failed: {error_msg}")
                response = {
                    "found": False,
                    "error": error_msg,
                    "message": f"I had trouble searching for that. Could you rephrase your question?"
                }
            
            # Return result to LLM
            await params.result_callback(response)
        
        # Gemini Live LLM service (speech-to-speech) - now uses unified prompt
        llm = GeminiLiveLLMService(
            api_key=config.GOOGLE_API_KEY,
            system_instruction=UNIFIED_AGENT_PROMPT,  # Unified prompt handles everything
            tools=tools,
            voice_id="Charon"  # Natural voice
        )
        
        print(f"[Bot] Gemini Live service initialized with UNIFIED prompt (routing + all specialists)")
        
        # Register function handlers
        llm.register_function("route_to_agent", handle_route_to_agent)
        llm.register_function("generate_workflow", handle_generate_workflow)
        llm.register_function("search_nodes", handle_search_nodes)
        
        print(f"[Bot] ✅ Registered functions: route_to_agent, generate_workflow, search_nodes")
        print(f"[Bot] 🔍 Agent can now search 2,500+ n8n integrations via MCP!")
        
        # Conversation context - empty to start
        messages = []
        context = OpenAILLMContext(messages)
        context_aggregator = llm.create_context_aggregator(context)
        
        # Pipeline: Audio in -> Context -> LLM -> Context -> Audio out
        pipeline = Pipeline([
            transport.input(),      # Receive audio from user
            context_aggregator.user(),  # Add user message to context
            llm,                    # Generate response with Gemini
            context_aggregator.assistant(),  # Add assistant response to context
            transport.output()      # Send audio back to user
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
        active_sessions[room_name] = task
        
        # Run pipeline
        runner = PipelineRunner()
        await runner.run(task)
        
    except Exception as e:
        print(f"Error running bot: {e}")
    finally:
        # Cleanup
        if room_name in active_sessions:
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
