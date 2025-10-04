#!/bin/bash

# Interactive workflow generation and deployment test

API_URL="http://localhost:3001"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "🤖 ================================================"
echo "🤖  Interactive AI Workflow Builder Test"
echo "🤖 ================================================"
echo ""

# Load SLACK_TOKEN from .env if not set
if [ -z "$SLACK_TOKEN" ] && [ -f .env ]; then
  echo -e "${BLUE}Loading SLACK_TOKEN from .env file...${NC}"
  export SLACK_TOKEN=$(grep SLACK_TOKEN .env | cut -d '=' -f2)
fi

if [ -z "$SLACK_TOKEN" ]; then
  echo -e "${RED}❌ No SLACK_TOKEN found!${NC}"
  echo "Please add SLACK_TOKEN to your .env file"
  exit 1
fi

echo -e "${GREEN}✓ Using Slack token: ${SLACK_TOKEN:0:15}...${NC}"
echo ""

# Step 1: Register/Login
echo -e "${BLUE}Step 1: Authentication${NC}"
REGISTER_RESPONSE=$(curl -s -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "interactive@example.com",
    "password": "password123",
    "name": "Interactive Test User"
  }')

TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token')

if [ "$TOKEN" == "null" ]; then
  echo -e "${YELLOW}User exists, logging in...${NC}"
  LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "interactive@example.com",
      "password": "password123"
    }')
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
fi

echo -e "${GREEN}✓ Authenticated${NC}"
echo ""

# Step 2: Add Slack Credentials
echo -e "${BLUE}Step 2: Adding Slack Credentials${NC}"
curl -s -X POST $API_URL/api/auth/credentials/slack \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$SLACK_TOKEN\"}" > /dev/null

echo -e "${GREEN}✓ Slack credentials added${NC}"
echo ""

# Step 3: Interactive Workflow Generation
echo -e "${BLUE}Step 3: Describe Your Workflow${NC}"
echo ""
echo "Examples:"
echo ""
echo "Triggers:"
echo "  - When webhook receives data..."
echo "  - Every day at 9am..."
echo "  - Manually trigger..."
echo ""
echo "Actions:"
echo "  - Send Slack message to #alerts"
echo "  - Send email to user@example.com"
echo "  - Make HTTP request to API"
echo "  - Insert data into Postgres database"
echo "  - Append row to Google Sheets"
echo ""
echo "Combined:"
echo "  - Send Slack message to #alerts when webhook receives data"
echo "  - Send email every day at 9am with report"
echo "  - Make HTTP POST to API and save to database"
echo ""
echo -n "Your workflow description: "
read WORKFLOW_DESCRIPTION

if [ -z "$WORKFLOW_DESCRIPTION" ]; then
  echo -e "${RED}❌ No description provided${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}Generating workflow...${NC}"

WORKFLOW_RESPONSE=$(curl -s -X POST $API_URL/api/chat/generate-workflow \
  -H "Content-Type: application/json" \
  -d "{\"description\": \"$WORKFLOW_DESCRIPTION\"}")

echo ""
echo -e "${GREEN}✓ Workflow generated!${NC}"
echo ""
echo "Workflow Details:"
echo "$WORKFLOW_RESPONSE" | jq '.data | {name, nodes: [.nodes[] | {name, type, parameters}]}'
echo ""

WORKFLOW=$(echo "$WORKFLOW_RESPONSE" | jq '.data')

# Step 4: Deploy
echo -e "${BLUE}Step 4: Deploy to n8n?${NC}"
echo -n "Deploy this workflow? (y/n): "
read DEPLOY_CONFIRM

if [ "$DEPLOY_CONFIRM" != "y" ]; then
  echo "Deployment cancelled"
  exit 0
fi

echo ""
echo -e "${BLUE}Deploying...${NC}"

DEPLOY_RESPONSE=$(curl -s -X POST $API_URL/api/deploy \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"workflow\": $WORKFLOW}")

echo ""
echo "$DEPLOY_RESPONSE" | jq '.'

N8N_WORKFLOW_ID=$(echo "$DEPLOY_RESPONSE" | jq -r '.data.n8nWorkflowId')
WORKFLOW_ID=$(echo "$DEPLOY_RESPONSE" | jq -r '.data.workflowId')
WEBHOOK_URL=$(echo "$DEPLOY_RESPONSE" | jq -r '.data.webhookUrl')

if [ "$N8N_WORKFLOW_ID" == "null" ]; then
  echo -e "${RED}❌ Deployment failed${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✓ Workflow deployed!${NC}"
echo -e "${GREEN}  Workflow ID: $WORKFLOW_ID${NC}"
echo -e "${GREEN}  n8n ID: $N8N_WORKFLOW_ID${NC}"
echo ""

# Step 5: Activate
echo -e "${BLUE}Step 5: Activating workflow...${NC}"

ACTIVATE_RESPONSE=$(curl -s -X POST $API_URL/api/deploy/$WORKFLOW_ID/activate \
  -H "Authorization: Bearer $TOKEN")

echo "$ACTIVATE_RESPONSE" | jq '.'

if echo "$ACTIVATE_RESPONSE" | jq -e '.success' > /dev/null; then
  echo ""
  echo -e "${GREEN}✓ Workflow activated!${NC}"
else
  echo ""
  echo -e "${YELLOW}⚠ Activation failed - activate manually in n8n UI${NC}"
fi

echo ""

# Step 6: Test Instructions
echo "🎯 ================================================"
echo "🎯  Testing Your Workflow"
echo "🎯 ================================================"
echo ""
echo "1. Go to n8n: https://n8n-production-e2d3.up.railway.app"
echo "2. Find workflow: [User:...] ${WORKFLOW_DESCRIPTION:0:40}..."
echo "3. Click 'Execute workflow' button"
echo "4. Run this command:"
echo ""
echo -e "${BLUE}curl -X POST https://$WEBHOOK_URL \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"message\":\"Test from terminal\"}'"
echo -e "${NC}"
echo ""
echo "5. Check your Slack channel for the message!"
echo ""
echo -e "${GREEN}✅ Done!${NC}"
echo ""
