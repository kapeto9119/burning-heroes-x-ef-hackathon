import { N8nWorkflow, N8nNode, N8nConnection } from '../types';
import { N8nMCPClient } from './n8n-mcp-client';
import { AIService } from './ai-service';
import { CredentialDetector, CredentialRequirement } from './credential-detector';
import { lintWorkflow } from './workflow-linter';

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
      console.log('[Workflow Generator] 🚀 Generating workflow for:', description);
      
      // Step 1: Search for relevant templates (with real examples from 2,500+ templates)
      const templatesResult = await this.mcpClient.searchTemplates(description, 5);
      const templates = Array.isArray(templatesResult) ? templatesResult : [];
      
      // Step 2: Search for relevant nodes (with real-world configuration examples)
      const nodesResult = await this.mcpClient.searchNodes(description, true);
      const nodes = Array.isArray(nodesResult) ? nodesResult : [];
      
      // Step 3: Use AI to generate workflow structure using template examples
      const workflowPlan = await this.aiService.generateWorkflowFromDescription(
        description,
        { templates: templates.slice(0, 3), nodes: nodes.slice(0, 5) }
      );

      // Step 4: Convert AI plan to n8n workflow format
      let workflow = await this.convertPlanToWorkflow(workflowPlan, description);

      // Step 5: Add callback webhook for real-time updates
      workflow = this.addCallbackWebhook(workflow);

      // Step 6: Lint and fix common issues
      const lintResult = lintWorkflow(workflow);
      workflow = lintResult.workflow;

      // Step 6: Detect credential requirements
      const credentialRequirements = await this.credentialDetector.detectRequiredCredentials(workflow);

      // Step 7: Validate the workflow
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

    console.log('[Workflow Generator] ✅ Created workflow with', nodes.length, 'nodes');
    return workflow;
  }

  /**
   * Create a trigger node based on type
   * Enhanced to handle service-specific triggers (e.g., Salesforce)
   */
  private createTriggerNode(trigger: any, x: number, y: number): N8nNode {
    const triggerTypes: Record<string, string> = {
      webhook: 'n8n-nodes-base.webhook',
      schedule: 'n8n-nodes-base.scheduleTrigger',
      manual: 'n8n-nodes-base.manualTrigger',
      salesforce: 'n8n-nodes-base.webhook', // Salesforce webhooks come via webhook trigger
      cron: 'n8n-nodes-base.scheduleTrigger'
    };

    // Detect if this is a data-fetching trigger (not a traditional trigger)
    // e.g., "grab leads from Salesforce" should be a regular Salesforce node, not a trigger
    const isFetchAction = trigger.config?.operation === 'getAll' || 
                          trigger.config?.operation === 'get' ||
                          trigger.type === 'fetch' ||
                          trigger.type === 'salesforce';
    
    if (isFetchAction) {
      // This is actually a data-fetching action, not a trigger
      // Use manual trigger and let the first action node handle the data fetching
      return {
        id: this.generateNodeId(),
        name: 'Manual Trigger',
        type: 'n8n-nodes-base.manualTrigger',
        position: [x, y],
        parameters: {},
        credentials: {}
      };
    }

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
   * Enhanced with AI-specific node recognition
   * Uses MANAGED AI via HTTP Request nodes (no user credentials needed!)
   */
  private async createActionNode(step: any, index: number, x: number, y: number): Promise<N8nNode> {
    let nodeType = 'n8n-nodes-base.httpRequest'; // Default fallback
    
    // AI-specific keywords - now using MANAGED AI approach
    const aiKeywords = [
      // Text AI
      'openai', 'gpt', 'gpt-4', 'chatgpt', 'claude', 'anthropic',
      'gemini', 'google ai', 'ai agent', 'chatbot', 'assistant',
      'content generation', 'generate content', 'ai content',
      'write', 'summarize', 'translate', 'ai',
      // Image AI
      'dall-e', 'dalle', 'image generation', 'generate image',
      'stable diffusion', 'stability', 'stability ai',
      'create image', 'ai image', 'picture generation',
      // Audio AI
      'whisper', 'transcribe', 'transcription', 'voice',
      'text to speech', 'elevenlabs', 'audio generation',
      // Other AI
      'replicate', 'fireworks', 'ai model'
    ];
    
    // Check if step mentions AI keywords
    const stepText = `${step.service || ''} ${step.action || ''} ${step.prompt || ''}`.toLowerCase();
    const isAINode = aiKeywords.some(keyword => stepText.includes(keyword));
    
    if (isAINode) {
      // Use MANAGED AI via HTTP Request node - no user credentials needed!
      
      return {
        id: this.generateNodeId(),
        name: step.action || `Generate AI Content`,
        type: 'n8n-nodes-base.httpRequest',
        position: [x, y],
        parameters: this.getManagedAINodeParameters(step),
        credentials: {}
      };
    }
    
    // Control flow nodes
    const controlFlowKeywords = {
      'loop': ['loop', 'for each', 'iterate', 'batch', 'one by one'],
      'if': ['if', 'only when', 'conditional', 'check if', 'when'],
      'switch': ['switch', 'multiple conditions', 'different cases', 'route based on']
    };
    
    // Check if this is a control flow node
    for (const [flowType, keywords] of Object.entries(controlFlowKeywords)) {
      if (keywords.some(keyword => stepText.includes(keyword))) {
        console.log(`[Workflow Generator] 🔀 Control flow: ${flowType}`);
        
        if (flowType === 'loop') {
          return {
            id: this.generateNodeId(),
            name: step.action || 'Loop Over Items',
            type: 'n8n-nodes-base.splitInBatches',
            position: [x, y],
            parameters: {
              batchSize: step.config?.batchSize || 1,
              options: {}
            },
            credentials: {}
          };
        } else if (flowType === 'if') {
          return {
            id: this.generateNodeId(),
            name: step.action || 'IF',
            type: 'n8n-nodes-base.if',
            position: [x, y],
            parameters: step.config || {
              conditions: {
                boolean: [],
                number: [],
                string: []
              },
              combineOperation: 'all'
            },
            credentials: {}
          };
        } else if (flowType === 'switch') {
          return {
            id: this.generateNodeId(),
            name: step.action || 'Switch',
            type: 'n8n-nodes-base.switch',
            position: [x, y],
            parameters: step.config || {
              mode: 'rules',
              rules: {
                rules: []
              },
              fallbackOutput: 3
            },
            credentials: {}
          };
        }
      }
    }
    
    // Common service node type mapping (prevent wrong nodes like emailReadImap)
    const serviceNodeMap: Record<string, { type: string, defaultParams?: any }> = {
      'salesforce': { 
        type: 'n8n-nodes-base.salesforce',
        defaultParams: {
          resource: 'lead',
          operation: 'getAll',
          returnAll: false,
          limit: 10
        }
      },
      'hubspot': { 
        type: 'n8n-nodes-base.hubspot',
        defaultParams: {
          resource: 'contact',
          operation: 'getAll',
          returnAll: false,
          limit: 10,
          additionalFields: {}
        }
      },
      'email': { 
        type: 'n8n-nodes-base.emailSend',
        defaultParams: {
          fromEmail: 'noreply@example.com',
          toEmail: '={{ $json.email }}',
          subject: '={{ $json.subject }}',
          text: '={{ $json.body }}'
        }
      },
      'gmail': { 
        type: 'n8n-nodes-base.gmail',
        defaultParams: {
          resource: 'message',
          operation: 'send',
          to: '={{ $json.email }}',
          subject: '={{ $json.subject }}',
          message: '={{ $json.body }}'
        }
      },
      'slack': { 
        type: 'n8n-nodes-base.slack',
        defaultParams: {
          resource: 'message',
          operation: 'post',
          select: 'channel',
          channelId: '#general',
          text: '={{ $json.message }}'
        }
      },
      'twitter': {
        type: 'n8n-nodes-base.twitter',
        defaultParams: {
          resource: 'tweet',
          operation: 'create',
          text: '={{ $json.content }}'
        }
      },
      'x': {  // Alias for Twitter
        type: 'n8n-nodes-base.twitter',
        defaultParams: {
          resource: 'tweet',
          operation: 'create',
          text: '={{ $json.content }}'
        }
      },
      'instagram': {
        type: 'n8n-nodes-base.httpRequest',  // Instagram via Graph API
        defaultParams: {
          method: 'POST',
          url: 'https://graph.instagram.com/me/media',
          authentication: 'genericCredentialType',
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: 'image_url', value: '={{ $json.imageUrl }}' },
              { name: 'caption', value: '={{ $json.caption }}' }
            ]
          }
        }
      },
      'facebook': {
        type: 'n8n-nodes-base.httpRequest',  // Facebook via Graph API
        defaultParams: {
          method: 'POST',
          url: 'https://graph.facebook.com/me/feed',
          authentication: 'genericCredentialType',
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: 'message', value: '={{ $json.message }}' },
              { name: 'link', value: '={{ $json.link }}' }
            ]
          }
        }
      }
    };
    
    // Check for service-specific node types
    const serviceLower = (step.service || '').toLowerCase();
    const actionLower = (step.action || '').toLowerCase();
    
    // Special case: email sending (prevent emailReadImap!)
    if (actionLower.includes('send') && (serviceLower.includes('email') || actionLower.includes('email'))) {
      return {
        id: this.generateNodeId(),
        name: step.action || 'Send Email',
        type: 'n8n-nodes-base.emailSend',
        position: [x, y],
        parameters: serviceNodeMap['email'].defaultParams,
        credentials: {}
      };
    }
    
    // Check service mapping
    for (const [service, config] of Object.entries(serviceNodeMap)) {
      if (serviceLower.includes(service)) {
        return {
          id: this.generateNodeId(),
          name: step.action || step.service,
          type: config.type,
          position: [x, y],
          parameters: { ...config.defaultParams, ...step.config },
          credentials: {}
        };
      }
    }
    
    // Fallback: Try to find the correct node type using MCP search
    if (step.service) {
      try {
        const searchResults = await this.mcpClient.searchNodes(step.service, false);
        if (searchResults.length > 0) {
          // Use the first (most relevant) result
          nodeType = searchResults[0].nodeType;
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
   * Generate HTTP Request node parameters for Managed AI
   * Calls YOUR backend API instead of requiring user credentials
   */
  private getManagedAINodeParameters(step: any): any {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    
    // Determine if this is image generation or text generation
    const isImageGen = step.action?.toLowerCase().includes('image') || 
                       step.prompt?.toLowerCase().includes('image') ||
                       step.action?.toLowerCase().includes('dall');
    
    if (isImageGen) {
      // Image generation via managed AI
      return {
        method: 'POST',
        url: `${backendUrl}/api/managed-ai/image`,
        authentication: 'none',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: JSON.stringify({
          userId: '={{ $json.userId }}',
          workflowId: '={{ $workflow.id }}',
          prompt: step.prompt || '={{ $json.prompt }}',
          model: 'accounts/fireworks/models/stable-diffusion-xl-1024-v1-0'
        }, null, 2),
        options: {
          timeout: 60000 // 60s for image generation
        }
      };
    } else {
      // Text/content generation via managed AI
      return {
        method: 'POST',
        url: `${backendUrl}/api/managed-ai/generate-content`,
        authentication: 'none',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: JSON.stringify({
          userId: '={{ $json.userId }}',
          workflowId: '={{ $workflow.id }}',
          prompt: step.prompt || step.config?.prompt || '={{ $json.prompt }}',
          context: step.config?.context || '={{ $json.context }}',
          model: 'accounts/fireworks/models/llama-v3p1-70b-instruct'
        }, null, 2),
        options: {
          timeout: 30000 // 30s for text generation
        }
      };
    }
  }

  /**
   * Get default parameters for AI nodes based on type
   * @deprecated - Now using getManagedAINodeParameters for managed AI
   */
  private getAINodeParameters(nodeType: string, step: any): any {
    // OpenAI node - text generation
    if (nodeType === 'n8n-nodes-langchain.openai') {
      // Check if it's image generation
      const isImage = step.action?.toLowerCase().includes('image') || 
                     step.action?.toLowerCase().includes('dall') ||
                     step.prompt?.toLowerCase().includes('image');
      
      if (isImage) {
        return {
          resource: 'image',
          operation: 'generate',
          model: 'dall-e-3',
          prompt: step.prompt || '={{ $json.prompt }}',
          size: '1024x1024',
          quality: 'standard',
          responseFormat: 'url'
        };
      }
      
      // Check if it's transcription
      const isTranscription = step.action?.toLowerCase().includes('transcribe') ||
                             step.action?.toLowerCase().includes('whisper');
      
      if (isTranscription) {
        return {
          resource: 'audio',
          operation: 'transcribe',
          model: 'whisper-1',
          binaryPropertyName: 'data',
          options: {}
        };
      }
      
      // Default: text generation
      return {
        resource: 'text',
        operation: 'message',
        model: 'gpt-4o',
        messages: {
          values: [
            {
              role: 'user',
              content: step.prompt || '={{ $json.prompt }}'
            }
          ]
        },
        options: {
          temperature: 0.7,
          maxTokens: 1000
        }
      };
    }
    
    // AI Agent node
    if (nodeType === 'n8n-nodes-langchain.agent') {
      return {
        promptType: 'define',
        text: step.prompt || 'You are a helpful AI assistant. Respond to user queries accurately and concisely.',
        hasOutputParser: false,
        options: {}
      };
    }
    
    // Anthropic Claude
    if (nodeType === 'n8n-nodes-langchain.lmChatAnthropic') {
      return {
        model: 'claude-3-5-sonnet-20241022',
        options: {
          temperature: 0.7,
          maxTokens: 1024
        }
      };
    }
    
    // Google Gemini
    if (nodeType === 'n8n-nodes-langchain.lmChatGooglePalm') {
      return {
        modelName: 'gemini-pro',
        options: {
          temperature: 0.7,
          maxOutputTokens: 1024
        }
      };
    }
    
    // Stability AI
    if (nodeType === 'n8n-nodes-base.stabilityAi') {
      return {
        resource: 'image',
        operation: 'generate',
        engine: 'stable-diffusion-xl-1024-v1-0',
        text: step.prompt || '={{ $json.prompt }}',
        options: {
          samples: 1,
          steps: 30
        }
      };
    }
    
    // ElevenLabs
    if (nodeType === 'n8n-nodes-base.elevenLabs') {
      return {
        resource: 'audio',
        operation: 'generate',
        voiceId: 'EXAVITQu4vr4xnSDxMaL', // Default voice
        text: step.prompt || '={{ $json.text }}',
        options: {}
      };
    }
    
    // Replicate
    if (nodeType === 'n8n-nodes-base.replicate') {
      return {
        resource: 'prediction',
        operation: 'create',
        modelVersion: step.config?.modelVersion || '',
        input: step.config?.input || {}
      };
    }
    
    // Fallback to step config
    return step.config || {};
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
   * Add callback webhook node to notify our backend when execution completes
   * This enables real-time updates for scheduled and webhook-triggered workflows
   */
  private addCallbackWebhook(workflow: N8nWorkflow): N8nWorkflow {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const callbackUrl = `${backendUrl}/api/n8n-webhooks/execution-complete`;

    // Find the last action node (not the trigger)
    const actionNodes = workflow.nodes.filter(n => 
      !n.type.includes('trigger') && 
      !n.type.includes('Trigger') &&
      !n.name.includes('Execution Callback')
    );

    if (actionNodes.length === 0) {
      return workflow;
    }

    const lastNode = actionNodes[actionNodes.length - 1];
    const callbackNodeId = this.generateNodeId();
    const callbackNodeName = 'Execution Callback';

    // Calculate position (to the right of last node)
    const lastNodeX = lastNode.position[0];
    const lastNodeY = lastNode.position[1];
    const callbackX = lastNodeX + 300;
    const callbackY = lastNodeY;

    // Create callback webhook node
    const callbackNode: N8nNode = {
      id: callbackNodeId,
      name: callbackNodeName,
      type: 'n8n-nodes-base.httpRequest',
      position: [callbackX, callbackY],
      parameters: {
        method: 'POST',
        url: callbackUrl,
        options: {},
        bodyParametersJson: JSON.stringify({
          workflowId: '={{ $workflow.id }}',
          n8nWorkflowId: '={{ $workflow.id }}',
          n8nExecutionId: '={{ $execution.id }}',
          status: 'success',
          startedAt: '={{ $execution.startedAt }}',
          finishedAt: '={{ new Date().toISOString() }}',
          data: '={{ $json }}'
        })
      },
      credentials: {}
    };

    // Add callback node to workflow
    workflow.nodes.push(callbackNode);

    // Connect last node to callback node
    if (!workflow.connections[lastNode.name]) {
      workflow.connections[lastNode.name] = { main: [[]] };
    }
    
    if (!workflow.connections[lastNode.name].main[0]) {
      workflow.connections[lastNode.name].main[0] = [];
    }

    workflow.connections[lastNode.name].main[0].push({
      node: callbackNodeName,
      type: 'main',
      index: 0
    });

    return workflow;
  }

  /**
   * Modify an existing workflow based on user request
   * Uses structured JSON response for reliability
   */
  async modifyWorkflow(workflow: N8nWorkflow, modificationRequest: string): Promise<N8nWorkflow> {
    try {
      console.log('[Workflow Generator] 🔧 Modifying workflow');
      
      const prompt = `You are modifying an n8n workflow. Given the current workflow and modification request, return the COMPLETE modified workflow.

CURRENT WORKFLOW:
${JSON.stringify(workflow, null, 2)}

MODIFICATION REQUEST: "${modificationRequest}"

IMPORTANT RULES:
1. Return the COMPLETE workflow JSON with all nodes and connections
2. Apply the requested modification (add/remove/modify nodes, change parameters, etc.)
3. Maintain proper node IDs and connections
4. Keep the same structure as the input workflow
5. If modifying a trigger (e.g., from manual to schedule), replace the trigger node entirely
6. If adding a schedule, use proper cron format in the scheduleTrigger node
7. Preserve all other nodes that aren't being modified

EXAMPLES:
- "Change to schedule trigger at 9 AM daily" → Replace manual trigger with scheduleTrigger node with cron "0 9 * * *"
- "Add email notification" → Add emailSend node and connect it
- "Change Slack channel to #alerts" → Modify the Slack node's channelId parameter

Return the complete modified workflow as valid JSON.`;

      // Use structured JSON response for reliability
      const completion = await this.aiService['openai'].chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a workflow modification expert. Return ONLY valid JSON matching the n8n workflow schema.'
          },
          { role: 'user', content: prompt }
        ]
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const modifiedWorkflow: N8nWorkflow = JSON.parse(content);

      // Validate the modified workflow has required fields
      if (!modifiedWorkflow.nodes || !Array.isArray(modifiedWorkflow.nodes)) {
        throw new Error('Modified workflow is missing nodes array');
      }

      // Lint the modified workflow
      const lintResult = lintWorkflow(modifiedWorkflow);

      console.log('[Workflow Generator] ✅ Workflow modified successfully');
      
      return lintResult.workflow;
    } catch (error: any) {
      console.error('[Workflow Generator] Workflow modification error:', error);
      throw new Error(`Failed to modify workflow: ${error.message}`);
    }
  }
}
