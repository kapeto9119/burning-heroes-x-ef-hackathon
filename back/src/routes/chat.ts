import { Router, Request, Response } from 'express';
import { AIService } from '../services/ai-service';
import { N8nMCPClient } from '../services/n8n-mcp-client';
import { WorkflowGenerator } from '../services/workflow-generator';
import { ChatRequest, ApiResponse, ChatResponse } from '../types';

/**
 * Helper: Generate contextual suggestions
 */
function generateSuggestions(message: string): string[] {
  const suggestions = [
    'Create a Slack notification workflow',
    'Set up email automation',
    'Build a data sync workflow',
    'Add error handling to workflow'
  ];

  // Return random 2-3 suggestions
  return suggestions.sort(() => Math.random() - 0.5).slice(0, 2);
}

export function createChatRouter(
  aiService: AIService,
  mcpClient: N8nMCPClient,
  workflowGenerator: WorkflowGenerator
): Router {
  const router = Router();

  /**
   * POST /api/chat
   * Main chat endpoint for conversing with AI
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { message, conversationHistory = [] }: ChatRequest = req.body;

      if (!message || message.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        } as ApiResponse);
      }

      // AI-powered intent detection: Should we build a workflow?
      const shouldBuildWorkflow = await aiService.detectWorkflowIntent(message, conversationHistory);

      let workflow = undefined;
      let workflowDescription = message;

      if (shouldBuildWorkflow) {
        try {
          // Extract complete requirements from conversation history
          if (conversationHistory.length > 0) {
            workflowDescription = await aiService.extractWorkflowRequirements([
              ...conversationHistory,
              { role: 'user', content: message }
            ]);
            console.log('[Workflow Generation] Using extracted requirements:', workflowDescription.substring(0, 100) + '...');
          }

          // Generate the workflow
          workflow = await workflowGenerator.generateFromDescription(workflowDescription);
          console.log('[Workflow Generation] ✅ Successfully generated workflow:', workflow.name);
        } catch (error) {
          console.error('[Workflow Generation] ❌ Failed:', error);
          // Continue without workflow - AI will explain what's needed
        }
      }

      // Get AI response (after workflow generation so AI can reference it)
      const aiResponse = await aiService.chat(message, conversationHistory);

      const response: ChatResponse = {
        message: aiResponse,
        workflow,
        suggestions: generateSuggestions(message)
      };

      res.json({
        success: true,
        data: response
      } as ApiResponse<ChatResponse>);

    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process chat message'
      } as ApiResponse);
    }
  });

  /**
   * POST /api/chat/generate-workflow
   * Generate a workflow from description
   */
  router.post('/generate-workflow', async (req: Request, res: Response) => {
    try {
      const { description } = req.body;

      if (!description || description.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Description is required'
        } as ApiResponse);
      }

      const workflow = await workflowGenerator.generateFromDescription(description);

      res.json({
        success: true,
        data: workflow,
        message: 'Workflow generated successfully'
      } as ApiResponse);

    } catch (error) {
      console.error('Workflow generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate workflow'
      } as ApiResponse);
    }
  });

  return router;
}
