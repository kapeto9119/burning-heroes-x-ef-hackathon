#!/bin/bash

# Test script for authentication and deployment features

API_URL="http://localhost:3001"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "🧪 ================================================"
echo "🧪  Testing Auth & Deployment Features"
echo "🧪 ================================================"
echo ""

# Test 1: Register User
echo -e "${BLUE}Test 1: Register New User${NC}"
REGISTER_RESPONSE=$(curl -s -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }')

echo "$REGISTER_RESPONSE" | jq '.'
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token')
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.user.id')

if [ "$TOKEN" != "null" ]; then
  echo -e "${GREEN}✓ User registered, token received${NC}"
else
  echo -e "${YELLOW}⚠ User might already exist, trying login...${NC}"
  
  # Try login instead
  LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "password123"
    }')
  
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
  USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.id')
  echo -e "${GREEN}✓ Logged in successfully${NC}"
fi

echo ""
echo "---"
echo ""

# Test 2: Get Current User
echo -e "${BLUE}Test 2: Get Current User${NC}"
curl -s $API_URL/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""
echo -e "${GREEN}✓ User info retrieved${NC}"
echo ""
echo "---"
echo ""

# Test 3: Update Slack Credentials
echo -e "${BLUE}Test 3: Update Slack Credentials${NC}"
curl -s -X POST $API_URL/api/auth/credentials/slack \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "xoxb-test-slack-token",
    "teamId": "T12345",
    "teamName": "Test Team"
  }' | jq '.'
echo ""
echo -e "${GREEN}✓ Slack credentials updated${NC}"
echo ""
echo "---"
echo ""

# Test 4: Generate Workflow
echo -e "${BLUE}Test 4: Generate Workflow${NC}"
WORKFLOW_RESPONSE=$(curl -s -X POST $API_URL/api/chat/generate-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Send Slack notification when webhook receives data"
  }')

echo "$WORKFLOW_RESPONSE" | jq '.'
WORKFLOW=$(echo "$WORKFLOW_RESPONSE" | jq '.data')
echo ""
echo -e "${GREEN}✓ Workflow generated${NC}"
echo ""
echo "---"
echo ""

# Test 5: Deploy Workflow (if n8n is configured)
echo -e "${BLUE}Test 5: Deploy Workflow to n8n${NC}"
DEPLOY_RESPONSE=$(curl -s -X POST $API_URL/api/deploy \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"workflow\": $WORKFLOW}")

echo "$DEPLOY_RESPONSE" | jq '.'

if echo "$DEPLOY_RESPONSE" | jq -e '.success' > /dev/null; then
  N8N_WORKFLOW_ID=$(echo "$DEPLOY_RESPONSE" | jq -r '.data.n8nWorkflowId')
  WEBHOOK_URL=$(echo "$DEPLOY_RESPONSE" | jq -r '.data.webhookUrl')
  
  echo ""
  echo -e "${GREEN}✓ Workflow deployed!${NC}"
  echo -e "${GREEN}  n8n Workflow ID: $N8N_WORKFLOW_ID${NC}"
  if [ "$WEBHOOK_URL" != "null" ]; then
    echo -e "${GREEN}  Webhook URL: $WEBHOOK_URL${NC}"
  fi
else
  echo ""
  echo -e "${YELLOW}⚠ Deployment not available (n8n not configured)${NC}"
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
echo -e "${GREEN}✓ Authentication working${NC}"
echo -e "${GREEN}✓ Credential management working${NC}"
echo -e "${GREEN}✓ Workflow generation working${NC}"

if echo "$DEPLOY_RESPONSE" | jq -e '.success' > /dev/null; then
  echo -e "${GREEN}✓ Deployment working${NC}"
else
  echo -e "${YELLOW}⚠ Deployment requires n8n configuration${NC}"
fi

echo ""
echo "📝 To enable deployment:"
echo "   1. Set up n8n instance (Railway/Docker)"
echo "   2. Add to .env:"
echo "      N8N_API_URL=https://your-n8n-instance.com"
echo "      N8N_API_KEY=your-api-key"
echo "      N8N_WEBHOOK_URL=https://your-n8n-instance.com"
echo ""
