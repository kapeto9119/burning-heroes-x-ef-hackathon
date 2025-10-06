/**
 * Usage Limiter Service
 * Enforces subscription limits and tracks usage
 */

import { Pool } from 'pg';

export interface UsageLimits {
  executionsUsed: number;
  executionsLimit: number;
  activeWorkflows: number;
  activeWorkflowsLimit: number;
  allowedModels: string[];
  planTier: string;
  status: string;
  currentPeriodEnd: Date;
}

export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
  limits?: UsageLimits;
  upgradeUrl?: string;
}

export class UsageLimiter {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Check if user can execute a workflow
   */
  async canExecuteWorkflow(userId: string): Promise<UsageCheckResult> {
    const limits = await this.getUserLimits(userId);

    if (!limits) {
      return {
        allowed: false,
        reason: 'No subscription found. Please contact support.'
      };
    }

    // Check if subscription is active
    if (limits.status !== 'active') {
      return {
        allowed: false,
        reason: `Subscription is ${limits.status}. Please update your billing information.`,
        limits,
        upgradeUrl: '/billing'
      };
    }

    // Check execution limit
    if (limits.executionsUsed >= limits.executionsLimit) {
      return {
        allowed: false,
        reason: `You've reached your monthly limit of ${limits.executionsLimit} executions. Upgrade to continue.`,
        limits,
        upgradeUrl: '/pricing'
      };
    }

    return {
      allowed: true,
      limits
    };
  }

  /**
   * Check if user can activate a workflow
   */
  async canActivateWorkflow(userId: string): Promise<UsageCheckResult> {
    const limits = await this.getUserLimits(userId);

    if (!limits) {
      return {
        allowed: false,
        reason: 'No subscription found.'
      };
    }

    if (limits.activeWorkflows >= limits.activeWorkflowsLimit) {
      return {
        allowed: false,
        reason: `You have ${limits.activeWorkflows}/${limits.activeWorkflowsLimit} active workflows. Deactivate one or upgrade your plan.`,
        limits,
        upgradeUrl: '/pricing'
      };
    }

    return {
      allowed: true,
      limits
    };
  }

  /**
   * Check if user can use a specific AI model
   */
  async canUseModel(userId: string, model: string): Promise<UsageCheckResult> {
    const limits = await this.getUserLimits(userId);

    if (!limits) {
      return {
        allowed: false,
        reason: 'No subscription found.'
      };
    }

    if (!limits.allowedModels.includes(model)) {
      return {
        allowed: false,
        reason: `Model "${model}" is not available on your ${limits.planTier} plan. Upgrade to access it.`,
        limits,
        upgradeUrl: '/pricing'
      };
    }

    return {
      allowed: true,
      limits
    };
  }

