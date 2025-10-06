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
   * Enhanced with AI-specific node recognition
   */
  private async createActionNode(step: any, index: number, x: number, y: number): Promise<N8nNode> {
    let nodeType = 'n8n-nodes-base.httpRequest'; // Default fallback
    
    // AI-specific node mapping (check first for performance)
    const aiNodeMap: Record<string, string> = {
      'openai': 'n8n-nodes-langchain.openai',
      'gpt': 'n8n-nodes-langchain.openai',
      'gpt-4': 'n8n-nodes-langchain.openai',
      'chatgpt': 'n8n-nodes-langchain.openai',
      'claude': 'n8n-nodes-langchain.lmChatAnthropic',
      'anthropic': 'n8n-nodes-langchain.lmChatAnthropic',
      'gemini': 'n8n-nodes-langchain.lmChatGooglePalm',
      'google ai': 'n8n-nodes-langchain.lmChatGooglePalm',
      'ai agent': 'n8n-nodes-langchain.agent',
      'chatbot': 'n8n-nodes-langchain.agent',
      'assistant': 'n8n-nodes-langchain.agent',
      'dall-e': 'n8n-nodes-langchain.openai',
      'dalle': 'n8n-nodes-langchain.openai',
      'image generation': 'n8n-nodes-langchain.openai',
      'generate image': 'n8n-nodes-langchain.openai',
      'stable diffusion': 'n8n-nodes-base.stabilityAi',
      'stability': 'n8n-nodes-base.stabilityAi',
      'whisper': 'n8n-nodes-langchain.openai',
      'transcribe': 'n8n-nodes-langchain.openai',
      'transcription': 'n8n-nodes-langchain.openai',
      'voice': 'n8n-nodes-base.elevenLabs',
      'text to speech': 'n8n-nodes-base.elevenLabs',
      'elevenlabs': 'n8n-nodes-base.elevenLabs',
      'replicate': 'n8n-nodes-base.replicate',
      'content generation': 'n8n-nodes-langchain.openai',
      'generate content': 'n8n-nodes-langchain.openai',
      'write': 'n8n-nodes-langchain.openai',
      'summarize': 'n8n-nodes-langchain.openai',
      'translate': 'n8n-nodes-langchain.openai'
    };
    
    // Check if step mentions AI keywords
    const stepText = `${step.service || ''} ${step.action || ''} ${step.prompt || ''}`.toLowerCase();
    for (const [keyword, type] of Object.entries(aiNodeMap)) {
      if (stepText.includes(keyword)) {
        nodeType = type;
        console.log(`[Workflow Generator] ✨ Matched AI keyword "${keyword}" -> ${nodeType}`);
        
        return {
          id: this.generateNodeId(),
          name: step.action || step.service || `AI ${index + 1}`,
          type: nodeType,
          position: [x, y],
          parameters: this.getAINodeParameters(nodeType, step),
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
   * Get default parameters for AI nodes based on type
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
   * Modify an existing workflow based on user request
   */
  async modifyWorkflow(workflow: N8nWorkflow, modificationRequest: string): Promise<N8nWorkflow> {
    try {
      console.log('[Workflow Generator] Modifying workflow:', modificationRequest);
      
      // Use AI to understand and apply the modification
      const prompt = `You are modifying an n8n workflow. Given the current workflow and modification request, return the COMPLETE modified workflow in the exact same JSON format.

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

Return ONLY the complete modified workflow JSON, no explanations.`;

      const completion = await this.aiService.chat(prompt, []);
      
      // Parse the AI response to get the modified workflow
      let modifiedWorkflow: N8nWorkflow;
      try {
        // Try to extract JSON from the response
        const jsonMatch = completion.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          modifiedWorkflow = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in AI response');
        }
      } catch (parseError) {
        console.error('[Workflow Generator] Failed to parse AI response:', parseError);
        console.log('[Workflow Generator] AI Response:', completion);
        throw new Error('Failed to parse modified workflow from AI response');
      }

      // Validate the modified workflow has required fields
      if (!modifiedWorkflow.nodes || !Array.isArray(modifiedWorkflow.nodes)) {
        throw new Error('Modified workflow is missing nodes array');
      }

      console.log('[Workflow Generator] ✅ Workflow modified successfully');
      console.log('[Workflow Generator] Modified nodes:', modifiedWorkflow.nodes.map(n => n.name).join(', '));
      
      return modifiedWorkflow;
    } catch (error: any) {
      console.error('[Workflow Generator] Workflow modification error:', error);
      throw new Error(`Failed to modify workflow: ${error.message}`);
    }
  }
}
