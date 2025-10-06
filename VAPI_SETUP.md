# 🎙️ Vapi Voice AI Setup Guide

This guide will help you set up voice AI functionality for the workflow builder.

## 📋 Prerequisites

- Vapi account (sign up at https://vapi.ai)
- Backend server running
- Frontend server running

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Vapi Account

1. Go to https://vapi.ai
2. Sign up for a free account
3. Navigate to your dashboard

### Step 2: Create Vapi Assistant

You have two options:

#### Option A: Use Auto-Generated Config (Recommended)

1. Start your backend server:
   ```bash
   cd back
   npm run dev
   ```

2. Get the assistant configuration:
   ```bash
   curl http://localhost:3001/api/voice/assistant-config
   ```

3. Copy the JSON configuration from the response

4. In Vapi dashboard:
   - Click "Create Assistant"
   - Click "Import from JSON"
   - Paste the configuration
   - Click "Create"

#### Option B: Manual Setup

1. In Vapi dashboard, click "Create Assistant"
2. Configure:
   - **Name**: Workflow Builder Voice Assistant
   - **Model**: GPT-4o-mini
   - **Voice**: ElevenLabs - Rachel
   - **First Message**: "Hi! I'm your workflow assistant. What would you like to automate today?"

3. Add Functions (see detailed function schemas below)

4. Set Server URL:
   - **URL**: `http://your-backend-url:3001/api/voice/functions`
   - **Secret**: Generate a random string (save this for later)

### Step 3: Configure Environment Variables

#### Backend (.env)

Add these to `back/.env`:

```bash
VAPI_API_KEY=your_vapi_api_key
VAPI_WEBHOOK_SECRET=your_webhook_secret_from_step2
VAPI_ASSISTANT_ID=your_assistant_id
BACKEND_URL=http://localhost:3001  # or your production URL
```

#### Frontend (.env.local)

Create `front/.env.local`:

```bash
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_assistant_id
```

**Where to find these:**
- **Public Key**: Vapi Dashboard → Settings → API Keys → Public Key
- **API Key**: Vapi Dashboard → Settings → API Keys → Private Key
- **Assistant ID**: After creating assistant, copy from URL or assistant details

### Step 4: Install Dependencies

```bash
# Frontend
cd front
npm install

# Backend (already installed)
cd ../back
npm install
```

### Step 5: Test Voice AI

1. Start both servers:
   ```bash
   # Terminal 1 - Backend
   cd back
   npm run dev

   # Terminal 2 - Frontend
   cd front
   npm run dev
   ```

2. Open http://localhost:3000/editor

3. Click the "Voice" button in the top-right of the chat panel

4. Click the microphone button and say:
   > "Create a workflow that sends a Slack message every morning at 9 AM"

5. Watch as the AI:
   - Responds with voice
   - Asks clarifying questions
   - Generates the workflow in real-time
   - Updates the visual canvas

## 🎯 Function Schemas (for Manual Setup)

If you're setting up manually, add these functions to your Vapi assistant:

### Function 1: generateWorkflow

```json
{
  "name": "generateWorkflow",
  "description": "Generate a workflow based on user requirements. Call this when you have enough information about the trigger, actions, and services.",
  "parameters": {
    "type": "object",
    "properties": {
      "description": {
        "type": "string",
        "description": "Complete workflow description based on the conversation"
      },
      "trigger": {
        "type": "string",
        "description": "Workflow trigger type",
        "enum": ["webhook", "schedule", "manual"]
      },
      "services": {
        "type": "array",
        "items": {"type": "string"},
        "description": "List of services to use (e.g., Slack, Gmail, Postgres)"
      },
      "schedule": {
        "type": "string",
        "description": "Schedule time if trigger is schedule (e.g., '9 AM daily', 'every Monday')"
      }
    },
    "required": ["description"]
  }
}
```

### Function 2: updateWorkflow

```json
{
  "name": "updateWorkflow",
  "description": "Modify the current workflow based on user corrections or changes",
  "parameters": {
    "type": "object",
    "properties": {
      "modification": {
        "type": "string",
        "description": "What to change in the workflow"
      },
      "nodeToModify": {
        "type": "string",
        "description": "Which node to update (optional)"
      }
    },
    "required": ["modification"]
  }
}
```

### Function 3: deployWorkflow

```json
{
  "name": "deployWorkflow",
  "description": "Deploy the workflow to n8n. Only call this after user confirms they want to deploy.",
  "parameters": {
    "type": "object",
    "properties": {
      "confirm": {
        "type": "boolean",
        "description": "User confirmation to deploy"
      }
    },
    "required": ["confirm"]
  }
}
```

### Function 4: getWorkflowStatus

```json
{
  "name": "getWorkflowStatus",
  "description": "Get the current status of the workflow being built",
  "parameters": {
    "type": "object",
    "properties": {}
  }
}
```

## 🎨 System Prompt (for Manual Setup)

```
You are a helpful workflow automation assistant. Help users create n8n workflows through natural conversation.

GUIDELINES:
- Ask clarifying questions when needed, but don't ask too many
- Be concise and action-oriented
- When you have enough info (trigger + action + services), call generateWorkflow
- Use natural, conversational language
- Confirm before deploying workflows

WORKFLOW COMPONENTS:
- Triggers: webhook, schedule, manual
- Services: Slack, Gmail, Google Sheets, Postgres, HTTP Request
- Always extract: what triggers it, what it does, which services to use
```

## 🔧 Troubleshooting

### Voice button doesn't appear
- Check that `NEXT_PUBLIC_VAPI_PUBLIC_KEY` is set in `.env.local`
- Restart the frontend server after adding env variables

### "Failed to connect" error
- Verify your Vapi Public Key is correct
- Check browser console for detailed errors
- Ensure microphone permissions are granted

### Functions not being called
- Check backend logs for webhook requests
- Verify `BACKEND_URL` is accessible from Vapi servers
- For local development, use ngrok to expose your backend:
  ```bash
  ngrok http 3001
  # Use the ngrok URL as BACKEND_URL
  ```

### Workflow not generating
- Check backend logs for errors
- Verify OpenAI API key is set
- Check that n8n MCP client is connected

## 💰 Pricing

Vapi pricing (as of 2025):
- **Free tier**: 10 minutes/month
- **Starter**: $0.05-0.10 per minute
- **Production**: Custom pricing

For hackathon/demo: Free tier is sufficient for testing!

## 📚 Additional Resources

- [Vapi Documentation](https://docs.vapi.ai)
- [Vapi Dashboard](https://dashboard.vapi.ai)
- [Backend API Docs](http://localhost:3001/api/voice/assistant-config)

## 🎉 You're Ready!

Once set up, you can:
- ✅ Create workflows by voice
- ✅ Ask the AI to modify workflows
- ✅ Deploy with voice commands
- ✅ Get real-time visual feedback

Try saying: "Create a workflow that sends me an email when someone submits a form"
