import { Router, Request, Response } from 'express';
import { N8nApiClient } from '../services/n8n-api-client';
import { AuthService } from '../services/auth-service';
import { createAuthMiddleware } from '../middleware/auth';
import { N8nWorkflow, ApiResponse, DeploymentResponse } from '../types';
import { DeploymentRepository, ExecutionRepository } from '../repositories/deployment-repository';
import { CredentialRepository } from '../repositories/credential-repository';
import { Pool } from 'pg';
import { NotificationClient } from '../services/notification-client';
import { getIntegration } from '../config/integrations';
import { ExecutionMonitor } from '../services/execution-monitor';

export function createDeployRouter(
  n8nClient: N8nApiClient,
  authService: AuthService,
  dbPool: Pool,
  executionMonitor?: ExecutionMonitor
): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(authService);
  const deploymentRepo = new DeploymentRepository(dbPool);
  const executionRepo = new ExecutionRepository(dbPool);
  const credentialRepo = new CredentialRepository();
  const notificationClient = new NotificationClient();

  /**
   * POST /api/deploy
   * Deploy a workflow to n8n
   */
  router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { workflow }: { workflow: N8nWorkflow } = req.body;
      const userId = req.user!.userId;

      if (!workflow || !workflow.nodes || workflow.nodes.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid workflow'
        } as ApiResponse);
      }

      console.log(`[Deploy] User ${userId} deploying workflow: ${workflow.name}`);

      // Get user credentials from repository
      const userCredentials = await credentialRepo.findByUser(userId);
      console.log(`[Deploy] Found ${userCredentials.length} credentials for user`);

      // Check if user has all required credentials
      const credentialCheck = await checkRequiredCredentials(workflow, userCredentials, credentialRepo, userId);
      if (!credentialCheck.valid) {
        return res.status(400).json({
          success: false,
          error: 'Missing required credentials',
          data: {
            missingCredentials: credentialCheck.missing,
            message: credentialCheck.message
          }
        } as ApiResponse);
      }

      // Map user credentials to n8n credential IDs
      const workflowWithCredentials = await mapUserCredentialsToWorkflow(
        workflow,
        userId,
        userCredentials,
        n8nClient,
        credentialRepo
      );

      // Log the workflow being deployed for debugging
      console.log('[Deploy] Workflow with credentials:', JSON.stringify(workflowWithCredentials, null, 2));

      // Deploy to n8n
      const n8nWorkflowId = await n8nClient.createWorkflow(workflowWithCredentials, userId);

      // Get webhook URL if workflow has webhook trigger
      const webhookNode = workflow.nodes.find(node => 
        node.type.includes('webhook') || node.type.includes('Webhook')
      );
      
      const webhookUrl = webhookNode?.parameters?.path
        ? n8nClient.getWebhookUrl(webhookNode.parameters.path as string)
        : undefined;

      // First, save the workflow to the workflows table
      const workflowId = workflow.id || crypto.randomUUID();
      
      // Extract node types and required credentials for quick reference
      const nodeTypes = workflow.nodes.map(n => n.type);
      const requiredCredentialTypes: string[] = [];
      workflow.nodes.forEach(node => {
        if (node.credentials && Object.keys(node.credentials).length > 0) {
          Object.keys(node.credentials).forEach(credType => {
            if (!requiredCredentialTypes.includes(credType)) {
              requiredCredentialTypes.push(credType);
            }
          });
        }
      });
      
      // Insert into workflows table
      await dbPool.query(
        `INSERT INTO workflows (id, user_id, name, workflow_data, node_types, required_credential_types, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           workflow_data = EXCLUDED.workflow_data,
           node_types = EXCLUDED.node_types,
           required_credential_types = EXCLUDED.required_credential_types,
           updated_at = NOW()`,
        [
          workflowId,
          userId,
          workflow.name || 'Untitled Workflow',
          JSON.stringify(workflow),
          nodeTypes,
          requiredCredentialTypes,
          false // Not active yet
        ]
      );
      
      // Now create the deployment record
      await deploymentRepo.create({
        workflowId,
        n8nWorkflowId,
        userId,
        webhookUrl,
        status: 'inactive', // Starts inactive, user activates manually
        deployedAt: new Date()
      });

      const response: DeploymentResponse = {
        n8nWorkflowId,
        webhookUrl,
        status: 'inactive',
        deployedAt: new Date()
      };

      // Send deployment success email
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const triggerNode = workflow.nodes.find(n => 
        n.type.includes('trigger') || n.type.includes('Trigger')
      );
      
      let triggerType: 'manual' | 'schedule' | 'webhook' = 'manual';
      let scheduleInfo: string | undefined;
      
      if (triggerNode) {
        if (triggerNode.type.includes('schedule')) {
          triggerType = 'schedule';
          const cronExpr = triggerNode.parameters?.rule?.interval?.[0]?.expression;
          scheduleInfo = cronExpr || 'Scheduled';
        } else if (triggerNode.type.includes('webhook')) {
          triggerType = 'webhook';
        }
      }

      notificationClient.sendWorkflowDeployed(userId, {
        workflowName: workflow.name || 'Untitled Workflow',
        workflowId,
        triggerType,
        scheduleInfo,
        webhookUrl,
        viewUrl: `${frontendUrl}/workflows`,
        timestamp: new Date()
      }).catch(err => console.error('[Deploy] Failed to send email:', err));

      res.json({
        success: true,
        data: {
          ...response,
          workflowId // Include for activation
        },
        message: 'Workflow deployed successfully. Activate it to start running.'
      } as ApiResponse<DeploymentResponse>);

    } catch (error: any) {
      console.error('[Deploy] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to deploy workflow'
      } as ApiResponse);
    }
  });

  /**
   * POST /api/deploy/check-credentials
   * Check if user has required credentials for a workflow (without deploying)
   */
  router.post('/check-credentials', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { workflow }: { workflow: N8nWorkflow } = req.body;
      const userId = req.user!.userId;

      if (!workflow || !workflow.nodes || workflow.nodes.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid workflow'
        } as ApiResponse);
      }

      // Get user credentials from repository
      const userCredentials = await credentialRepo.findByUser(userId);
      
      // Check if user has all required credentials
      const credentialCheck = await checkRequiredCredentials(workflow, userCredentials, credentialRepo, userId);
      
      res.json({
        success: true,
        data: {
          hasAllCredentials: credentialCheck.valid,
          missingCredentials: credentialCheck.missing,
          message: credentialCheck.message
        }
      } as ApiResponse);

    } catch (error: any) {
      console.error('[Check Credentials] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check credentials'
      } as ApiResponse);
    }
  });

  /**
   * POST /api/deploy/:workflowId/execute
   * Execute a deployed workflow
   */
  router.post('/:workflowId/execute', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { workflowId } = req.params;
      const { data } = req.body;
      const userId = req.user!.userId;

      const deployment = await deploymentRepo.findByWorkflowId(workflowId);

      if (!deployment) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not deployed'
        } as ApiResponse);
      }

      // Verify ownership
      if (deployment.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        } as ApiResponse);
      }

      console.log(`[Execute] User ${userId} executing workflow ${workflowId}`);

      // Emit execution started event via WebSocket
      const wsService = (req.app as any).wsService;
      if (wsService) {
        wsService.emitExecutionStarted(userId, workflowId, 'pending');
      }

      const result = await n8nClient.executeWorkflow(deployment.n8nWorkflowId, data);
      
      // Start monitoring execution for real-time node updates
      if (executionMonitor && result.id) {
        console.log(`[Execute] 🔍 Starting execution monitor for ${result.id}`);
        executionMonitor.startMonitoring(result.id, workflowId, userId).catch(err => {
          console.error('[Execute] Failed to start execution monitor:', err);
        });
      }
      
      // Update execution stats
      await deploymentRepo.updateExecutionStats(workflowId, true, false);

      // Emit execution completed event
      if (wsService) {
        wsService.emitExecutionCompleted(userId, workflowId, result.id || 'unknown', 'success', result);
      }

      res.json({
        success: true,
        data: result,
        message: 'Workflow executed successfully'
      } as ApiResponse);

    } catch (error: any) {
      console.error('[Execute] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to execute workflow'
      } as ApiResponse);
    }
  });

  /**
   * GET /api/deploy/:workflowId/executions
   * Get execution history for a workflow
   */
  router.get('/:workflowId/executions', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { workflowId } = req.params;
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 10;

      const deployment = await deploymentRepo.findByWorkflowId(workflowId);

      if (!deployment) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not deployed'
        } as ApiResponse);
      }

      // Verify ownership
      if (deployment.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        } as ApiResponse);
      }

      const executions = await n8nClient.getExecutions(deployment.n8nWorkflowId, limit);

      res.json({
        success: true,
        data: executions
      } as ApiResponse);

    } catch (error: any) {
      console.error('[Executions] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get executions'
      } as ApiResponse);
    }
  });

  /**
   * DELETE /api/deploy/:workflowId
   * Delete a deployed workflow
   */
  router.delete('/:workflowId', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { workflowId } = req.params;
      const userId = req.user!.userId;

      const deployment = await deploymentRepo.findByWorkflowId(workflowId);

      if (!deployment) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not deployed'
        } as ApiResponse);
      }

      // Verify ownership
      if (deployment.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        } as ApiResponse);
      }

      console.log(`[Delete] User ${userId} deleting workflow ${workflowId}`);

      // Delete from n8n
      await n8nClient.deleteWorkflow(deployment.n8nWorkflowId);

      // Remove from database
      await deploymentRepo.delete(workflowId);

      res.json({
        success: true,
        message: 'Workflow deleted successfully'
      } as ApiResponse);

    } catch (error: any) {
      console.error('[Delete] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete workflow'
      } as ApiResponse);
    }
  });

  /**
   * GET /api/deploy/user/deployments
   * Get all deployments for current user
   */
  router.get('/user/deployments', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;

      const userDeployments = await deploymentRepo.findByUserId(userId);

      res.json({
        success: true,
        data: userDeployments
      } as ApiResponse);

    } catch (error: any) {
      console.error('[User Deployments] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get deployments'
      } as ApiResponse);
    }
  });

  /**
   * POST /api/deploy/:workflowId/activate
   * Manually activate a deployed workflow
   */
  router.post('/:workflowId/activate', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { workflowId } = req.params;
      const userId = req.user!.userId;

      const deployment = await deploymentRepo.findByWorkflowId(workflowId);

      if (!deployment) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not deployed'
        } as ApiResponse);
      }

      // Verify ownership
      if (deployment.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        } as ApiResponse);
      }

      console.log(`[Activate] User ${userId} activating workflow ${workflowId}`);

      // Activate in n8n
      await n8nClient.activateWorkflow(deployment.n8nWorkflowId);

      // Update deployment status
      await deploymentRepo.updateStatus(workflowId, 'active');

      // Emit WebSocket event
      const wsService = (req.app as any).wsService;
      if (wsService) {
        wsService.emitWorkflowStatusChanged(userId, workflowId, 'active');
      }

      res.json({
        success: true,
        message: 'Workflow activated successfully',
        data: {
          workflowId,
          n8nWorkflowId: deployment.n8nWorkflowId,
          status: 'active'
        }
      } as ApiResponse);

    } catch (error: any) {
      console.error('[Activate] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to activate workflow'
      } as ApiResponse);
    }
  });

  /**
   * POST /api/deploy/:workflowId/deactivate
   * Deactivate a deployed workflow
   */
  router.post('/:workflowId/deactivate', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { workflowId } = req.params;
      const userId = req.user!.userId;

      const deployment = await deploymentRepo.findByWorkflowId(workflowId);

      if (!deployment) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not deployed'
        } as ApiResponse);
      }

      // Verify ownership
      if (deployment.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        } as ApiResponse);
      }

      console.log(`[Deactivate] User ${userId} deactivating workflow ${workflowId}`);

      // Deactivate in n8n
      await n8nClient.deactivateWorkflow(deployment.n8nWorkflowId);

      // Update deployment status
      await deploymentRepo.updateStatus(workflowId, 'inactive');

      res.json({
        success: true,
        message: 'Workflow deactivated successfully',
        data: {
          workflowId,
          n8nWorkflowId: deployment.n8nWorkflowId,
          status: 'inactive'
        }
      } as ApiResponse);

    } catch (error: any) {
      console.error('[Deactivate] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to deactivate workflow'
      } as ApiResponse);
    }
  });

  /**
   * GET /api/deploy/user/stats
   * Get deployment statistics for current user
   */
  router.get('/user/stats', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const stats = await deploymentRepo.getStats(userId);

      res.json({
        success: true,
        data: stats
      } as ApiResponse);
    } catch (error: any) {
      console.error('[User Stats] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get statistics'
      } as ApiResponse);
    }
  });

  /**
   * GET /api/deploy/:workflowId/stats
   * Get statistics for a specific workflow
   */
  router.get('/:workflowId/stats', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { workflowId } = req.params;
      const userId = req.user!.userId;
      const days = parseInt(req.query.days as string) || 7;

      const deployment = await deploymentRepo.findByWorkflowId(workflowId);

      if (!deployment) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not deployed'
        } as ApiResponse);
      }

      // Verify ownership
      if (deployment.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        } as ApiResponse);
      }

      const stats = await executionRepo.getWorkflowStats(workflowId, days);

      res.json({
        success: true,
        data: stats
      } as ApiResponse);
    } catch (error: any) {
      console.error('[Workflow Stats] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get workflow statistics'
      } as ApiResponse);
    }
  });

  /**
   * GET /api/deploy/user/errors
   * Get recent errors for current user
   */
  router.get('/user/errors', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 10;

      const errors = await executionRepo.getRecentErrors(userId, limit);

      res.json({
        success: true,
        data: errors
      } as ApiResponse);
    } catch (error: any) {
      console.error('[Recent Errors] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get recent errors'
      } as ApiResponse);
    }
  });

  return router;
}

