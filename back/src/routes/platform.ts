import { Router, Request, Response } from "express";
import { PlatformKnowledgeService } from "../services/platform-knowledge-service";

export function createPlatformRouter(
  platformKnowledge: PlatformKnowledgeService
): Router {
  const router = Router();

  // Force refresh cache
  router.post("/refresh", async (req: Request, res: Response) => {
    try {
      await platformKnowledge.refresh();
      res.json({ success: true });
    } catch (e: any) {
      res
        .status(500)
        .json({ success: false, error: e?.message || "refresh failed" });
    }
  });

  // Get current summary text
  router.get("/summary", async (req: Request, res: Response) => {
    try {
      const summary = await platformKnowledge.getSummaryText();
      res.json({ success: true, data: { summary } });
    } catch (e: any) {
      res
        .status(500)
        .json({ success: false, error: e?.message || "summary failed" });
    }
  });

  return router;
}
