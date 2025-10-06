import { Router, Request, Response } from 'express';
import { VapiService } from '../services/vapi-service';
import { VapiWebhookRequest, VapiAssistantConfig } from '../types/vapi';
import { ApiResponse } from '../types';
import { vapiAuthMiddleware } from '../middleware/vapi-auth';

export function createVoiceRouter(vapiService: VapiService): Router {
  const router = Router();

  /**
   * POST /api/voice/functions
   * Handle Vapi function calls
   * Protected by Vapi webhook authentication
   */
  router.post('/functions', vapiAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const webhookData: VapiWebhookRequest = req.body;
      const message = webhookData.message;

      console.log('[Voice API] Received webhook:', message.type);

      // Handle function calls
      if (message.type === 'function-call' && message.functionCall) {
        const userId = req.headers['x-user-id'] as string || 'demo_user_123';
        const callId = webhookData.call?.id || 'unknown';

        const result = await vapiService.handleFunctionCall(
          message.functionCall,
          callId,
          userId
        );

        // Return result to Vapi
        return res.json(result);
      }

      // Handle other message types (transcript, status updates, etc.)
      if (message.type === 'transcript') {
        console.log('[Voice API] Transcript:', message.transcript);
      }

      if (message.type === 'end-of-call-report') {
        console.log('[Voice API] Call ended:', webhookData.call?.endedReason);
      }

      // Acknowledge other message types
      res.json({ received: true });

    } catch (error) {
      console.error('[Voice API] Function error:', error);
      res.status(500).json({
        success: false,
        error: 'Function execution failed'
      } as ApiResponse);
    }
  });

  /**
   * GET /api/voice/session/:callId
   * Get current voice session status
   */
  router.get('/session/:callId', async (req: Request, res: Response) => {
    try {
      const { callId } = req.params;
      const session = vapiService.getSession(callId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: session
      } as ApiResponse);

    } catch (error) {
      console.error('[Voice API] Session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get session'
      } as ApiResponse);
    }
  });

  /**
   * GET /api/voice/assistant-config
   * Get Vapi assistant configuration (for reference/setup)
   */
  router.get('/assistant-config', async (req: Request, res: Response) => {
    try {
      const serverUrl = process.env.BACKEND_URL || 'http://localhost:3001';
      
      const config: VapiAssistantConfig = {
        name: 'Workflow Builder Voice Assistant',
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          temperature: 0.7,
          messages: [
            {
              role: 'system',
              content: `You are a helpful workflow automation assistant. Help users create n8n workflows through natural conversation.

GUIDELINES:
- Ask clarifying questions when needed, but don't ask too many
- Be concise and action-oriented
- When you have enough info (trigger + action + services), call generateWorkflow
- Use natural, conversational language
- Confirm before deploying workflows

WORKFLOW COMPONENTS:
- Triggers: webhook, schedule, manual
- Services: Slack, Gmail, Google Sheets, Postgres, HTTP Request
- Always extract: what triggers it, what it does, which services to use`
            }
          ],
          functions: [
            {
              name: 'generateWorkflow',
              description: 'Generate a workflow based on user requirements. Call this when you have enough information about the trigger, actions, and services.',
              parameters: {
                type: 'object',
                properties: {
                  description: {
                    type: 'string',
                    description: 'Complete workflow description based on the conversation'
                  },
                  trigger: {
                    type: 'string',
                    description: 'Workflow trigger type',
                    enum: ['webhook', 'schedule', 'manual']
                  },
                  services: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of services to use (e.g., Slack, Gmail, Postgres)'
                  },
                  schedule: {
                    type: 'string',
                    description: 'Schedule time if trigger is schedule (e.g., "9 AM daily", "every Monday")'
                  }
                },
                required: ['description']
              }
            },
            {
              name: 'updateWorkflow',
              description: 'Modify the current workflow based on user corrections or changes',
              parameters: {
                type: 'object',
                properties: {
                  modification: {
                    type: 'string',
                    description: 'What to change in the workflow'
                  },
                  nodeToModify: {
                    type: 'string',
                    description: 'Which node to update (optional)'
                  }
                },
                required: ['modification']
              }
            },
            {
              name: 'deployWorkflow',
              description: 'Deploy the workflow to n8n. Only call this after user confirms they want to deploy.',
              parameters: {
                type: 'object',
                properties: {
                  confirm: {
                    type: 'boolean',
                    description: 'User confirmation to deploy'
                  }
                },
                required: ['confirm']
              }
            },
            {
              name: 'getWorkflowStatus',
              description: 'Get the current status of the workflow being built',
              parameters: {
                type: 'object',
                properties: {}
              }
            }
          ]
        },
        voice: {
          provider: '11labs',
          voiceId: 'rachel' // Natural, friendly female voice
        },
        firstMessage: 'Hi! I\'m your workflow assistant. What would you like to automate today?',
        serverUrl: `${serverUrl}/api/voice/functions`,
        serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET || 'your-webhook-secret',
        endCallFunctionEnabled: true,
        recordingEnabled: false
      };

      res.json({
        success: true,
        data: config,
        instructions: 'Use this configuration to create your Vapi assistant via the Vapi dashboard or API'
      } as ApiResponse);

    } catch (error) {
      console.error('[Voice API] Config error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get assistant config'
      } as ApiResponse);
    }
  });

  return router;
}