/**
 * Helper: Check if user has all required credentials for workflow nodes
 */
async function checkRequiredCredentials(
  workflow: N8nWorkflow,
  userCredentials: any[],
  credentialRepo: CredentialRepository,
  userId: string
): Promise<{ valid: boolean; missing: Array<{ nodeName: string; service: string; nodeType: string; n8nCredentialType: string; fields: any[] }>; message: string }> {
  const nodeServiceMapping: Record<string, string> = {
    'n8n-nodes-base.slack': 'slack',
    'n8n-nodes-base.gmail': 'gmail',
    'n8n-nodes-base.emailSend': 'smtp',
    'n8n-nodes-base.httpRequest': 'http',
    'n8n-nodes-base.postgres': 'postgres',
    'n8n-nodes-base.googleSheets': 'googlesheets',
    'n8n-nodes-base.hubspot': 'hubspot',
    'n8n-nodes-base.sendGrid': 'sendgrid',
    'n8n-nodes-base.telegram': 'telegram',
    'n8n-nodes-base.twilio': 'twilio'
  };

  const missing: Array<{ nodeName: string; service: string; nodeType: string; n8nCredentialType: string; fields: any[] }> = [];

  // Create a map of services user has credentials for
  const userServices = new Set(userCredentials.map(cred => cred.service));

  workflow.nodes.forEach(node => {
    const serviceId = nodeServiceMapping[node.type];
    
    // If this node type requires credentials
    if (serviceId) {
      // Check if user has credentials for this service
      if (!userServices.has(serviceId)) {
        const integration = getIntegration(serviceId);
        
        if (integration) {
          // Get field definitions from integration config
          const fields = integration.apiKey?.fields.map(field => ({
            name: field.name,
            type: field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'string',
            required: field.required,
            description: field.label,
            placeholder: field.placeholder
          })) || [];

          missing.push({
            nodeName: node.name,
            service: integration.name,
            nodeType: node.type,
            n8nCredentialType: integration.n8nCredentialType,
            fields,
            required: true
          } as any);
        }
      }
    }
  });

  if (missing.length === 0) {
    return { valid: true, missing: [], message: '' };
  }

  // Create a user-friendly message
  const serviceList = [...new Set(missing.map(m => m.service))].join(', ');
  const nodeList = missing.map(m => `• ${m.nodeName} (requires ${m.service})`).join('\n');
  
  const message = `Please add credentials for the following services before deploying:\n\n${nodeList}\n\nAuthenticate with ${serviceList} to continue.`;

  return {
    valid: false,
    missing,
    message
  };
}

