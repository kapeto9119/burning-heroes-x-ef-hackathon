/**
 * Managed AI Service
 * Provides AI capabilities using YOUR API keys
 * Uses Fireworks AI for 70-87% cost savings!
 * Tracks usage and enforces plan limits
 */

import OpenAI from 'openai'; // Fireworks is OpenAI-compatible!
import { Pool } from 'pg';
import { UsageLimiter } from './usage-limiter';

export interface AIRequest {
  userId: string;
  workflowId?: string;
  model: string;
  operation: 'text' | 'image' | 'audio' | 'chat';
  params: any;
}

export interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
  usage?: {
    tokens: number;
    cost: number;
  };
}

export class ManagedAIService {
  private fireworks: OpenAI; // Fireworks uses OpenAI SDK!
  private usageLimiter: UsageLimiter;

  constructor(pool: Pool) {
    // Initialize Fireworks AI (OpenAI-compatible API)
    this.fireworks = new OpenAI({
      apiKey: process.env.FIREWORKS_API_KEY!,
      baseURL: 'https://api.fireworks.ai/inference/v1'
    });

    this.usageLimiter = new UsageLimiter(pool);
  }

  /**
   * Execute AI request with usage tracking
   */
  async execute(request: AIRequest): Promise<AIResponse> {
    try {
      // Check if user can use this model
      const modelCheck = await this.usageLimiter.canUseModel(request.userId, request.model);
      if (!modelCheck.allowed) {
        return {
          success: false,
          error: modelCheck.reason
        };
      }

      // Check execution limit
      const executionCheck = await this.usageLimiter.canExecuteWorkflow(request.userId);
      if (!executionCheck.allowed) {
        return {
          success: false,
          error: executionCheck.reason
        };
      }

      // Execute with Fireworks AI
      const result = await this.executeFireworks(request);

      // Track usage if successful
      if (result.success && result.usage && request.workflowId) {
        await this.usageLimiter.trackExecution(
          request.userId,
          request.workflowId,
          'success',
          {
            model: request.model,
            tokens: result.usage.tokens,
            cost: result.usage.cost
          }
        );
      }

      return result;
    } catch (error: any) {
      console.error('[Managed AI] Execution error:', error);
      return {
        success: false,
        error: error.message || 'AI execution failed'
      };
    }
  }

  /**
   * Execute Fireworks AI request (OpenAI-compatible)
   */
  private async executeFireworks(request: AIRequest): Promise<AIResponse> {
    try {
      if (request.operation === 'text' || request.operation === 'chat') {
        const completion = await this.fireworks.chat.completions.create({
          model: request.model,
          messages: request.params.messages || [
            { role: 'user', content: request.params.prompt || request.params.text }
          ],
          temperature: request.params.temperature || 0.7,
          max_tokens: request.params.maxTokens || 1000
        });

        const tokens = completion.usage?.total_tokens || 0;
        const cost = this.usageLimiter.calculateAICost(request.model, tokens);

        return {
          success: true,
          data: {
            content: completion.choices[0]?.message?.content,
            model: completion.model,
            finishReason: completion.choices[0]?.finish_reason
          },
          usage: { tokens, cost }
        };
      }

      // For image generation, you can use Stable Diffusion on Fireworks
      if (request.operation === 'image') {
        return {
          success: false,
          error: 'Image generation: Use Stable Diffusion model on Fireworks or integrate DALL-E separately'
        };
      }

      return {
        success: false,
        error: `Unsupported operation: ${request.operation}`
      };
    } catch (error: any) {
      console.error('[Fireworks AI] Error:', error);
      return {
        success: false,
        error: error.message || 'Fireworks AI request failed'
      };
    }
  }

  /**
   * Get user's remaining quota
   */
  async getUserQuota(userId: string) {
    const limits = await this.usageLimiter.getUserLimits(userId);
    if (!limits) {
      return null;
    }

    return {
      executions: {
        used: limits.executionsUsed,
        limit: limits.executionsLimit,
        remaining: limits.executionsLimit - limits.executionsUsed,
        percentage: Math.round((limits.executionsUsed / limits.executionsLimit) * 100)
      },
      workflows: {
        active: limits.activeWorkflows,
        limit: limits.activeWorkflowsLimit,
        remaining: limits.activeWorkflowsLimit - limits.activeWorkflows
      },
      plan: limits.planTier,
      allowedModels: limits.allowedModels,
      resetDate: limits.currentPeriodEnd
    };
  }
}
