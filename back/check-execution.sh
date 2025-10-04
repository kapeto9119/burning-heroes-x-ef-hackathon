#!/bin/bash

# Check n8n workflow execution details

if [ -z "$1" ]; then
  echo "Usage: ./check-execution.sh <workflow-id>"
  echo "Example: ./check-execution.sh ALJPeLjmgxbtpCN5"
  exit 1
fi

WORKFLOW_ID=$1
N8N_API_KEY=$(grep N8N_API_KEY .env | cut -d '=' -f2)

echo "🔍 Fetching executions for workflow: $WORKFLOW_ID"
echo ""

curl -s -X GET "https://n8n-production-e2d3.up.railway.app/api/v1/executions?workflowId=$WORKFLOW_ID&limit=5" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '.data[] | {
    id,
    status: .status,
    startedAt: .startedAt,
    stoppedAt: .stoppedAt,
    error: .data.resultData.error,
    nodeErrors: [.data.resultData.runData | to_entries[] | select(.value[0].error != null) | {
      node: .key,
      error: .value[0].error.message
    }]
  }'
