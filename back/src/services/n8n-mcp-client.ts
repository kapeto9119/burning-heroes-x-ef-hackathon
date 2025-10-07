import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { MCPSearchResult, MCPNodeDetails } from '../types';
import { spawn } from 'child_process';

/**
 * Real n8n-MCP Client using Model Context Protocol SDK
 * 
 * Communicates with the n8n-MCP server (czlonkowski/n8n-mcp) to:
 * - Search for nodes with real-world examples from 2,500+ templates
 * - Get node essentials (properties, credentials, examples)
 * - Search workflow templates
 * - Validate workflows
 */
export class N8nMCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected: boolean = false;
  private useMockData: boolean = false;
  private connectionAttempts: number = 0;
  private maxRetries: number = 2;
  private retryDelay: number = 1000; // 1 second
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    // Will initialize on first use
  }

  /**
   * Initialize connection to MCP server with retry logic
   */
  private async ensureConnected(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    // If already failed max retries, use mock data
    if (this.useMockData) {
      return;
    }

    // If connection is in progress, wait for it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Start new connection attempt
    this.connectionPromise = this.connectWithRetry();
    await this.connectionPromise;
    this.connectionPromise = null;
  }

  private async connectWithRetry(): Promise<void> {
    while (this.connectionAttempts < this.maxRetries) {
      try {
        this.connectionAttempts++;
        const attemptMsg = this.connectionAttempts > 1 ? ` (attempt ${this.connectionAttempts}/${this.maxRetries})` : '';
        console.log(`[MCP Client] Connecting to n8n-MCP server...${attemptMsg}`);
        
        // Create transport using npx to run the MCP server
        this.transport = new StdioClientTransport({
          command: 'npx',
          args: ['-y', 'n8n-mcp'],
          env: process.env as Record<string, string>,
        });

        // Create MCP client
        this.client = new Client({
          name: 'burning-heroes-workflow-builder',
          version: '1.0.0',
        }, {
          capabilities: {}
        });

        // Connect to server with timeout
        await Promise.race([
          this.client.connect(this.transport),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 10000)
          )
        ]);
        
        this.isConnected = true;
        console.log('[MCP Client] ✅ Connected to n8n-MCP server');
        return;
      } catch (error) {
        console.error(`[MCP Client] ❌ Connection attempt ${this.connectionAttempts} failed:`, error);
        
        // Clean up failed connection
        if (this.client) {
          try { await this.client.close(); } catch {}
          this.client = null;
        }
        this.transport = null;
        
        // Wait before retry (except on last attempt)
        if (this.connectionAttempts < this.maxRetries) {
          console.log(`[MCP Client] Retrying in ${this.retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }

    // All retries failed
    console.log('[MCP Client] All connection attempts failed, falling back to mock data');
    this.useMockData = true;
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        this.isConnected = false;
        console.log('[MCP Client] Disconnected');
      } catch (error) {
        console.error('[MCP Client] Error disconnecting:', error);
      }
    }
  }

  /**
   * Search for n8n nodes by query with real-world examples
   */
  async searchNodes(query: string, includeExamples: boolean = true): Promise<MCPSearchResult[]> {
    await this.ensureConnected();

    if (this.useMockData) {
      return this.getMockSearchResults(query, includeExamples);
    }

    try {
      // Validate query is not empty
      if (!query || query.trim() === '') {
        console.warn('[MCP Client] Empty query provided, using mock data');
        return this.getMockSearchResults('', includeExamples);
      }

      console.log(`[MCP Client] Searching nodes: "${query}" (includeExamples: ${includeExamples})`);
      
      const result = await this.client!.callTool({
        name: 'search_nodes',
        arguments: {
          query,
          includeExamples,
        }
      });

      if (result.content && Array.isArray(result.content)) {
        const textContent = result.content.find(c => c.type === 'text');
        if (textContent && 'text' in textContent) {
          try {
            const parsed = JSON.parse(textContent.text);
            const count = Array.isArray(parsed) ? parsed.length : (parsed.nodes?.length || 1);
            console.log(`[MCP Client] Found ${count} nodes`);
            console.log(`[MCP Client] Data type:`, typeof parsed, Array.isArray(parsed) ? 'array' : 'object');
            console.log(`[MCP Client] Raw data structure:`, JSON.stringify(parsed).substring(0, 200));
            const results = this.mapToSearchResults(parsed);
            console.log(`[MCP Client] Mapped to ${results.length} search results`);
            return results;
          } catch (parseError) {
            console.error('[MCP Client] JSON parse error:', parseError);
            console.error('[MCP Client] Raw text:', textContent.text.substring(0, 500));
            return this.getMockSearchResults(query, includeExamples);
          }
        }
      }

      console.warn('[MCP Client] No valid content in MCP response');
      return this.getMockSearchResults(query, includeExamples);
    } catch (error) {
      console.error('[MCP Client] Search error:', error);
      return this.getMockSearchResults(query, includeExamples);
    }
  }

  /**
   * Get mock search results (fallback)
   */
  private getMockSearchResults(query: string, includeExamples: boolean): MCPSearchResult[] {
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
      },
      {
        nodeName: 'Gmail',
        nodeType: 'n8n-nodes-base.gmail',
        description: 'Send and receive emails via Gmail',
        category: 'Communication'
      },
      {
        nodeName: 'Google Sheets',
        nodeType: 'n8n-nodes-base.googleSheets',
        description: 'Read and write data to Google Sheets',
        category: 'Productivity'
      },
      {
        nodeName: 'Postgres',
        nodeType: 'n8n-nodes-base.postgres',
        description: 'Execute SQL queries on PostgreSQL databases',
        category: 'Database'
      }
    ];

    return mockResults.filter(node => 
      node.nodeName.toLowerCase().includes(query.toLowerCase()) ||
      node.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * Map MCP response to our search result format
   */
  private mapToSearchResults(mcpData: any): MCPSearchResult[] {
    // Handle different response formats
    if (!mcpData) {
      console.warn('[MCP Client] No data received');
      return [];
    }

    // MCP format: { query: "...", results: [...] }
    if (mcpData.results && Array.isArray(mcpData.results)) {
      return mcpData.results.map((node: any) => ({
        nodeName: node.displayName || node.name,
        nodeType: node.workflowNodeType || node.nodeType,
        description: node.description || '',
        category: node.category || 'Other',
        examples: node.examples || undefined
      }));
    }

    // If it's already an array, use it
    if (Array.isArray(mcpData)) {
      return mcpData.map(node => ({
        nodeName: node.displayName || node.name,
        nodeType: node.workflowNodeType || node.nodeType || node.name,
        description: node.description || '',
        category: node.category || 'Other',
        examples: node.examples || undefined
      }));
    }

    // If it's an object with a nodes array
    if (mcpData.nodes && Array.isArray(mcpData.nodes)) {
      return mcpData.nodes.map((node: any) => ({
        nodeName: node.displayName || node.name,
        nodeType: node.workflowNodeType || node.nodeType || node.name,
        description: node.description || '',
        category: node.category || 'Other',
        examples: node.examples || undefined
      }));
    }

    // If it's a single node object
    if (mcpData.name || mcpData.displayName) {
      return [{
        nodeName: mcpData.displayName || mcpData.name,
        nodeType: mcpData.workflowNodeType || mcpData.nodeType || mcpData.name,
        description: mcpData.description || '',
        category: mcpData.category || 'Other',
        examples: mcpData.examples || undefined
      }];
    }

    console.warn('[MCP Client] Unexpected data format:', typeof mcpData);
    return [];
  }

  /**
   * Get essential node information (properties, credentials, examples)
   */
  async getNodeDetails(nodeType: string): Promise<MCPNodeDetails | null> {
    await this.ensureConnected();

    if (this.useMockData) {
      return this.getMockNodeDetails(nodeType);
    }

    try {
      console.log(`[MCP Client] Getting node essentials: ${nodeType}`);
      
      const result = await this.client!.callTool({
        name: 'get_node_essentials',
        arguments: {
          nodeType,
          includeExamples: true,
        }
      });

      console.log(`[MCP Client] Raw result for ${nodeType}:`, JSON.stringify(result, null, 2));

      if (result.content && Array.isArray(result.content)) {
        const textContent = result.content.find(c => c.type === 'text');
        if (textContent && 'text' in textContent) {
          const parsed = JSON.parse(textContent.text);
          console.log(`[MCP Client] Parsed data for ${nodeType}:`, JSON.stringify(parsed, null, 2));
          
          const mapped = this.mapToNodeDetails(parsed);
          console.log(`[MCP Client] Mapped node details for ${nodeType}:`, JSON.stringify(mapped, null, 2));
          
          return mapped;
        }
      }

      console.warn(`[MCP Client] No valid content found for ${nodeType}`);
      return null;
    } catch (error) {
      console.error('[MCP Client] Node details error:', error);
      return this.getMockNodeDetails(nodeType);
    }
  }

  /**
   * Get mock node details (fallback)
   */
  private getMockNodeDetails(nodeType: string): MCPNodeDetails | null {
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
      },
      'n8n-nodes-base.gmail': {
        name: 'Gmail',
        type: 'n8n-nodes-base.gmail',
        properties: {
          resource: { type: 'string', options: ['message', 'draft', 'label'] },
          operation: { type: 'string', options: ['send', 'get', 'getAll'] },
          to: { type: 'string', required: true },
          subject: { type: 'string', required: true },
          message: { type: 'string', required: true }
        },
        operations: ['sendMessage', 'getMessage'],
        credentials: ['gmailOAuth2']
      },
      'n8n-nodes-base.postgres': {
        name: 'Postgres',
        type: 'n8n-nodes-base.postgres',
        properties: {
          operation: { type: 'string', options: ['executeQuery', 'insert', 'update', 'delete'] },
          query: { type: 'string', required: true }
        },
        operations: ['executeQuery', 'insert', 'update'],
        credentials: ['postgres']
      }
    };

    return mockDetails[nodeType] || null;
  }

  /**
   * Map MCP node data to our details format
   */
  private mapToNodeDetails(mcpData: any): MCPNodeDetails {
    return {
      name: mcpData.displayName || mcpData.name,
      type: mcpData.name,
      properties: mcpData.properties || {},
      operations: mcpData.operations || [],
      credentials: mcpData.credentials || [],
      examples: mcpData.examples || undefined
    };
  }

  /**
   * Search for workflow templates from 2,500+ community templates
   */
  async searchTemplates(query: string, limit: number = 10): Promise<any[]> {
    await this.ensureConnected();

    if (this.useMockData) {
      return this.getMockTemplates(query);
    }

    try {
      console.log(`[MCP Client] Searching templates: "${query}"`);
      
      const result = await this.client!.callTool({
        name: 'search_templates',
        arguments: {
          query,
          limit,
        }
      });

      if (result.content && Array.isArray(result.content)) {
        const textContent = result.content.find(c => c.type === 'text');
        if (textContent && 'text' in textContent) {
          const parsed = JSON.parse(textContent.text);
          console.log(`[MCP Client] Found ${parsed.length} templates`);
          return parsed;
        }
      }

      return [];
    } catch (error) {
      console.error('[MCP Client] Template search error:', error);
      return this.getMockTemplates(query);
    }
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: string): Promise<any | null> {
    await this.ensureConnected();

    if (this.useMockData) {
      return null;
    }

    try {
      console.log(`[MCP Client] Getting template: ${templateId}`);
      
      const result = await this.client!.callTool({
        name: 'get_template',
        arguments: {
          templateId,
        }
      });

      if (result.content && Array.isArray(result.content)) {
        const textContent = result.content.find(c => c.type === 'text');
        if (textContent && 'text' in textContent) {
          return JSON.parse(textContent.text);
        }
      }

      return null;
    } catch (error) {
      console.error('[MCP Client] Get template error:', error);
      return null;
    }
  }

  /**
   * Get mock templates (fallback)
   */
  private getMockTemplates(query: string): any[] {
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
      },
      {
        id: '3891',
        name: 'Database to Google Sheets Sync',
        description: 'Sync PostgreSQL data to Google Sheets on schedule',
        author: 'Community',
        url: 'https://n8n.io/workflows/3891',
        nodes: ['Schedule', 'Postgres', 'Google Sheets'],
        complexity: 'medium'
      }
    ];

    return mockTemplates.filter(template =>
      template.name.toLowerCase().includes(query.toLowerCase()) ||
      template.description.toLowerCase().includes(query.toLowerCase())
    );
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
