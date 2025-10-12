"""Orchestrator agent - routes conversations to specialist agents"""

from typing import Optional
from .prompts import ORCHESTRATOR_PROMPT


class OrchestratorAgent:
    """Routes user requests to appropriate specialist agents"""
    
    def __init__(self):
        self.system_prompt = ORCHESTRATOR_PROMPT
        self.current_agent: Optional[str] = None
    
    def analyze_intent(self, user_message: str) -> Optional[str]:
        """
        Analyze user message and determine which agent to route to.
        Returns: 'sales', 'support', 'operations', 'technical', or None
        """
        message_lower = user_message.lower()
        
        # Sales keywords
        sales_keywords = ['crm', 'lead', 'sales', 'pipeline', 'deal', 'customer', 
                         'hubspot', 'salesforce', 'pipedrive', 'prospect']
        
        # Support keywords
        support_keywords = ['ticket', 'support', 'helpdesk', 'zendesk', 'intercom',
                           'customer service', 'escalate', 'sla']
        
        # Operations keywords
        ops_keywords = ['data', 'sync', 'report', 'schedule', 'backup', 'database',
                       'analytics', 'daily', 'weekly', 'monthly']
        
        # Technical keywords
        tech_keywords = ['api', 'webhook', 'http', 'rest', 'endpoint', 'database',
                        'postgres', 'mysql', 'integration', 'authentication']
        
        # Count keyword matches
        sales_score = sum(1 for kw in sales_keywords if kw in message_lower)
        support_score = sum(1 for kw in support_keywords if kw in message_lower)
        ops_score = sum(1 for kw in ops_keywords if kw in message_lower)
        tech_score = sum(1 for kw in tech_keywords if kw in message_lower)
        
        # Return highest scoring domain
        scores = {
            'sales': sales_score,
            'support': support_score,
            'operations': ops_score,
            'technical': tech_score
        }
        
        max_score = max(scores.values())
        if max_score > 0:
            return max(scores, key=scores.get)
        
        return None
    
    def route_to_agent(self, domain: str) -> str:
        """Get routing message for domain"""
        messages = {
            'sales': "Let me connect you with our Sales Automation specialist who can help you with that.",
            'support': "Let me connect you with our Customer Support specialist who can help you with that.",
            'operations': "Let me connect you with our Operations specialist who can help you with that.",
            'technical': "Let me connect you with our Technical Integration specialist who can help you with that."
        }
        self.current_agent = domain
        return messages.get(domain, "Let me find the right specialist for you.")
