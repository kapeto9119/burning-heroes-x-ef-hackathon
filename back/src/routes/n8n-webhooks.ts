import { Router, Request, Response } from 'express';
import { DeploymentRepository, ExecutionRepository } from '../repositories/deployment-repository';
import { Pool } from 'pg';

/**
 * Webhook endpoint for n8n to notify us about execution completions
 * This enables real-time updates for scheduled and webhook-triggered workflows
 */
export function createN8nWebhookRouter(dbPool: Pool): Router {
  const router = Router();
  const deploymentRepo = new DeploymentRepository(dbPool);
  const executionRepo = new ExecutionRepository(dbPool);

  /**
   * POST /api/n8n-webhooks/execution-complete
   * Called by n8n when a workflow execution completes
   */
  router.post('/execution-complete', async (req: Request, res: Response) => {
    try {
      const {
        workflowId,
        n8nWorkflowId,
        n8nExecutionId,
        status,
        startedAt,
        finishedAt,
        error,
        data
      } = req.body;

      console.log('[n8n Webhook] Execution complete:', {
        workflowId,
        n8nExecutionId,
        status
      });

      // Find deployment to get userId
      const deployment = await deploymentRepo.findByWorkflowId(workflowId);
      
      if (!deployment) {
        console.warn('[n8n Webhook] Deployment not found:', workflowId);
        return res.status(404).json({ 
          success: false, 
          error: 'Deployment not found' 
        });
      }

      // Calculate duration
      const durationMs = finishedAt && startedAt
        ? new Date(finishedAt).getTime() - new Date(startedAt).getTime()
        : null;

      // Save execution to database
      await executionRepo.create({
        deploymentId: deployment.id!,
        workflowId,
        userId: deployment.userId,
        n8nExecutionId,
        status: status === 'success' ? 'success' : 'error',
        startedAt: new Date(startedAt),
        finishedAt: finishedAt ? new Date(finishedAt) : undefined,
        durationMs: durationMs || undefined,
        triggerType: 'auto', // Could be schedule or webhook
        errorMessage: error,
        outputData: data
      });

      // Update deployment stats
      await deploymentRepo.updateExecutionStats(
        workflowId,
        true,
        status === 'error'
      );

      // Emit WebSocket event for real-time UI update
      const wsService = (req.app as any).wsService;
      if (wsService) {
        wsService.emitExecutionCompleted(
          deployment.userId,
          workflowId,
          n8nExecutionId,
          status === 'success' ? 'success' : 'error',
          data
        );
        console.log('[n8n Webhook] WebSocket event emitted');
      }

      res.json({ 
        success: true,
        message: 'Execution recorded and notification sent'
      });

    } catch (error: any) {
      console.error('[n8n Webhook] Error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  /**
   * POST /api/n8n-webhooks/execution-started
   * Called by n8n when a workflow execution starts
   */
  router.post('/execution-started', async (req: Request, res: Response) => {
    try {
      const { workflowId, n8nExecutionId } = req.body;

      console.log('[n8n Webhook] Execution started:', {
        workflowId,
        n8nExecutionId
      });

      // Find deployment to get userId
      const deployment = await deploymentRepo.findByWorkflowId(workflowId);
      
      if (!deployment) {
        return res.status(404).json({ 
          success: false, 
          error: 'Deployment not found' 
        });
      }

      // Emit WebSocket event
      const wsService = (req.app as any).wsService;
      if (wsService) {
        wsService.emitExecutionStarted(
          deployment.userId,
          workflowId,
          n8nExecutionId
        );
      }

      res.json({ success: true });

    } catch (error: any) {
      console.error('[n8n Webhook] Error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  return router;
}
