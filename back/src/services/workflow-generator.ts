import { N8nWorkflow, N8nNode, N8nConnection } from '../types';
import { N8nMCPClient } from './n8n-mcp-client';
import { AIService } from './ai-service';

export class WorkflowGenerator {
  private mcpClient: N8nMCPClient;
  private aiService: AIService;

  constructor(mcpClient: N8nMCPClient, aiService: AIService) {
    this.mcpClient = mcpClient;
    this.aiService = aiService;
  }

  /**
   * Generate a complete n8n workflow from a natural language description
   */
  async generateFromDescription(description: string): Promise<N8nWorkflow> {
    try {
      // Step 1: Search for relevant templates
      const templates = await this.mcpClient.searchTemplates(description);
      
      // Step 2: Search for relevant nodes
      const nodes = await this.mcpClient.searchNodes(description);
      
      // Step 3: Use AI to generate workflow structure
      const workflowPlan = await this.aiService.generateWorkflowFromDescription(
        description,
        { templates: templates.slice(0, 3), nodes: nodes.slice(0, 5) }
      );

      // Step 4: Convert AI plan to n8n workflow format
      const workflow = await this.convertPlanToWorkflow(workflowPlan, description);

      // Step 5: Validate the workflow
      const validation = await this.mcpClient.validateWorkflow(workflow);
      if (!validation.valid) {
        console.warn('Workflow validation warnings:', validation.errors);
      }

      return workflow;
    } catch (error) {
      console.error('Workflow generation error:', error);
      throw new Error('Failed to generate workflow');
    }
  }

  /**
   * Convert AI-generated plan to n8n workflow format
   */
  private async convertPlanToWorkflow(plan: any, description: string): Promise<N8nWorkflow> {
    const nodes: N8nNode[] = [];
    const connections: Record<string, any> = {};

    let xPosition = 250;
    const yPosition = 300;
    const xSpacing = 300;

    // Create trigger node
    if (plan.trigger) {
      const triggerNode = this.createTriggerNode(plan.trigger, xPosition, yPosition);
      nodes.push(triggerNode);
      xPosition += xSpacing;
    }

    // Create action nodes
    if (plan.steps && Array.isArray(plan.steps)) {
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        const actionNode = this.createActionNode(step, i, xPosition, yPosition);
        nodes.push(actionNode);
        xPosition += xSpacing;

        // Create connection from previous node
        const sourceNode = nodes[i];
        const targetNode = actionNode;
        
        if (!connections[sourceNode.name]) {
          connections[sourceNode.name] = { main: [[]] };
        }
        connections[sourceNode.name].main[0].push({
          node: targetNode.name,
          type: 'main',
          index: 0
        });
      }
    }

    const workflow = {
      name: plan.workflowName || this.generateWorkflowName(description),
      nodes,
      connections,
      active: false,
      settings: {
        executionOrder: 'v1'
      }
    };

    // Debug logging
    console.log('[Workflow Generator] Created workflow with:');
    console.log('  - Nodes:', nodes.map(n => `${n.name} (${n.id})`).join(', '));
    console.log('  - Connections:', JSON.stringify(connections, null, 2));

    return workflow;
  }

  /**
   * Create a trigger node based on type
   */
  private createTriggerNode(trigger: any, x: number, y: number): N8nNode {
    const triggerTypes: Record<string, string> = {
      webhook: 'n8n-nodes-base.webhook',
      schedule: 'n8n-nodes-base.scheduleTrigger',
      manual: 'n8n-nodes-base.manualTrigger'
    };

    const nodeType = triggerTypes[trigger.type] || 'n8n-nodes-base.manualTrigger';

    return {
      id: this.generateNodeId(),
      name: trigger.type === 'webhook' ? 'Webhook' : trigger.type === 'schedule' ? 'Schedule' : 'Manual Trigger',
      type: nodeType,
      position: [x, y],
      parameters: trigger.config || {},
      credentials: {}
    };
  }

  /**
   * Create an action node based on step definition
   */
  private createActionNode(step: any, index: number, x: number, y: number): N8nNode {
    // Map common services to n8n node types
    const serviceNodeTypes: Record<string, string> = {
      slack: 'n8n-nodes-base.slack',
      email: 'n8n-nodes-base.emailSend',
      gmail: 'n8n-nodes-base.gmail',
      http: 'n8n-nodes-base.httpRequest',
      database: 'n8n-nodes-base.postgres',
      sheets: 'n8n-nodes-base.googleSheets',
      airtable: 'n8n-nodes-base.airtable'
    };

    const service = step.service?.toLowerCase() || 'http';
    const nodeType = serviceNodeTypes[service] || 'n8n-nodes-base.httpRequest';

    return {
      id: this.generateNodeId(),
      name: step.action || `${step.service} ${index + 1}`,
      type: nodeType,
      position: [x, y],
      parameters: step.config || {},
      credentials: {}
    };
  }

  /**
   * Generate a workflow name from description
   */
  private generateWorkflowName(description: string): string {
    // Take first 50 chars and clean up
    const name = description
      .substring(0, 50)
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim();
    
    return name || 'AI Generated Workflow';
  }

  /**
   * Generate a unique node ID
   */
  private generateNodeId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Modify an existing workflow based on user request
   */
  async modifyWorkflow(workflow: N8nWorkflow, modificationRequest: string): Promise<N8nWorkflow> {
    try {
      // Use AI to understand what needs to be modified
      const prompt = `Given this workflow and modification request, describe what changes need to be made:

Workflow: ${JSON.stringify(workflow, null, 2)}

Modification: "${modificationRequest}"

Respond with JSON:
{
  "action": "add_node|remove_node|modify_node|reorder",
  "details": {}
}`;

      // For hackathon: Simple implementation
      // In production: Use AI to intelligently modify the workflow
      
      return workflow; // Return unchanged for now
    } catch (error) {
      console.error('Workflow modification error:', error);
      throw new Error('Failed to modify workflow');
    }
  }
}