/**
 * Helper: Map user credentials to workflow nodes
 * Creates n8n credentials from user's stored tokens and attaches to nodes
 */
async function mapUserCredentialsToWorkflow(
  workflow: N8nWorkflow,
  userId: string,
  userCredentials: any[],
  n8nClient: N8nApiClient,
  credentialRepo: CredentialRepository
): Promise<N8nWorkflow> {
  
  if (!userCredentials || userCredentials.length === 0) {
    console.log('[Deploy] No user credentials found - workflow will need manual credential setup in n8n');
    return workflow;
  }

  // Create a map of service -> credential for quick lookup
  const credentialMap = new Map();
  userCredentials.forEach(cred => {
    credentialMap.set(cred.service, cred);
  });

  // Map node types to services
  const nodeServiceMapping: Record<string, string> = {
    'n8n-nodes-base.slack': 'slack',
    'n8n-nodes-base.gmail': 'gmail',
    'n8n-nodes-base.emailSend': 'smtp',
    'n8n-nodes-base.httpRequest': 'http',
    'n8n-nodes-base.postgres': 'postgres',
    'n8n-nodes-base.googleSheets': 'googleSheets',
    'n8n-nodes-base.hubspot': 'hubspot',
    'n8n-nodes-base.sendGrid': 'sendgrid'
  };

  const updatedNodes = await Promise.all(
    workflow.nodes.map(async (node) => {
      const service = nodeServiceMapping[node.type];
      
      if (!service || !credentialMap.has(service)) {
        // No credentials needed or not available for this node
        return node;
      }

      try {
        const credential = credentialMap.get(service);
        
        // Check if we already created credentials in n8n for this credential
        let credentialId = credential.n8n_credential_id;

        if (!credentialId) {
          // Create new credential in n8n
          credentialId = await n8nClient.createCredentials(
            service,
            userId,
            credential.credential_data
          );
          
          // Store credentialId back to database for reuse
          await credentialRepo.updateN8nCredentialId(credential.id, credentialId);
          console.log(`[Deploy] Created n8n credential for ${service}: ${credentialId}`);
        } else {
          console.log(`[Deploy] Reusing existing n8n credential for ${service}: ${credentialId}`);
        }

        // Attach credential to node
        const credentialType = {
          slack: 'slackApi',
          gmail: 'gmailOAuth2',
          smtp: 'smtp',
          http: 'httpBasicAuth',
          postgres: 'postgres',
          googleSheets: 'googleSheetsOAuth2',
          hubspot: 'hubspotOAuth2',
          sendgrid: 'sendGridApi'
        }[service];

        return {
          ...node,
          credentials: {
            [credentialType!]: {
              id: credentialId,
              name: `${userId.substring(0, 8)}_${service}`
            }
          }
        };
      } catch (error) {
        console.error(`[Deploy] Failed to create credential for ${service}:`, error);
        // Return node without credentials - user can add manually
        return node;
      }
    })
  );

  return {
    ...workflow,
    nodes: updatedNodes
  };
}
