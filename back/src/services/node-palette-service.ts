import { INTEGRATIONS } from '../config/integrations';
import { N8nMCPClient } from './n8n-mcp-client';

export interface NodeDefinition {
  name: string;
  displayName: string;
  type: string;
  category: string;
  description: string;
  icon: string;
  color: string;
  properties?: any;
  credentials?: string[];
  operations?: string[];
}

export interface CategorizedNodes {
  triggers: NodeDefinition[];
  actions: NodeDefinition[];
  logic: NodeDefinition[];
  ai: NodeDefinition[];
  database: NodeDefinition[];
  communication: NodeDefinition[];
}

/**
 * Node Palette Service - Hybrid node discovery
 * Uses static config for common nodes + MCP for advanced search
 */
export class NodePaletteService {
  private mcpClient: N8nMCPClient;
  private cachedNodes: NodeDefinition[] | null = null;
  private cacheTimestamp: number = 0;
  private cacheExpiry: number = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.mcpClient = new N8nMCPClient();
  }

  /**
   * Get all available nodes (cached)
   */
  async getAllNodes(): Promise<CategorizedNodes> {
    // Check cache
    if (this.cachedNodes && Date.now() - this.cacheTimestamp < this.cacheExpiry) {
      return this.categorizeNodes(this.cachedNodes);
    }

    // Build from static integrations config
    const staticNodes = this.getStaticNodes();
    
    // Add core N8N nodes that aren't in integrations
    const coreNodes = this.getCoreNodes();
    
    const allNodes = [...staticNodes, ...coreNodes];
    
    // Cache results
    this.cachedNodes = allNodes;
    this.cacheTimestamp = Date.now();
    
    return this.categorizeNodes(allNodes);
  }

  /**
   * Search nodes using MCP (for advanced/rare nodes)
   */
  async searchNodes(query: string): Promise<NodeDefinition[]> {
    if (!query || query.trim() === '') {
      // Return all cached nodes if no query
      const categorized = await this.getAllNodes();
      return [
        ...categorized.triggers,
        ...categorized.actions,
        ...categorized.logic,
        ...categorized.ai,
        ...categorized.database,
        ...categorized.communication,
      ];
    }

    try {
      // Search using MCP for dynamic discovery
      const mcpResults = await this.mcpClient.searchNodes(query, false);
      
      return mcpResults.map(node => ({
        name: node.nodeName,
        displayName: node.nodeName,
        type: node.nodeType,
        category: this.mapCategory(node.category),
        description: node.description,
        icon: this.getIconForCategory(node.category),
        color: this.getColorForCategory(node.category),
      }));
    } catch (error) {
      console.error('[NodePalette] MCP search failed:', error);
      // Fallback to static search
      const allNodes = await this.getAllNodes();
      const flattened = [
        ...allNodes.triggers,
        ...allNodes.actions,
        ...allNodes.logic,
        ...allNodes.ai,
        ...allNodes.database,
        ...allNodes.communication,
      ];
      
      return flattened.filter(node => 
        node.displayName.toLowerCase().includes(query.toLowerCase()) ||
        node.description.toLowerCase().includes(query.toLowerCase())
      );
    }
  }

  /**
   * Get node details (properties, credentials, operations)
   */
  async getNodeDetails(nodeType: string): Promise<any> {
    try {
      const details = await this.mcpClient.getNodeDetails(nodeType);
      return details;
    } catch (error) {
      console.error('[NodePalette] Failed to get node details:', error);
      return null;
    }
  }

  /**
   * Build nodes from static integrations config
   */
  private getStaticNodes(): NodeDefinition[] {
    return Object.values(INTEGRATIONS).map(integration => ({
      name: integration.name,
      displayName: integration.name,
      type: integration.n8nNodeType,
      category: this.mapCategory(integration.category),
      description: integration.ui.description,
      icon: integration.ui.icon,
      color: integration.ui.color,
      credentials: [integration.n8nCredentialType],
    }));
  }

  /**
   * Add core N8N nodes (triggers, logic, etc.)
   */
  private getCoreNodes(): NodeDefinition[] {
    return [
      // Triggers
      {
        name: 'Webhook',
        displayName: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        category: 'triggers',
        description: 'Receive HTTP requests to trigger workflows',
        icon: '🪝',
        color: '#3b82f6',
      },
      {
        name: 'Schedule',
        displayName: 'Schedule Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        category: 'triggers',
        description: 'Trigger workflow on a schedule (cron)',
        icon: '⏰',
        color: '#a855f7',
      },
      {
        name: 'Manual Trigger',
        displayName: 'Manual Trigger',
        type: 'n8n-nodes-base.manualTrigger',
        category: 'triggers',
        description: 'Manually trigger workflow execution',
        icon: '▶️',
        color: '#6366f1',
      },
      
      // Logic & Control Flow
      {
        name: 'IF',
        displayName: 'IF',
        type: 'n8n-nodes-base.if',
        category: 'logic',
        description: 'Conditional branching based on data',
        icon: '🔀',
        color: '#f59e0b',
      },
      {
        name: 'Switch',
        displayName: 'Switch',
        type: 'n8n-nodes-base.switch',
        category: 'logic',
        description: 'Route data based on multiple conditions',
        icon: '🔄',
        color: '#f59e0b',
      },
      {
        name: 'Merge',
        displayName: 'Merge',
        type: 'n8n-nodes-base.merge',
        category: 'logic',
        description: 'Merge data from multiple branches',
        icon: '🔗',
        color: '#10b981',
      },
      {
        name: 'Code',
        displayName: 'Code',
        type: 'n8n-nodes-base.code',
        category: 'logic',
        description: 'Run custom JavaScript code',
        icon: '💻',
        color: '#8b5cf6',
      },
      {
        name: 'Set',
        displayName: 'Set',
        type: 'n8n-nodes-base.set',
        category: 'logic',
        description: 'Set values for new or existing fields',
        icon: '📝',
        color: '#06b6d4',
      },
      {
        name: 'Wait',
        displayName: 'Wait',
        type: 'n8n-nodes-base.wait',
        category: 'logic',
        description: 'Pause workflow execution',
        icon: '⏸️',
        color: '#64748b',
      },
      {
        name: 'Loop Over Items',
        displayName: 'Loop Over Items',
        type: 'n8n-nodes-base.splitInBatches',
        category: 'logic',
        description: 'Loop through items in batches',
        icon: '🔁',
        color: '#f59e0b',
      },
      
      // Actions
      {
        name: 'HTTP Request',
        displayName: 'HTTP Request',
        type: 'n8n-nodes-base.httpRequest',
        category: 'actions',
        description: 'Make HTTP requests to any URL',
        icon: '🌐',
        color: '#f97316',
      },
      {
        name: 'Email Send',
        displayName: 'Send Email',
        type: 'n8n-nodes-base.emailSend',
        category: 'communication',
        description: 'Send emails via SMTP',
        icon: '📧',
        color: '#ea4335',
      },
      {
        name: 'Execute Workflow',
        displayName: 'Execute Workflow',
        type: 'n8n-nodes-base.executeWorkflow',
        category: 'logic',
        description: 'Execute another workflow',
        icon: '⚡',
        color: '#8b5cf6',
      },
    ];
  }

  /**
   * Categorize nodes into groups
   */
  private categorizeNodes(nodes: NodeDefinition[]): CategorizedNodes {
    return {
      triggers: nodes.filter(n => n.category === 'triggers'),
      actions: nodes.filter(n => n.category === 'actions'),
      logic: nodes.filter(n => n.category === 'logic'),
      ai: nodes.filter(n => n.category === 'ai'),
      database: nodes.filter(n => n.category === 'database'),
      communication: nodes.filter(n => n.category === 'communication'),
    };
  }

  /**
   * Map integration category to node category
   */
  private mapCategory(category: string): string {
    const mapping: Record<string, string> = {
      'communication': 'communication',
      'productivity': 'actions',
      'database': 'database',
      'marketing': 'actions',
      'development': 'actions',
      'crm': 'actions',
      'storage': 'actions',
      'ai': 'ai',
      'Core Nodes': 'logic',
      'Other': 'actions',
    };
    return mapping[category] || 'actions';
  }

  /**
   * Get icon for category
   */
  private getIconForCategory(category: string): string {
    const icons: Record<string, string> = {
      triggers: '⚡',
      actions: '⚙️',
      logic: '🔀',
      ai: '🤖',
      database: '🗄️',
      communication: '💬',
    };
    return icons[this.mapCategory(category)] || '📦';
  }

  /**
   * Get color for category
   */
  private getColorForCategory(category: string): string {
    const colors: Record<string, string> = {
      triggers: '#3b82f6',
      actions: '#f97316',
      logic: '#f59e0b',
      ai: '#8b5cf6',
      database: '#06b6d4',
      communication: '#10b981',
    };
    return colors[this.mapCategory(category)] || '#6b7280';
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cachedNodes = null;
    this.cacheTimestamp = 0;
  }
}
