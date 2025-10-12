import { Router, Request, Response } from "express";
import { N8nMCPClient } from "../services/n8n-mcp-client";
import { ApiResponse, N8nWorkflow } from "../types";
import { WorkflowRepository } from "../repositories/workflow-repository";
import { AuthService } from "../services/auth-service";
import { createAuthMiddleware } from "../middleware/auth";
import { DeploymentRepository } from "../repositories/deployment-repository";
import { Pool } from "pg";

export function createWorkflowsRouter(
  mcpClient: N8nMCPClient,
  authService: AuthService,
  dbPool: Pool
): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(authService);
  const workflowRepo = new WorkflowRepository();
  const deploymentRepo = new DeploymentRepository(dbPool);

  /**
   * GET /api/workflows
   * List all workflows for the authenticated user
   */
  router.get("/", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        } as ApiResponse);
      }

      const workflowRecords = await workflowRepo.findByUser(userId);
      console.log(
        `[Workflows] Found ${workflowRecords.length} workflows for user ${userId}`
      );

      // Fetch deployment status for all workflows
      const deployments = await deploymentRepo.findByUserId(userId);
      const deploymentMap = new Map(deployments.map((d) => [d.workflowId, d]));

      // Convert to format expected by frontend (includes metadata + workflow_data + deployment info)
      const workflows = workflowRecords.map((record) => {
        const deployment = deploymentMap.get(record.id);
        return {
          id: record.id,
          name: record.name,
          description: record.description,
          nodes: record.workflow_data.nodes || [],
          connections: record.workflow_data.connections || {},
          active: record.is_active,
          settings: record.workflow_data.settings || {},
          created_at: record.created_at,
          updated_at: record.updated_at,
          // Add deployment information
          isDeployed: !!deployment,
          deployedAt: deployment?.deployedAt,
          deploymentStatus: deployment?.status,
          n8nWorkflowId: deployment?.n8nWorkflowId,
          lastExecutionAt: deployment?.lastExecutionAt,
        };
      });

      // Sort by most recent activity (updated, deployed, or executed)
      // This ensures the most important workflows appear at the top
      workflows.sort((a, b) => {
        // Get the most recent timestamp for each workflow considering:
        // - updated_at: when workflow was last modified
        // - deployedAt: when workflow was deployed to n8n
        // - lastExecutionAt: when workflow was last tested/executed
        const aTimestamps = [a.updated_at, a.deployedAt, a.lastExecutionAt]
          .filter(Boolean)
          .map((t) => new Date(t!).getTime());
        const bTimestamps = [b.updated_at, b.deployedAt, b.lastExecutionAt]
          .filter(Boolean)
          .map((t) => new Date(t!).getTime());

        const aMostRecent = Math.max(...aTimestamps);
        const bMostRecent = Math.max(...bTimestamps);

        // Sort descending (most recent first)
        return bMostRecent - aMostRecent;
      });

      res.json({
        success: true,
        data: workflows,
      } as ApiResponse<any[]>);
    } catch (error) {
      console.error("[Workflows] List error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to list workflows",
      } as ApiResponse);
    }
  });

  /**
   * GET /api/workflows/:id
   * Get a specific workflow
   */
  router.get("/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const record = await workflowRepo.findById(id);

      if (!record) {
        return res.status(404).json({
          success: false,
          error: "Workflow not found",
        } as ApiResponse);
      }

      // Return consistent format with metadata
      const workflow = {
        id: record.id,
        name: record.name,
        description: record.description,
        nodes: record.workflow_data.nodes || [],
        connections: record.workflow_data.connections || {},
        active: record.is_active,
        settings: record.workflow_data.settings || {},
        created_at: record.created_at,
        updated_at: record.updated_at,
      };

      res.json({
        success: true,
        data: workflow,
      } as ApiResponse<any>);
    } catch (error) {
      console.error("[Workflows] Get error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get workflow",
      } as ApiResponse);
    }
  });

  /**
   * POST /api/workflows
   * Create a new workflow
   */
  router.post("/", authMiddleware, async (req: Request, res: Response) => {
    try {
      const workflow: N8nWorkflow = req.body;
      const userId = req.user?.userId;
      const prompt = req.body.prompt; // Optional: original AI prompt

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        } as ApiResponse);
      }

      // Validate workflow
      const validation = await mcpClient.validateWorkflow(workflow);
      if (!validation.valid) {
        console.warn("[Workflows] Validation warnings:", validation.errors);
      }

      // Save to database
      const saved = await workflowRepo.create(userId, workflow, prompt);

      console.log(
        `[Workflows] Created workflow: ${saved.id} - ${workflow.name}`
      );

      res.status(201).json({
        success: true,
        data: {
          ...workflow,
          id: saved.id,
        },
        message: "Workflow created successfully",
      } as ApiResponse<N8nWorkflow>);
    } catch (error) {
      console.error("[Workflows] Create error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create workflow",
      } as ApiResponse);
    }
  });

  /**
   * PUT /api/workflows/:id
   * Update an existing workflow
   */
  router.put("/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updatedWorkflow: N8nWorkflow = req.body;

      // Check if exists
      const existing = await workflowRepo.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: "Workflow not found",
        } as ApiResponse);
      }

      // Validate workflow
      const validation = await mcpClient.validateWorkflow(updatedWorkflow);
      if (!validation.valid) {
        console.warn("[Workflows] Validation warnings:", validation.errors);
      }

      // Update in database
      await workflowRepo.update(id, updatedWorkflow);

      console.log(
        `[Workflows] Updated workflow: ${id} - ${updatedWorkflow.name}`
      );

      res.json({
        success: true,
        data: updatedWorkflow,
        message: "Workflow updated successfully",
      } as ApiResponse<N8nWorkflow>);
    } catch (error) {
      console.error("[Workflows] Update error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update workflow",
      } as ApiResponse);
    }
  });

  /**
   * DELETE /api/workflows/:id
   * Delete a workflow
   */
  router.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if exists
      const existing = await workflowRepo.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: "Workflow not found",
        } as ApiResponse);
      }

      // Delete from database
      await workflowRepo.delete(id);

      console.log(`[Workflows] Deleted workflow: ${id}`);

      res.json({
        success: true,
        message: "Workflow deleted successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("[Workflows] Delete error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete workflow",
      } as ApiResponse);
    }
  });

  /**
   * POST /api/workflows/:id/validate
   * Validate a workflow
   */
  router.post(
    "/:id/validate",
    authMiddleware,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        const record = await workflowRepo.findById(id);

        if (!record) {
          return res.status(404).json({
            success: false,
            error: "Workflow not found",
          } as ApiResponse);
        }

        const validation = await mcpClient.validateWorkflow(
          record.workflow_data
        );

        res.json({
          success: true,
          data: validation,
        } as ApiResponse);
      } catch (error) {
        console.error("[Workflows] Validate error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to validate workflow",
        } as ApiResponse);
      }
    }
  );

  /**
   * GET /api/workflows/search/:query
   * Search workflows by name or description
   */
  router.get("/search/:query", async (req: Request, res: Response) => {
    try {
      const { query } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        } as ApiResponse);
      }

      const records = await workflowRepo.search(userId, query);
      const workflows = records.map((record) => ({
        id: record.id,
        name: record.name,
        description: record.description,
        nodes: record.workflow_data.nodes || [],
        connections: record.workflow_data.connections || {},
        active: record.is_active,
        settings: record.workflow_data.settings || {},
        created_at: record.created_at,
        updated_at: record.updated_at,
      }));

      res.json({
        success: true,
        data: workflows,
      } as ApiResponse<any[]>);
    } catch (error) {
      console.error("[Workflows] Search error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to search workflows",
      } as ApiResponse);
    }
  });

  return router;
}
