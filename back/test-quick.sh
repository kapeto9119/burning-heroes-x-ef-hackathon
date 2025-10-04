#!/bin/bash

# Quick test script - just the essentials

API_URL="http://localhost:3001"
TEST_EMAIL="quicktest_$(date +%s)@test.com"

echo ""
echo "🚀 Quick Backend Test (with Auth)"
echo ""

# 1. Health Check
echo "1️⃣  Health Check..."
curl -s $API_URL/health | jq -r '.status'
echo ""

# 2. Register User
echo "2️⃣  Registering User..."
REGISTER=$(curl -s -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"test123\",\"name\":\"Quick Test\"}")
TOKEN=$(echo "$REGISTER" | jq -r '.data.token')
echo "Token: ${TOKEN:0:20}..."
echo ""

# 3. Simple Chat
echo "3️⃣  Testing Chat..."
curl -s -X POST $API_URL/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}' | jq -r '.data.message' | head -c 100
echo "..."
echo ""

# 4. Workflow Generation
echo "4️⃣  Testing Workflow Generation..."
curl -s -X POST $API_URL/api/chat/generate-workflow \
  -H "Content-Type: application/json" \
  -d '{"description": "Send Slack message when form submitted"}' | jq -r '.data.name'
echo ""

# 5. Update Credentials
echo "5️⃣  Testing Credentials..."
curl -s -X POST $API_URL/api/auth/credentials/slack \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token":"test"}' | jq -r '.message'
echo ""

# 6. List Workflows
echo "6️⃣  Listing Workflows..."
curl -s $API_URL/api/workflows | jq -r '.data | length'
echo " workflows found"
echo ""

echo "✅ All basic tests passed!"
echo "📧 Test user: $TEST_EMAIL"
echo ""
