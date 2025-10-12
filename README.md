# AI Workflow Builder

**Talk to build workflows.** A voice-first automation platform that lets you create n8n workflows by simply describing what you want - no coding, no clicking, just conversation.

---

## 🎯 What is this?

This is an AI-powered workflow automation platform that combines voice AI with visual workflow building. You talk to an AI agent about your automation needs, and it generates complete, deployable n8n workflows in real-time.

**Key Features:**
- 🎙️ **Voice-first workflow creation** - Describe your automation needs naturally
- 🤖 **Multi-agent AI orchestration** - Specialist agents for sales, support, operations, and technical workflows
- 🔍 **Real-time node search** - Access to 2,500+ n8n integrations via MCP
- 📊 **Visual workflow editor** - See and edit your workflows as they're generated
- 🚀 **One-click deployment** - Deploy directly to n8n with auto-configured credentials

---

## 🎤 How We Used Gemini Models and Pipecat

### **Gemini Live Integration**
We use **Gemini 2.0 Flash (multimodal-live)** as the core conversational AI engine:
- **Speech-to-speech processing** - Gemini Live handles voice transcription, understanding, and response generation in one unified model
- **Function calling** - The model intelligently calls three key functions:
  - `route_to_agent` - Routes to specialist domains (sales/support/operations/technical)
  - `generate_workflow` - Creates n8n workflows from conversation context
  - `search_nodes` - Searches 2,500+ n8n integrations in real-time
- **Voice persona** - Using the "Puck" voice for an energetic, friendly assistant personality
- **Real-time transcription** - All conversations are transcribed live and sent to the frontend

### **Pipecat Framework**
**Pipecat** powers the entire voice infrastructure:
- **Daily.co transport** - Real-time audio streaming via WebRTC
- **Voice Activity Detection (VAD)** - Silero VAD for natural conversation flow and interruption handling
- **Pipeline architecture** - Clean audio processing pipeline: Input → Context → LLM → Context → Output
- **Context management** - OpenAI-style context aggregation for conversation history
- **Real-time streaming** - Low-latency voice responses for natural conversations

### **How It Works**
```
Voice → Gemini → Function Call → AI + MCP → Workflow → Deploy to n8n
```

**In detail:**
1. You talk, Pipecat captures audio, Gemini understands intent
2. Gemini calls `generate_workflow` with your description
3. Backend uses Claude + n8n-MCP to search 2,500+ real integrations
4. Valid workflow JSON appears in visual editor
5. Deploy to n8n with credentials auto-attached

---

## 🛠️ Other Tools Used

### **Model Context Protocol (MCP)**
- **n8n-MCP server** (`czlonkowski/n8n-mcp`) - Provides access to 2,500+ n8n community templates and node definitions
- Real-time node search during conversation
- Ensures generated workflows use real, valid n8n node types with correct properties

### **Claude 3.5 Sonnet (via Anthropic API)**
- Powers the workflow generation logic
- Analyzes natural language descriptions and converts them to structured n8n workflow JSON
- Handles node connections, parameter mapping, and credential requirements
- Provides intelligent suggestions for workflow improvements

### **Daily.co**
- WebRTC infrastructure for voice calls
- Room management for voice sessions
- Low-latency audio streaming

### **Tech Stack**
- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Node.js, Express, TypeScript, PostgreSQL
- **Voice Service:** Python, FastAPI, Pipecat
- **Infrastructure:** Railway, Supabase

---

## 🆕 What We Built During the Hackathon

**This entire voice workflow builder was built during the hackathon.** We had a basic chat-based workflow builder before, but everything voice-related is brand new:

### **New Features Built:**
1. **Complete Pipecat + Gemini Live integration**
   - Python voice service with FastAPI
   - Daily.co room management
   - Real-time audio pipeline with VAD
   - Gemini Live LLM service setup

2. **Multi-agent orchestration system**
   - Unified AI prompt that handles routing + all specialist modes
   - Function calling for agent routing, workflow generation, and node search
   - Real-time agent switching with frontend notifications

3. **Voice-optimized workflow generation**
   - Modified AI prompts for conversational workflow building
   - Real-time transcript streaming to frontend
   - WebSocket integration for live workflow updates
   - Voice-friendly response formatting

4. **n8n MCP integration**
   - Connected to n8n-MCP server for real-time node search
   - Integrated 2,500+ community templates
   - Added `search_nodes` function callable by Gemini
   - Fallback system with mock data

5. **Frontend voice UI**
   - Voice call component with Daily.co React library
   - Real-time transcript display
   - Agent routing visualization
   - Live workflow preview during voice conversations

### **What Was Pre-existing:**
- Basic Next.js + Express infrastructure
- Text-based chat workflow builder (replaced with voice)
- n8n API client for deployment
- Database schema and auth system
- Visual workflow editor (ReactFlow)

---

## 💬 Feedback on Tools

### **Pipecat**
**What worked great:**
- Pipeline architecture is clean
- Daily.co integration worked flawlessly
- VAD (Voice Activity Detection) handled interruptions naturally
- Documentation could be best

**Challenges:**
- Learning curve for understanding frame processors and aggregators
- Error messages could be more descriptive (especially for transport issues)
- Python async patterns took time to debug
- Context management with Gemini Live required monkey-patching

**Suggestions:**
- More examples for Gemini Live + function calling
- Better docs
- Better TypeScript/Python interop examples
- Clearer docs on how to send custom messages to frontend from Python

### **Gemini Live (multimodal-live)**
**What worked great:**
- Speech-to-speech is impressively fast (feels real-time)
- Function calling integration is clean and reliable
- Voice quality is natural (Puck voice is perfect for this use case)
- Handles interruptions well

**Challenges:**
- Documentation is scattered (had to piece together from Pipecat examples)
- No direct control over transcription output format
- Function call responses need specific formatting for voice
- Rate limits hit quickly during testing

**Suggestions:**
- More examples of voice-optimized prompting
- Better docs on function calling with streaming responses
- Clearer guidance on managing conversation context

---

## 🎥 Demo

https://github.com/user-attachments/assets/VIDEO.mp4

*A 60-second demo showing voice-powered workflow creation in action*

---

## 🏆 Hackathon Submission

**Team:** Nicolas Capetillo and Matteo Mariani
