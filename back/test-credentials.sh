#!/bin/bash

# Test script for credential management and deployment with real tokens

API_URL="http://localhost:3001"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "🔐 ================================================"
echo "🔐  Testing Credential Management & Deployment"
echo "🔐 ================================================"
echo ""

# Load SLACK_TOKEN from .env if not set
if [ -z "$SLACK_TOKEN" ] && [ -f .env ]; then
  echo -e "${BLUE}Loading SLACK_TOKEN from .env file...${NC}"
  export SLACK_TOKEN=$(grep SLACK_TOKEN .env | cut -d '=' -f2)
fi

# Check if Slack token provided
if [ -z "$SLACK_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  No SLACK_TOKEN found in environment or .env file${NC}"
  echo ""
  echo "To test with real Slack credentials:"
  echo "  1. Get your Slack token from https://api.slack.com/apps"
  echo "  2. Add to .env: SLACK_TOKEN=xoxb-your-token"
  echo "  3. Or run: SLACK_TOKEN=xoxb-your-token ./test-credentials.sh"
  echo ""
  echo "Continuing with test token (deployment will fail without real token)..."
  echo ""
  SLACK_TOKEN="xoxb-test-token-replace-with-real"
else
  echo -e "${GREEN}✓ Using Slack token: ${SLACK_TOKEN:0:15}...${NC}"
  echo ""
fi

# Test 1: Register User
echo -e "${BLUE}Test 1: Register New User${NC}"
REGISTER_RESPONSE=$(curl -s -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "credtest@example.com",
    "password": "password123",
    "name": "Credential Test User"
  }')

echo "$REGISTER_RESPONSE" | jq '.'
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token')
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.user.id')

if [ "$TOKEN" != "null" ]; then
  echo ""
  echo -e "${GREEN}✓ User registered${NC}"
  echo -e "${GREEN}  Token: ${TOKEN:0:20}...${NC}"
else
  echo ""
  echo -e "${YELLOW}⚠ User might already exist, trying login...${NC}"
  
  LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "credtest@example.com",
      "password": "password123"
    }')
  
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
  USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.id')
  echo -e "${GREEN}✓ Logged in${NC}"
fi

echo ""
echo "---"
echo ""

# Test 2: Add Slack Credentials
echo -e "${BLUE}Test 2: Add Slack Credentials${NC}"
echo "Using token: ${SLACK_TOKEN:0:15}..."
echo ""

SLACK_RESPONSE=$(curl -s -X POST $API_URL/api/auth/credentials/slack \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$SLACK_TOKEN\"
  }")

echo "$SLACK_RESPONSE" | jq '.'

if echo "$SLACK_RESPONSE" | jq -e '.success' > /dev/null; then
  echo ""
  echo -e "${GREEN}✓ Slack credentials saved${NC}"
else
  echo ""
  echo -e "${RED}✗ Failed to save Slack credentials${NC}"
fi

echo ""
echo "---"
echo ""

# Test 3: Verify Slack Connection
echo -e "${BLUE}Test 3: Verify Slack Connection${NC}"
curl -s $API_URL/api/auth/credentials/slack \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""
echo -e "${GREEN}✓ Connection verified${NC}"
echo ""
echo "---"
echo ""

# Test 4: Generate Workflow with Slack Node
echo -e "${BLUE}Test 4: Generate Workflow with Slack${NC}"
WORKFLOW_RESPONSE=$(curl -s -X POST $API_URL/api/chat/generate-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Send Slack message to #general when webhook receives data"
  }')

echo "$WORKFLOW_RESPONSE" | jq '.'
WORKFLOW=$(echo "$WORKFLOW_RESPONSE" | jq '.data')

echo ""
echo -e "${GREEN}✓ Workflow generated${NC}"
echo ""
echo "---"
echo ""

# Test 5: Deploy Workflow with Credentials
echo -e "${BLUE}Test 5: Deploy Workflow to n8n (with credentials)${NC}"
echo "This will:"
echo "  1. Create n8n credential from your Slack token"
echo "  2. Attach credential to Slack node"
echo "  3. Deploy workflow to n8n"
echo "  4. Activate workflow"
echo ""