  /**
   * Get user's current limits
   */
  async getUserLimits(userId: string): Promise<UsageLimits | null> {
    const result = await this.pool.query(
      `SELECT 
        s.plan_tier,
        s.status,
        s.executions_used,
        s.executions_limit,
        s.active_workflows_count,
        s.active_workflows_limit,
        s.current_period_end,
        p.allowed_models
      FROM user_subscriptions s
      JOIN plan_limits p ON s.plan_tier = p.plan_tier
      WHERE s.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      planTier: row.plan_tier,
      status: row.status,
      executionsUsed: row.executions_used,
      executionsLimit: row.executions_limit,
      activeWorkflows: row.active_workflows_count,
      activeWorkflowsLimit: row.active_workflows_limit,
      allowedModels: row.allowed_models,
      currentPeriodEnd: row.current_period_end
    };
  }

  /**
   * Get usage summary for user
   */
  async getUsageSummary(userId: string) {
    const result = await this.pool.query(
      `SELECT * FROM user_usage_summary WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Track workflow execution
   */
  async trackExecution(
    userId: string,
    workflowId: string,
    status: 'success' | 'failed' | 'running',
    aiUsage?: {
      model: string;
      tokens: number;
      cost: number;
    }
  ): Promise<string> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Insert execution record
      const executionResult = await client.query(
        `INSERT INTO workflow_executions 
        (user_id, workflow_id, status, ai_tokens_used, ai_cost_usd, started_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id`,
        [userId, workflowId, status, aiUsage?.tokens || 0, aiUsage?.cost || 0]
      );

      const executionId = executionResult.rows[0].id;

      // Log AI usage if provided
      if (aiUsage) {
        await client.query(
          `INSERT INTO ai_usage_logs 
          (execution_id, user_id, workflow_id, model, provider, tokens_used, cost_usd)
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            executionId,
            userId,
            workflowId,
            aiUsage.model,
            this.getProviderFromModel(aiUsage.model),
            aiUsage.tokens,
            aiUsage.cost
          ]
        );
      }

      await client.query('COMMIT');
      return executionId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update execution status
   */
  async updateExecutionStatus(
    executionId: string,
    status: 'success' | 'failed',
    error?: string
  ) {
    await this.pool.query(
      `UPDATE workflow_executions 
      SET status = $1, completed_at = NOW(), error_message = $2
      WHERE id = $3`,
      [status, error, executionId]
    );
  }

  /**
   * Check if user is approaching limits (for warnings)
   */
  async getUsageWarnings(userId: string): Promise<string[]> {
    const limits = await this.getUserLimits(userId);
    if (!limits) return [];

    const warnings: string[] = [];

    // Check execution usage
    const usagePercentage = (limits.executionsUsed / limits.executionsLimit) * 100;
    if (usagePercentage >= 80 && usagePercentage < 100) {
      warnings.push(
        `You've used ${limits.executionsUsed}/${limits.executionsLimit} executions (${Math.round(usagePercentage)}%). Consider upgrading.`
      );
    }

    // Check active workflows
    if (limits.activeWorkflows >= limits.activeWorkflowsLimit - 1) {
      warnings.push(
        `You have ${limits.activeWorkflows}/${limits.activeWorkflowsLimit} active workflows. You're at the limit.`
      );
    }

    // Check period end
    const daysUntilReset = Math.ceil(
      (limits.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilReset <= 3 && usagePercentage >= 90) {
      warnings.push(
        `Your usage resets in ${daysUntilReset} days. You're at ${Math.round(usagePercentage)}% of your limit.`
      );
    }

    return warnings;
  }

  /**
   * Get provider from model name
   */
  private getProviderFromModel(model: string): string {
    if (model.startsWith('gpt') || model.startsWith('dall-e') || model.startsWith('whisper')) {
      return 'openai';
    }
    if (model.startsWith('claude')) {
      return 'anthropic';
    }
    if (model.startsWith('gemini')) {
      return 'google';
    }
    if (model.includes('stable-diffusion')) {
      return 'stability';
    }
    return 'unknown';
  }

  /**
   * Calculate AI cost based on model and tokens
   * Using Fireworks AI pricing (70-87% cheaper than OpenAI!)
   */
  calculateAICost(model: string, tokens: number): number {
    // Fireworks AI costs per 1M tokens (as of 2025)
    const costs: Record<string, number> = {
      // Fireworks AI Models (MUCH cheaper!)
      'accounts/fireworks/models/llama-v3p1-70b-instruct': 0.90,
      'accounts/fireworks/models/llama-v3p1-8b-instruct': 0.20,
      'accounts/fireworks/models/mixtral-8x7b-instruct': 0.50,
      'accounts/fireworks/models/mixtral-8x22b-instruct': 1.20,
      
      // Simplified model names
      'llama-3.1-70b': 0.90,
      'llama-3.1-8b': 0.20,
      'mixtral-8x7b': 0.50,
      'mixtral-8x22b': 1.20,
      
      // Legacy OpenAI (if you still use them)
      'gpt-4o': 2.50,
      'gpt-4o-mini': 0.15,
      'gpt-4': 30.00,
      'claude-3-5-sonnet': 3.00,
      
      // Image generation
      'stable-diffusion-xl': 0.02, // Fireworks pricing per image
      'dall-e-3': 0.04 // OpenAI pricing per image
    };

    const costPer1M = costs[model] || 0.50; // Default to Mixtral pricing
    return (tokens / 1_000_000) * costPer1M;
  }
}
