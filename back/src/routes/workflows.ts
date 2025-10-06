import { Router, Request, Response } from 'express';
import { N8nMCPClient } from '../services/n8n-mcp-client';
import { ApiResponse, N8nWorkflow } from '../types';
import { WorkflowRepository } from '../repositories/workflow-repository';

export function createWorkflowsRouter(mcpClient: N8nMCPClient): Router {
  const router = Router();
  const workflowRepo = new WorkflowRepository();

  /**
   * GET /api/workflows
   * List all workflows for the authenticated user
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as ApiResponse);
      }
      
      const workflowRecords = await workflowRepo.findByUser(userId);
      
      // Convert to N8nWorkflow format
      const workflows = workflowRecords.map(record => record.workflow_data);

      res.json({
        success: true,
        data: workflows
      } as ApiResponse<N8nWorkflow[]>);

    } catch (error) {
      console.error('[Workflows] List error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list workflows'
      } as ApiResponse);
    }
  });

  /**
   * GET /api/workflows/:id
   * Get a specific workflow
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const record = await workflowRepo.findById(id);

      if (!record) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: record.workflow_data
      } as ApiResponse<N8nWorkflow>);

    } catch (error) {
      console.error('[Workflows] Get error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get workflow'
      } as ApiResponse);
    }
  });

  /**
   * POST /api/workflows
   * Create a new workflow
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const workflow: N8nWorkflow = req.body;
      const userId = req.user?.userId;
      const prompt = req.body.prompt; // Optional: original AI prompt
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as ApiResponse);
      }

      // Validate workflow
      const validation = await mcpClient.validateWorkflow(workflow);
      if (!validation.valid) {
        console.warn('[Workflows] Validation warnings:', validation.errors);
      }

      // Save to database
      const saved = await workflowRepo.create(userId, workflow, prompt);

      console.log(`[Workflows] Created workflow: ${saved.id} - ${workflow.name}`);

      res.status(201).json({
        success: true,
        data: {
          ...workflow,
          id: saved.id
        },
        message: 'Workflow created successfully'
      } as ApiResponse<N8nWorkflow>);

    } catch (error) {
      console.error('[Workflows] Create error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create workflow'
      } as ApiResponse);
    }
  });

  /**
   * PUT /api/workflows/:id
   * Update an existing workflow
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updatedWorkflow: N8nWorkflow = req.body;

      // Check if exists
      const existing = await workflowRepo.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        } as ApiResponse);
      }

      // Validate workflow
      const validation = await mcpClient.validateWorkflow(updatedWorkflow);
      if (!validation.valid) {
        console.warn('[Workflows] Validation warnings:', validation.errors);
      }

      // Update in database
      await workflowRepo.update(id, updatedWorkflow);

      console.log(`[Workflows] Updated workflow: ${id} - ${updatedWorkflow.name}`);

      res.json({
        success: true,
        data: updatedWorkflow,
        message: 'Workflow updated successfully'
      } as ApiResponse<N8nWorkflow>);

    } catch (error) {
      console.error('[Workflows] Update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update workflow'
      } as ApiResponse);
    }
  });

  /**
   * DELETE /api/workflows/:id
   * Delete a workflow
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if exists
      const existing = await workflowRepo.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        } as ApiResponse);
      }

      // Delete from database
      await workflowRepo.delete(id);

      console.log(`[Workflows] Deleted workflow: ${id}`);

      res.json({
        success: true,
        message: 'Workflow deleted successfully'
      } as ApiResponse);

    } catch (error) {
      console.error('[Workflows] Delete error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete workflow'
      } as ApiResponse);
    }
  });

  /**
   * POST /api/workflows/:id/validate
   * Validate a workflow
   */
  router.post('/:id/validate', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const record = await workflowRepo.findById(id);

      if (!record) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        } as ApiResponse);
      }

      const validation = await mcpClient.validateWorkflow(record.workflow_data);

      res.json({
        success: true,
        data: validation
      } as ApiResponse);

    } catch (error) {
      console.error('[Workflows] Validate error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate workflow'
      } as ApiResponse);
    }
  });

  /**
   * GET /api/workflows/search/:query
   * Search workflows by name or description
   */
  router.get('/search/:query', async (req: Request, res: Response) => {
    try {
      const { query } = req.params;
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as ApiResponse);
      }

      const records = await workflowRepo.search(userId, query);
      const workflows = records.map(record => record.workflow_data);

      res.json({
        success: true,
        data: workflows
      } as ApiResponse<N8nWorkflow[]>);

    } catch (error) {
      console.error('[Workflows] Search error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search workflows'
      } as ApiResponse);
    }
  });

  return router;
}
