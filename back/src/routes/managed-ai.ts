import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { ManagedAIService } from '../services/managed-ai-service';
import { ApiResponse } from '../types';

/**
 * Managed AI Routes
 * Provides AI capabilities using YOUR Fireworks credentials
 * Users don't need their own API keys - you handle it and charge via billing
 */
export function createManagedAIRouter(pool: Pool): Router {
  const router = Router();
  const managedAI = new ManagedAIService(pool);

  /**
   * POST /api/managed-ai/chat
   * Text generation (chat completions)
   * For use in user workflows via HTTP Request node
   */
  router.post('/chat', async (req: Request, res: Response) => {
    try {
      const {
        userId,
        workflowId,
        prompt,
        messages,
        model = 'accounts/fireworks/models/llama-v3p1-70b-instruct',
        temperature = 0.7,
        maxTokens = 1000
      } = req.body;

      // Validate required fields
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId is required'
        } as ApiResponse);
      }

      if (!prompt && !messages) {
        return res.status(400).json({
          success: false,
          error: 'Either prompt or messages is required'
        } as ApiResponse);
      }

      // Build messages array
      const chatMessages = messages || [
        { role: 'user', content: prompt }
      ];

      // Execute AI request with usage tracking
      const result = await managedAI.execute({
        userId,
        workflowId,
        model,
        operation: 'chat',
        params: {
          messages: chatMessages,
          temperature,
          maxTokens
        }
      });

      if (!result.success) {
        return res.status(403).json({
          success: false,
          error: result.error
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: {
          content: result.data?.content,
          model: result.data?.model,
          usage: result.usage
        }
      } as ApiResponse);

    } catch (error: any) {
      console.error('[Managed AI] Chat error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'AI generation failed'
      } as ApiResponse);
    }
  });

  /**
   * POST /api/managed-ai/image
   * Image generation (Stable Diffusion via Fireworks)
   */
  router.post('/image', async (req: Request, res: Response) => {
    try {
      const {
        userId,
        workflowId,
        prompt,
        model = 'accounts/fireworks/models/stable-diffusion-xl-1024-v1-0',
        width = 1024,
        height = 1024
      } = req.body;

      if (!userId || !prompt) {
        return res.status(400).json({
          success: false,
          error: 'userId and prompt are required'
        } as ApiResponse);
      }

      const result = await managedAI.execute({
        userId,
        workflowId,
        model,
        operation: 'image',
        params: {
          prompt,
          width,
          height
        }
      });

      if (!result.success) {
        return res.status(403).json({
          success: false,
          error: result.error
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: result.data
      } as ApiResponse);

    } catch (error: any) {
      console.error('[Managed AI] Image generation error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Image generation failed'
      } as ApiResponse);
    }
  });

  /**
   * POST /api/managed-ai/generate-content
   * Simplified endpoint for common use case: generate text from a prompt
   * Perfect for email content, social media posts, etc.
   */
  router.post('/generate-content', async (req: Request, res: Response) => {
    try {
      const {
        userId,
        workflowId,
        prompt,
        context,
        model = 'accounts/fireworks/models/llama-v3p1-70b-instruct'
      } = req.body;

      if (!userId || !prompt) {
        return res.status(400).json({
          success: false,
          error: 'userId and prompt are required'
        } as ApiResponse);
      }

      // Build a more structured prompt with context if provided
      const fullPrompt = context 
        ? `Context: ${context}\n\nTask: ${prompt}\n\nGenerate the content:`
        : prompt;

      const result = await managedAI.execute({
        userId,
        workflowId,
        model,
        operation: 'chat',
        params: {
          messages: [{ role: 'user', content: fullPrompt }],
          temperature: 0.7,
          maxTokens: 1000
        }
      });

      if (!result.success) {
        return res.status(403).json({
          success: false,
          error: result.error
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: {
          content: result.data?.content,
          usage: result.usage
        }
      } as ApiResponse);

    } catch (error: any) {
      console.error('[Managed AI] Content generation error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Content generation failed'
      } as ApiResponse);
    }
  });

  /**
   * GET /api/managed-ai/quota
   * Check user's remaining AI quota
   */
  router.get('/quota/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const quota = await managedAI.getUserQuota(userId);
      
      if (!quota) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: quota
      } as ApiResponse);

    } catch (error: any) {
      console.error('[Managed AI] Quota check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get quota'
      } as ApiResponse);
    }
  });

  /**
   * GET /api/managed-ai/models
   * List available models for the user's plan
   */
  router.get('/models', async (req: Request, res: Response) => {
    try {
      const models = [
        {
          id: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
          name: 'Llama 3.1 70B',
          type: 'text',
          description: 'Fast, powerful open-source model',
          tier: 'free'
        },
        {
          id: 'accounts/fireworks/models/llama-v3p1-405b-instruct',
          name: 'Llama 3.1 405B',
          type: 'text',
          description: 'Most powerful open-source model',
          tier: 'pro'
        },
        {
          id: 'accounts/fireworks/models/mixtral-8x7b-instruct',
          name: 'Mixtral 8x7B',
          type: 'text',
          description: 'Efficient mixture-of-experts model',
          tier: 'free'
        },
        {
          id: 'accounts/fireworks/models/stable-diffusion-xl-1024-v1-0',
          name: 'Stable Diffusion XL',
          type: 'image',
          description: 'High-quality image generation',
          tier: 'pro'
        }
      ];

      res.json({
        success: true,
        data: models
      } as ApiResponse);

    } catch (error: any) {
      console.error('[Managed AI] Models list error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get models'
      } as ApiResponse);
    }
  });

  return router;
}
