import { Router, Request, Response } from "express";
import { WorkflowGenerator } from "../services/workflow-generator";
import { ApiResponse } from "../types";
import axios from "axios";

const PIPECAT_SERVICE_URL =
  process.env.PIPECAT_SERVICE_URL || "http://localhost:8765";

export function createPipecatRouter(
  workflowGenerator: WorkflowGenerator
): Router {
  const router = Router();

  /**
   * POST /api/pipecat/start-session
   * Start a new Pipecat voice session
   */
  router.post("/start-session", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      console.log("[Pipecat] Starting session for user:", userId);

      // Call Pipecat service to create Daily room
      const response = await axios.post(
        `${PIPECAT_SERVICE_URL}/start-session`,
        { user_id: userId }
      );

      const sessionData = response.data;

      console.log("[Pipecat] Session created:", sessionData.room_name);

      res.json({
        success: true,
        data: sessionData,
      } as ApiResponse);
    } catch (error: any) {
      console.error("[Pipecat] Failed to start session:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to start voice session",
      } as ApiResponse);
    }
  });

  /**
   * POST /api/pipecat/end-session
   * End a Pipecat voice session
   */
  router.post("/end-session", async (req: Request, res: Response) => {
    try {
      const { roomName } = req.body;

      console.log("[Pipecat] Ending session:", roomName);

      // Call Pipecat service to end session (optional - sessions auto-cleanup)
      try {
        await axios.post(
          `${PIPECAT_SERVICE_URL}/end-session?room_name=${roomName}`
        );
      } catch (error) {
        // Ignore errors - session might already be ended
        console.log("[Pipecat] Session already ended or not found");
      }

      res.json({
        success: true,
        message: "Session ended",
      } as ApiResponse);
    } catch (error: any) {
      console.error("[Pipecat] Failed to end session:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to end session",
      } as ApiResponse);
    }
  });

  /**
   * POST /api/pipecat/generate-workflow
   * Generate workflow from Pipecat voice conversation
   * This endpoint is called by the Pipecat service's function calling
   */
  router.post("/generate-workflow", async (req: Request, res: Response) => {
    try {
      const { description, trigger, services, schedule } = req.body;

      console.log("[Pipecat] Generating workflow from voice:");
      console.log("  Description:", description);
      console.log("  Trigger:", trigger);
      console.log("  Services:", services);
      console.log("  Schedule:", schedule);

      // Build complete description
      let fullDescription = description;
      if (trigger) {
        fullDescription += `\nTrigger: ${trigger}`;
      }
      if (schedule && trigger === "schedule") {
        fullDescription += ` (${schedule})`;
      }
      if (services && services.length > 0) {
        fullDescription += `\nServices: ${services.join(", ")}`;
      }

      // Generate workflow using existing workflow generator
      const result = await workflowGenerator.generateFromDescription(
        fullDescription
      );

      console.log("[Pipecat] ✅ Workflow generated:", result.workflow.name);
      console.log(
        "[Pipecat] Credential requirements:",
        result.credentialRequirements.length
      );

      res.json({
        success: true,
        data: result,
        message: "Workflow generated successfully",
      } as ApiResponse);
    } catch (error: any) {
      console.error("[Pipecat] Workflow generation error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to generate workflow",
        details: error.message,
      } as ApiResponse);
    }
  });

  /**
   * POST /api/pipecat/search-nodes
   * Search n8n nodes for the voice agent
   */
  router.post("/search-nodes", async (req: Request, res: Response) => {
    try {
      const { query, limit = 10 } = req.body;

      console.log("[Pipecat] Searching nodes:", query);

      // Use MCP client to search nodes
      const nodes = await workflowGenerator["mcpClient"].searchNodes(query, true);
      
      // Format results for voice-friendly response
      const results = Array.isArray(nodes) ? nodes.slice(0, limit) : [];
      
      console.log(`[Pipecat] Found ${results.length} nodes for: ${query}`);

      res.json({
        success: true,
        data: {
          query,
          count: results.length,
          nodes: results.map((node: any) => ({
            name: node.displayName || node.name,
            description: node.description,
            category: node.category,
            type: node.nodeType
          }))
        },
      } as ApiResponse);
    } catch (error: any) {
      console.error("[Pipecat] Node search error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to search nodes",
        details: error.message,
      } as ApiResponse);
    }
  });

  /**
   * GET /api/pipecat/health
   * Check if Pipecat service is running
   */
  router.get("/health", async (req: Request, res: Response) => {
    try {
      const response = await axios.get(`${PIPECAT_SERVICE_URL}/health`);
      res.json({
        success: true,
        data: {
          pipecat: response.data,
          backend: "healthy",
        },
      } as ApiResponse);
    } catch (error: any) {
      res.status(503).json({
        success: false,
        error: "Pipecat service unavailable",
        details: error.message,
      } as ApiResponse);
    }
  });

  return router;
}
