#!/bin/bash

# Interactive Chat with AI Agent
# This script lets you chat with the AI and see workflow generation in real-time

API_URL="http://localhost:3001"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Store conversation history
CONVERSATION_FILE="/tmp/ai_chat_history.json"
echo '[]' > $CONVERSATION_FILE

clear
echo ""
echo "🤖 ================================================"
echo "🤖  AI Workflow Builder - Interactive Chat"
echo "🤖 ================================================"
echo ""
echo -e "${CYAN}Type your messages to chat with the AI assistant.${NC}"
echo -e "${CYAN}Type 'exit' or 'quit' to end the conversation.${NC}"
echo -e "${CYAN}Type 'clear' to reset conversation history.${NC}"
echo -e "${CYAN}Type 'workflows' to see generated workflows.${NC}"
echo ""
echo "---"
echo ""

# Function to send message and get response
send_message() {
    local message="$1"
    
    # Read current conversation history
    local history=$(cat $CONVERSATION_FILE)
    
    # Prepare request payload
    local payload=$(jq -n \
        --arg msg "$message" \
        --argjson hist "$history" \
        '{message: $msg, conversationHistory: $hist}')
    
    # Send request
    echo -e "${YELLOW}🤔 AI is thinking...${NC}"
    echo ""
    
    local response=$(curl -s -X POST $API_URL/api/chat \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    # Check if request was successful
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Error: Could not connect to backend${NC}"
        echo -e "${RED}Make sure the server is running on $API_URL${NC}"
        return 1
    fi
    
    # Extract AI message
    local ai_message=$(echo "$response" | jq -r '.data.message // "Error: No response"')
    local workflow=$(echo "$response" | jq '.data.workflow // null')
    local suggestions=$(echo "$response" | jq -r '.data.suggestions // [] | join(", ")')
    
    # Display AI response
    echo -e "${GREEN}🤖 AI Assistant:${NC}"
    echo ""
    echo "$ai_message" | fold -w 80 -s
    echo ""
    
    # Show workflow if generated
    if [ "$workflow" != "null" ]; then
        echo ""
        echo -e "${MAGENTA}✨ Workflow Generated!${NC}"
        echo ""
        
        local workflow_name=$(echo "$workflow" | jq -r '.name')
        local node_count=$(echo "$workflow" | jq '.nodes | length')
        
        echo -e "${CYAN}📋 Name:${NC} $workflow_name"
        echo -e "${CYAN}🔧 Nodes:${NC} $node_count"
        echo ""
        
        # Show nodes
        echo -e "${CYAN}Nodes:${NC}"
        echo "$workflow" | jq -r '.nodes[] | "  • \(.name) (\(.type | split(".") | .[-1]))"'
        echo ""
        
        # Show connections
        echo -e "${CYAN}Flow:${NC}"
        echo "$workflow" | jq -r '
            .connections | to_entries[] | 
            .key as $source | 
            .value.main[0][] | 
            "  \($source) → \(.node)"
        '
        echo ""
        
        # Option to see full JSON
        echo -e "${YELLOW}💾 Full workflow JSON saved to /tmp/last_workflow.json${NC}"
        echo "$workflow" | jq '.' > /tmp/last_workflow.json
        echo ""
    fi
    
    # Show suggestions
    if [ ! -z "$suggestions" ] && [ "$suggestions" != "" ]; then
        echo -e "${BLUE}💡 Suggestions:${NC}"
        echo "$suggestions" | tr ',' '\n' | sed 's/^/  • /'
        echo ""
    fi
    
    # Update conversation history
    local new_history=$(echo "$history" | jq \
        --arg user_msg "$message" \
        --arg ai_msg "$ai_message" \
        '. + [{role: "user", content: $user_msg}, {role: "assistant", content: $ai_msg}]')
    
    echo "$new_history" > $CONVERSATION_FILE
    
    echo "---"
    echo ""
}

# Function to show all workflows
show_workflows() {
    echo -e "${CYAN}📚 Fetching workflows...${NC}"
    echo ""
    
    local workflows=$(curl -s $API_URL/api/workflows)
    local count=$(echo "$workflows" | jq '.data | length')
    
    if [ "$count" -eq 0 ]; then
        echo "No workflows found."
    else
        echo "Found $count workflow(s):"
        echo ""
        echo "$workflows" | jq -r '.data[] | "  • \(.name) (ID: \(.id))"'
    fi
    
    echo ""
    echo "---"
    echo ""
}

# Main chat loop
while true; do
    # Prompt for user input
    echo -ne "${BLUE}You:${NC} "
    read user_input
    
    # Check for special commands
    case "$user_input" in
        exit|quit)
            echo ""
            echo "👋 Goodbye! Thanks for chatting!"
            echo ""
            rm -f $CONVERSATION_FILE
            exit 0
            ;;
        clear)
            echo '[]' > $CONVERSATION_FILE
            clear
            echo ""
            echo "🔄 Conversation history cleared!"
            echo ""
            echo "---"
            echo ""
            continue
            ;;
        workflows)
            show_workflows
            continue
            ;;
        "")
            continue
            ;;
    esac
    
    # Send message to AI
    echo ""
    send_message "$user_input"
done