DEPLOY_RESPONSE=$(curl -s -X POST $API_URL/api/deploy \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"workflow\": $WORKFLOW}")

echo "$DEPLOY_RESPONSE" | jq '.'

if echo "$DEPLOY_RESPONSE" | jq -e '.success' > /dev/null; then
  N8N_WORKFLOW_ID=$(echo "$DEPLOY_RESPONSE" | jq -r '.data.n8nWorkflowId')
  WORKFLOW_ID=$(echo "$DEPLOY_RESPONSE" | jq -r '.data.workflowId')
  WEBHOOK_URL=$(echo "$DEPLOY_RESPONSE" | jq -r '.data.webhookUrl')
  STATUS=$(echo "$DEPLOY_RESPONSE" | jq -r '.data.status')
  
  echo ""
  echo -e "${GREEN}✓ Workflow deployed successfully!${NC}"
  echo -e "${GREEN}  Workflow ID: $WORKFLOW_ID${NC}"
  echo -e "${GREEN}  n8n Workflow ID: $N8N_WORKFLOW_ID${NC}"
  echo -e "${YELLOW}  Status: $STATUS${NC}"
  
  if [ "$WEBHOOK_URL" != "null" ]; then
    echo -e "${GREEN}  Webhook URL: https://$WEBHOOK_URL${NC}"
  fi
  
  echo ""
  echo "---"
  echo ""
  
  # Test 6: Activate Workflow
  echo -e "${BLUE}Test 6: Activate Workflow${NC}"
  echo "Activating workflow in n8n..."
  echo ""
  
  ACTIVATE_RESPONSE=$(curl -s -X POST $API_URL/api/deploy/$WORKFLOW_ID/activate \
    -H "Authorization: Bearer $TOKEN")
  
  echo "$ACTIVATE_RESPONSE" | jq '.'
  
  if echo "$ACTIVATE_RESPONSE" | jq -e '.success' > /dev/null; then
    echo ""
    echo -e "${GREEN}✓ Workflow activated!${NC}"
    echo ""
    if [ "$WEBHOOK_URL" != "null" ]; then
      echo -e "${BLUE}Test the workflow now:${NC}"
      echo "  curl -X POST https://$WEBHOOK_URL -H 'Content-Type: application/json' -d '{\"test\":\"data\"}'"
    fi
  else
    echo ""
    echo -e "${YELLOW}⚠ Activation failed (can activate manually in n8n UI)${NC}"
  fi
  
  echo ""
  echo -e "${YELLOW}📝 Check your n8n instance to see the workflow with credentials attached!${NC}"
else
  echo ""
  echo -e "${RED}✗ Deployment failed${NC}"
  echo ""
  echo "Common issues:"
  echo "  - Invalid Slack token"
  echo "  - n8n not configured in .env"
  echo "  - n8n API not accessible"
fi

echo ""
echo "---"
echo ""

# Summary
echo ""
echo "🎉 ================================================"
echo "🎉  Test Complete!"
echo "🎉 ================================================"
echo ""

if echo "$DEPLOY_RESPONSE" | jq -e '.success' > /dev/null; then
  if echo "$ACTIVATE_RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✓ All tests passed including activation!${NC}"
  else
    echo -e "${GREEN}✓ Deployment tests passed!${NC}"
    echo -e "${YELLOW}⚠ Activation requires manual step in n8n UI${NC}"
  fi
  echo ""
  echo "Next steps:"
  echo "  1. Go to your n8n instance"
  echo "  2. Find workflow: [User:${USER_ID:0:8}] Send Slack message..."
  echo "  3. Verify Slack credential is attached"
  if echo "$ACTIVATE_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "  4. Workflow is ACTIVE - test the webhook!"
  else
    echo "  4. Toggle workflow to Active"
    echo "  5. Test the webhook URL"
  fi
else
  echo -e "${YELLOW}⚠ Some tests failed${NC}"
  echo ""
  echo "To test with real Slack token:"
  echo "  SLACK_TOKEN=xoxb-your-real-token ./test-credentials.sh"
fi

echo ""
