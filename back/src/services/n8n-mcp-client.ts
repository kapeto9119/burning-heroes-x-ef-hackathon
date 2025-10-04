import { MCPSearchResult, MCPNodeDetails } from '../types';

/**
 * n8n-MCP Client Wrapper
 * 
 * This is a simplified wrapper for the n8n-MCP server.
 * For the hackathon, we'll use the MCP server running via npx.
 * 
 * In production, you'd use the @modelcontextprotocol/sdk to communicate
 * with the MCP server via stdio or SSE.
 */
export class N8nMCPClient {
  private mcpServerUrl?: string;

  constructor(mcpServerUrl?: string) {
    this.mcpServerUrl = mcpServerUrl;
  }

  /**
   * Search for n8n nodes by query
   */
  async searchNodes(query: string, includeExamples: boolean = true): Promise<MCPSearchResult[]> {
    try {
      // For hackathon: Return mock data
      // In production: Call MCP server's search_nodes tool
      
      const mockResults: MCPSearchResult[] = [
        {
          nodeName: 'Slack',
          nodeType: 'n8n-nodes-base.slack',
          description: 'Send messages and interact with Slack',
          category: 'Communication',
          examples: includeExamples ? [
            { operation: 'postMessage', channel: '#general', text: 'Hello World' }
          ] : undefined
        },
        {
          nodeName: 'Webhook',
          nodeType: 'n8n-nodes-base.webhook',
          description: 'Receive HTTP requests',
          category: 'Core Nodes',
          examples: includeExamples ? [
            { method: 'POST', path: '/webhook' }
          ] : undefined
        },
        {
          nodeName: 'HTTP Request',
          nodeType: 'n8n-nodes-base.httpRequest',
          description: 'Make HTTP requests to any URL',
          category: 'Core Nodes'
        }
      ];

      // Filter by query
      return mockResults.filter(node => 
        node.nodeName.toLowerCase().includes(query.toLowerCase()) ||
        node.description.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('MCP search error:', error);
      return [];
    }
  }

  /**
   * Get detailed information about a specific node
   */
  async getNodeDetails(nodeType: string): Promise<MCPNodeDetails | null> {
    try {
      // For hackathon: Return mock data
      // In production: Call MCP server's get_node_essentials tool
      
      const mockDetails: Record<string, MCPNodeDetails> = {
        'n8n-nodes-base.slack': {
          name: 'Slack',
          type: 'n8n-nodes-base.slack',
          properties: {
            resource: { type: 'string', options: ['message', 'channel', 'user'] },
            operation: { type: 'string', options: ['post', 'update', 'delete'] },
            channel: { type: 'string', required: true },
            text: { type: 'string', required: true }
          },
          operations: ['postMessage', 'updateMessage', 'deleteMessage'],
          credentials: ['slackApi']
        },
        'n8n-nodes-base.webhook': {
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          properties: {
            httpMethod: { type: 'string', options: ['GET', 'POST', 'PUT', 'DELETE'] },
            path: { type: 'string', required: true },
            responseMode: { type: 'string', options: ['onReceived', 'lastNode'] }
          },
          operations: ['receive'],
          credentials: []
        }
      };

      return mockDetails[nodeType] || null;
    } catch (error) {
      console.error('MCP node details error:', error);
      return null;
    }
  }

  /**
   * Search for workflow templates
   */
  async searchTemplates(query: string): Promise<any[]> {
    try {
      // For hackathon: Return mock templates
      // In production: Call MCP server's search_templates_by_metadata tool
      
      const mockTemplates = [
        {
          id: '2414',
          name: 'Slack Notification on Form Submit',
          description: 'Send Slack notifications when a form is submitted',
          author: 'David Ashby',
          url: 'https://n8n.io/workflows/2414',
          nodes: ['Webhook', 'Slack'],
          complexity: 'simple'
        },
        {
          id: '1523',
          name: 'Email to Slack Bridge',
          description: 'Forward emails to Slack channel',
          author: 'n8n Team',
          url: 'https://n8n.io/workflows/1523',
          nodes: ['Email Trigger', 'Slack'],
          complexity: 'simple'
        }
      ];

      return mockTemplates.filter(template =>
        template.name.toLowerCase().includes(query.toLowerCase()) ||
        template.description.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('MCP template search error:', error);
      return [];
    }
  }

  /**
   * Validate a workflow structure
   */
  async validateWorkflow(workflow: any): Promise<{ valid: boolean; errors: string[] }> {
    try {
      // For hackathon: Basic validation
      // In production: Call MCP server's validate_workflow tool
      
      const errors: string[] = [];

      if (!workflow.nodes || workflow.nodes.length === 0) {
        errors.push('Workflow must have at least one node');
      }

      if (!workflow.name || workflow.name.trim() === '') {
        errors.push('Workflow must have a name');
      }

      // Check for required node properties
      workflow.nodes?.forEach((node: any, index: number) => {
        if (!node.type) {
          errors.push(`Node ${index + 1} is missing type`);
        }
        if (!node.name) {
          errors.push(`Node ${index + 1} is missing name`);
        }
      });

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('Workflow validation error:', error);
      return {
        valid: false,
        errors: ['Validation failed']
      };
    }
  }
}
