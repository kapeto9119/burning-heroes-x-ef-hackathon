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

      // Deploy to n8n
      const n8nWorkflowId = await n8nClient.createWorkflow(workflowWithCredentials, userId);

      // Activate the workflow
      await n8nClient.activateWorkflow(n8nWorkflowId);

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
        status: 'active',
        deployedAt: new Date()
      };

      deployments.set(deploymentRecord.workflowId, deploymentRecord);

      const response: DeploymentResponse = {
        n8nWorkflowId,
        webhookUrl,
        status: 'active',
        deployedAt: deploymentRecord.deployedAt
      };

      res.json({
        success: true,
        data: response,
        message: 'Workflow deployed successfully'
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

  return router;
}

/**
 * Helper: Map user credentials to workflow nodes
 * For hackathon: Skip credential creation, workflows will use manual credential setup in n8n
 */
async function mapUserCredentialsToWorkflow(
  workflow: N8nWorkflow,
  userId: string,
  userCredentials: any,
  n8nClient: N8nApiClient
): Promise<N8nWorkflow> {
  // For hackathon demo: Return workflow without credentials
  // Users will need to manually configure credentials in n8n UI
  // In production: Implement OAuth flows for each service
  
  console.log('[Deploy] Skipping credential creation - credentials must be configured in n8n UI');
  
  // Remove credentials from nodes to avoid validation errors
  const nodesWithoutCredentials = workflow.nodes.map(node => {
    const { credentials, ...nodeWithoutCreds } = node;
    return nodeWithoutCreds;
  });

  return {
    ...workflow,
    nodes: nodesWithoutCredentials
  };
}
