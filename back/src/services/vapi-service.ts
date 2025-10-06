import { VapiFunctionCall, VapiFunctionResponse, VoiceWorkflowSession } from '../types/vapi';
import { WorkflowGenerator } from './workflow-generator';
import { voiceSessionManager } from './voice-session-manager';
import { N8nWorkflow } from '../types';

/**
 * Vapi Service - Handles voice AI function calls and workflow generation
 */
export class VapiService {
  private workflowGenerator: WorkflowGenerator;

  constructor(workflowGenerator: WorkflowGenerator) {
    this.workflowGenerator = workflowGenerator;
  }

  /**
   * Handle function calls from Vapi
   */
  async handleFunctionCall(
    functionCall: VapiFunctionCall,
    callId: string,
    userId: string = 'demo_user_123'
  ): Promise<VapiFunctionResponse> {
    console.log(`[Vapi Service] Function call: ${functionCall.name}`, functionCall.parameters);

    try {
      switch (functionCall.name) {
        case 'generateWorkflow':
          return await this.handleGenerateWorkflow(functionCall.parameters, callId, userId);
        
        case 'updateWorkflow':
          return await this.handleUpdateWorkflow(functionCall.parameters, callId, userId);
        
        case 'deployWorkflow':
          return await this.handleDeployWorkflow(functionCall.parameters, callId, userId);
        
        case 'getWorkflowStatus':
          return await this.handleGetWorkflowStatus(callId, userId);
        
        default:
          return {
            result: null,
            error: `Unknown function: ${functionCall.name}`
          };
      }
    } catch (error: any) {
      console.error(`[Vapi Service] Function error:`, error);
      return {
        result: null,
        error: error.message || 'Function execution failed'
      };
    }
  }

  /**
   * Generate workflow from voice description
   */
  private async handleGenerateWorkflow(
    params: any,
    callId: string,
    userId: string
  ): Promise<VapiFunctionResponse> {
    try {
      // Get or create session
      let session = voiceSessionManager.getSession(callId);
      if (!session) {
        session = voiceSessionManager.createSession(userId, callId);
      }

      // Update session context
      voiceSessionManager.updateContext(callId, {
        description: params.description,
        trigger: params.trigger,
        services: params.services || [],
        schedule: params.schedule,
      });

      // Update status
      voiceSessionManager.updateSession(callId, { status: 'generating' });

      // Generate workflow using existing service
      const result = await this.workflowGenerator.generateFromDescription(params.description);

      // Store workflow in session
      voiceSessionManager.updateSession(callId, {
        currentWorkflow: result.workflow,
        status: 'ready',
      });

      // Format response for voice
      const workflowSummary = this.formatWorkflowForVoice(result.workflow);
      const credentialInfo = result.credentialRequirements.length > 0
        ? ` You'll need to set up credentials for: ${result.credentialRequirements.map(c => c.service).join(', ')}.`
        : '';

      return {
        result: {
          workflow: result.workflow,
          credentialRequirements: result.credentialRequirements,
          message: `I've created your workflow! ${workflowSummary}${credentialInfo} Would you like me to deploy it?`,
          sessionId: session.sessionId,
        }
      };
    } catch (error: any) {
      voiceSessionManager.updateSession(callId, { status: 'error' });
      throw error;
    }
  }

  /**
   * Update existing workflow
   */
  private async handleUpdateWorkflow(
    params: any,
    callId: string,
    userId: string
  ): Promise<VapiFunctionResponse> {
    const session = voiceSessionManager.getSession(callId);
    
    if (!session || !session.currentWorkflow) {
      return {
        result: null,
        error: 'No workflow found to update. Please generate a workflow first.'
      };
    }

    try {
      // Use AI to modify the workflow
      const updatedWorkflow = await this.workflowGenerator.modifyWorkflow(
        session.currentWorkflow,
        params.modification
      );

      // Update session
      voiceSessionManager.updateSession(callId, {
        currentWorkflow: updatedWorkflow,
      });

      return {
        result: {
          workflow: updatedWorkflow,
          message: `I've updated your workflow. ${params.modification}. Is this what you wanted?`,
        }
      };
    } catch (error: any) {
      return {
        result: null,
        error: `Failed to update workflow: ${error.message}`
      };
    }
  }

  /**
   * Deploy workflow (returns deployment info, actual deployment happens in frontend/routes)
   */
  private async handleDeployWorkflow(
    params: any,
    callId: string,
    userId: string
  ): Promise<VapiFunctionResponse> {
    const session = voiceSessionManager.getSession(callId);
    
    if (!session || !session.currentWorkflow) {
      return {
        result: null,
        error: 'No workflow found to deploy. Please generate a workflow first.'
      };
    }

    if (!params.confirm) {
      return {
        result: {
          needsConfirmation: true,
          message: 'Are you sure you want to deploy this workflow?',
        }
      };
    }

    // Mark as ready for deployment
    voiceSessionManager.updateSession(callId, { status: 'deployed' });

    return {
      result: {
        workflow: session.currentWorkflow,
        readyToDeploy: true,
        message: 'Perfect! I\'m deploying your workflow now. This will take just a moment...',
        sessionId: session.sessionId,
      }
    };
  }

  /**
   * Get current workflow status
   */
  private async handleGetWorkflowStatus(
    callId: string,
    userId: string
  ): Promise<VapiFunctionResponse> {
    const session = voiceSessionManager.getSession(callId);
    
    if (!session) {
      return {
        result: {
          status: 'no_session',
          message: 'No active workflow session found.',
        }
      };
    }

    const statusMessages = {
      collecting: 'I\'m still gathering information about your workflow.',
      generating: 'I\'m currently generating your workflow.',
      ready: 'Your workflow is ready to deploy!',
      deployed: 'Your workflow has been deployed successfully!',
      error: 'There was an error with your workflow.',
    };

    return {
      result: {
        status: session.status,
        workflow: session.currentWorkflow,
        context: session.conversationContext,
        message: statusMessages[session.status] || 'Unknown status',
      }
    };
  }

  /**
   * Format workflow for voice-friendly description
   */
  private formatWorkflowForVoice(workflow: N8nWorkflow): string {
    const nodeCount = workflow.nodes?.length || 0;
    const nodeTypes = workflow.nodes?.map(n => n.name).join(', ') || 'no nodes';
    
    return `It has ${nodeCount} nodes: ${nodeTypes}.`;
  }

  /**
   * Get session for external access
   */
  getSession(callId: string): VoiceWorkflowSession | null {
    return voiceSessionManager.getSession(callId);
  }
}
