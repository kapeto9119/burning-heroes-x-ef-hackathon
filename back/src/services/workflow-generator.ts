import { N8nWorkflow, N8nNode, N8nConnection } from '../types';
import { N8nMCPClient } from './n8n-mcp-client';
import { AIService } from './ai-service';
import { CredentialDetector, CredentialRequirement } from './credential-detector';

export interface WorkflowGenerationResult {
  workflow: N8nWorkflow;
  credentialRequirements: CredentialRequirement[];
}

export class WorkflowGenerator {
  private mcpClient: N8nMCPClient;
  private aiService: AIService;
  private credentialDetector: CredentialDetector;

  constructor(mcpClient: N8nMCPClient, aiService: AIService) {
    this.mcpClient = mcpClient;
    this.aiService = aiService;
    this.credentialDetector = new CredentialDetector(mcpClient);
  }

  /**
   * Generate a complete n8n workflow from a natural language description
   * Returns workflow + credential requirements
   */
  async generateFromDescription(description: string): Promise<WorkflowGenerationResult> {
    try {
      console.log('[Workflow Generator] Starting generation for:', description);
      
      // Step 1: Search for relevant templates (with real examples from 2,500+ templates)
      const templatesResult = await this.mcpClient.searchTemplates(description, 5);
      const templates = Array.isArray(templatesResult) ? templatesResult : [];
      console.log(`[Workflow Generator] Found ${templates.length} relevant templates`);
      
      // Step 2: Search for relevant nodes (with real-world configuration examples)
      const nodesResult = await this.mcpClient.searchNodes(description, true);
      const nodes = Array.isArray(nodesResult) ? nodesResult : [];
      console.log(`[Workflow Generator] Found ${nodes.length} relevant nodes`);
      
      // Step 3: Use AI to generate workflow structure using template examples
      const workflowPlan = await this.aiService.generateWorkflowFromDescription(
        description,
        { templates: templates.slice(0, 3), nodes: nodes.slice(0, 5) }
      );

      // Step 4: Convert AI plan to n8n workflow format
      const workflow = await this.convertPlanToWorkflow(workflowPlan, description);

      // Step 5: Detect credential requirements
      const credentialRequirements = await this.credentialDetector.detectRequiredCredentials(workflow);
      console.log(`[Workflow Generator] Detected ${credentialRequirements.length} credential requirements`);

      // Step 6: Validate the workflow
      const validation = await this.mcpClient.validateWorkflow(workflow);
      if (!validation.valid) {
        console.warn('[Workflow Generator] Validation warnings:', validation.errors);
      }

      return {
        workflow,
        credentialRequirements
      };
    } catch (error) {
      console.error('[Workflow Generator] Generation error:', error);
      throw new Error('Failed to generate workflow');
    }
  }

  /**
   * Check which credentials user is missing for a workflow
   */
  async checkMissingCredentials(
    userId: string,
    requirements: CredentialRequirement[],
    userCredentials: any
  ): Promise<CredentialRequirement[]> {
    return this.credentialDetector.checkMissingCredentials(userId, requirements, userCredentials);
  }

  /**
   * Convert AI-generated plan to n8n workflow format
   * Now dynamically resolves node types via MCP
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

    // Create action nodes (now async to query MCP)
    if (plan.steps && Array.isArray(plan.steps)) {
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        const actionNode = await this.createActionNode(step, i, xPosition, yPosition);
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
   * Now uses MCP to dynamically find the correct node type
   */
  private async createActionNode(step: any, index: number, x: number, y: number): Promise<N8nNode> {
    let nodeType = 'n8n-nodes-base.httpRequest'; // Default fallback
    
    // Try to find the correct node type using MCP search
    if (step.service) {
      try {
        const searchResults = await this.mcpClient.searchNodes(step.service, false);
        if (searchResults.length > 0) {
          // Use the first (most relevant) result
          nodeType = searchResults[0].nodeType;
          console.log(`[Workflow Generator] Found node type for "${step.service}": ${nodeType}`);
        } else {
          console.warn(`[Workflow Generator] No node found for "${step.service}", using HTTP Request`);
        }
      } catch (error) {
        console.error(`[Workflow Generator] Error searching for node type:`, error);
      }
    }

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
