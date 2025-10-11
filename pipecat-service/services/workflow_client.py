"""Client for calling backend workflow generation API"""

import aiohttp
from typing import Dict, Any, Optional
import config


class WorkflowClient:
    """Handles communication with backend workflow generation API"""
    
    def __init__(self):
        self.base_url = config.BACKEND_API_URL
    
    async def generate_workflow(
        self,
        description: str,
        trigger: Optional[str] = None,
        services: Optional[list] = None,
        schedule: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Call backend to generate workflow
        
        Args:
            description: Natural language workflow description
            trigger: Trigger type (webhook, schedule, manual)
            services: List of services to use
            schedule: Schedule string if trigger is schedule
            
        Returns:
            Generated workflow data
        """
        url = f"{self.base_url}/api/pipecat/generate-workflow"
        
        payload = {
            "description": description,
        }
        
        if trigger:
            payload["trigger"] = trigger
        if services:
            payload["services"] = services
        if schedule:
            payload["schedule"] = schedule
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data
                    else:
                        error_text = await response.text()
                        return {
                            "success": False,
                            "error": f"Backend error: {error_text}"
                        }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to connect to backend: {str(e)}"
            }
    
    async def search_nodes(
        self,
        query: str,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Search n8n nodes and integrations
        
        Args:
            query: Search query (e.g., "Salesforce", "email triggers")
            limit: Maximum number of results
            
        Returns:
            Search results with node information
        """
        url = f"{self.base_url}/api/pipecat/search-nodes"
        
        payload = {
            "query": query,
            "limit": limit
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data
                    else:
                        error_text = await response.text()
                        return {
                            "success": False,
                            "error": f"Backend error: {error_text}"
                        }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to connect to backend: {str(e)}"
            }
