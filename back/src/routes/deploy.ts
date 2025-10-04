import { Router, Request, Response } from 'express';
import { N8nApiClient } from '../services/n8n-api-client';
import { AuthService } from '../services/auth-service';
import { createAuthMiddleware } from '../middleware/auth';
import { N8nWorkflow, ApiResponse, DeploymentResponse } from '../types';

// In-memory deployment tracking (replace with database in production)
interface DeploymentRecord {
  workflowId: string;
  n8nWorkflowId: string;
  userId: string;
  webhookUrl?: string;
  status: 'active' | 'inactive';
  deployedAt: Date;
}

const deployments: Map<string, DeploymentRecord> = new Map();

// Sample deployed workflows for demo
const sampleDeployments: DeploymentRecord[] = [
  {
    workflowId: 'deploy_sample_1',
    n8nWorkflowId: '1',
    userId: 'demo_user_123',
    webhookUrl: 'http://localhost:5678/webhook/standup-reminder',
    status: 'active',
    deployedAt: new Date('2025-01-15T09:00:00Z')
  },
  {
    workflowId: 'deploy_sample_2',
    n8nWorkflowId: '2',
    userId: 'demo_user_123',
    webhookUrl: 'http://localhost:5678/webhook/email-alerts',
    status: 'active',
    deployedAt: new Date('2025-01-20T14:30:00Z')
  },
  {
    workflowId: 'deploy_sample_3',
    n8nWorkflowId: '3',
    userId: 'demo_user_123',
    status: 'inactive',
    deployedAt: new Date('2025-01-22T11:15:00Z')
  }
];

// Initialize with sample data
sampleDeployments.forEach(deployment => {
  deployments.set(deployment.workflowId, deployment);
});

export function createDeployRouter(
  n8nClient: N8nApiClient,
  authService: AuthService
): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(authService);

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

      // Get user credentials
      const userCredentials = authService.getUserById(userId)?.credentials;

      // Map user credentials to n8n credential IDs
      // For demo: We'll create credentials in n8n on-the-fly
      const workflowWithCredentials = await mapUserCredentialsToWorkflow(
        workflow,
        userId,
        userCredentials,
        n8nClient
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

      // Store deployment record
      const deploymentRecord: DeploymentRecord = {
        workflowId: workflow.id || `wf_${Date.now()}`,
        n8nWorkflowId,
        userId,
        webhookUrl,
        status: 'inactive', // Starts inactive, user activates manually
        deployedAt: new Date()
      };

      deployments.set(deploymentRecord.workflowId, deploymentRecord);

      const response: DeploymentResponse = {
        n8nWorkflowId,
        webhookUrl,
        status: 'inactive',
        deployedAt: deploymentRecord.deployedAt
      };

      res.json({
        success: true,
        data: {
          ...response,
          workflowId: deploymentRecord.workflowId // Include for activation
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
   * POST /api/deploy/:workflowId/execute
   * Execute a deployed workflow
   */
  router.post('/:workflowId/execute', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { workflowId } = req.params;
      const { data } = req.body;
      const userId = req.user!.userId;

      const deployment = deployments.get(workflowId);

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

      const result = await n8nClient.executeWorkflow(deployment.n8nWorkflowId, data);

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

      const deployment = deployments.get(workflowId);

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

      const deployment = deployments.get(workflowId);

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

      // Remove from deployments
      deployments.delete(workflowId);

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

      const userDeployments = Array.from(deployments.values())
        .filter(d => d.userId === userId);

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

      const deployment = deployments.get(workflowId);

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
      deployment.status = 'active';
      deployments.set(workflowId, deployment);

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

      const deployment = deployments.get(workflowId);

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
      deployment.status = 'inactive';
      deployments.set(workflowId, deployment);

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

  return router;
}

/**
 * Helper: Map user credentials to workflow nodes
 * Creates n8n credentials from user's stored tokens and attaches to nodes
 */
async function mapUserCredentialsToWorkflow(
  workflow: N8nWorkflow,
  userId: string,
  userCredentials: any,
  n8nClient: N8nApiClient
): Promise<N8nWorkflow> {
  
  if (!userCredentials || Object.keys(userCredentials).length === 0) {
    console.log('[Deploy] No user credentials found - workflow will need manual credential setup in n8n');
    return workflow;
  }

  // Map node types to services
  const nodeServiceMapping: Record<string, string> = {
    'n8n-nodes-base.slack': 'slack',
    'n8n-nodes-base.gmail': 'gmail',
    'n8n-nodes-base.emailSend': 'email',
    'n8n-nodes-base.httpRequest': 'http',
    'n8n-nodes-base.postgres': 'postgres',
    'n8n-nodes-base.googleSheets': 'googleSheets'
  };

  const updatedNodes = await Promise.all(
    workflow.nodes.map(async (node) => {
      const service = nodeServiceMapping[node.type];
      
      if (!service || !userCredentials[service]) {
        // No credentials needed or not available for this node
        return node;
      }

      try {
        // Check if we already created credentials for this service
        let credentialId = userCredentials[service].n8nCredentialId;

        if (!credentialId) {
          // Create new credential in n8n
          credentialId = await n8nClient.createCredentials(
            service,
            userId,
            userCredentials[service]
          );
          
          // TODO: Store credentialId back to user's credentials for reuse
          console.log(`[Deploy] Created n8n credential for ${service}: ${credentialId}`);
        } else {
          console.log(`[Deploy] Reusing existing n8n credential for ${service}: ${credentialId}`);
        }

        // Attach credential to node
        const credentialType = {
          slack: 'slackApi',
          gmail: 'gmailOAuth2',
          email: 'smtp',
          http: 'httpBasicAuth',
          postgres: 'postgres',
          googleSheets: 'googleSheetsOAuth2'
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
