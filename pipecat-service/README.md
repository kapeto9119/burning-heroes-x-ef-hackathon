# Pipecat Multi-Agent Voice Service

Multi-agent orchestration service using Pipecat + Gemini for voice-powered workflow building.

## Setup

1. **Create virtual environment:**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Configure environment:**
- Copy `.env.example` to `.env`
- Add your API keys (Gemini, Daily.co)

4. **Run service:**
```bash
python main.py
```

## Architecture

**Unified Agent Approach:**
- Single intelligent agent with unified prompt
- Routes users to specialist domains via `route_to_agent()` function
- Dynamically switches behavior to act as the appropriate specialist:
  - **Sales Specialist**: CRM, leads, sales automation
  - **Support Specialist**: Tickets, customer service
  - **Operations Specialist**: Data sync, reporting, scheduling
  - **Technical Specialist**: APIs, databases, integrations
- Continues conversation seamlessly without reconnecting

## Endpoints

- `POST /start-session` - Create new voice session
- `GET /health` - Health check
