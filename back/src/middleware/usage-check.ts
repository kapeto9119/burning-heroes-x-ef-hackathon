/**
 * Usage Check Middleware
 * Enforces subscription limits before workflow operations
 */

import { Request, Response, NextFunction } from 'express';
import { UsageLimiter } from '../services/usage-limiter';
import { pool } from '../db';

const usageLimiter = new UsageLimiter(pool);

/**
 * Check if user can execute workflows
 */
export async function checkExecutionLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const check = await usageLimiter.canExecuteWorkflow(userId);

    if (!check.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Execution limit reached',
        message: check.reason,
        limits: check.limits,
        upgradeUrl: check.upgradeUrl
      });
    }

    // Attach limits to request for later use
    (req as any).usageLimits = check.limits;
    next();
  } catch (error) {
    console.error('[Usage Check] Error:', error);
    res.status(500).json({ error: 'Failed to check usage limits' });
  }
}

/**
 * Check if user can activate workflows
 */
export async function checkActivationLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const check = await usageLimiter.canActivateWorkflow(userId);

    if (!check.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Active workflow limit reached',
        message: check.reason,
        limits: check.limits,
        upgradeUrl: check.upgradeUrl
      });
    }

    next();
  } catch (error) {
    console.error('[Usage Check] Error:', error);
    res.status(500).json({ error: 'Failed to check usage limits' });
  }
}

/**
 * Check if user can use a specific AI model
 */
export async function checkModelAccess(model: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const check = await usageLimiter.canUseModel(userId, model);

      if (!check.allowed) {
        return res.status(403).json({
          success: false,
          error: 'Model not available',
          message: check.reason,
          limits: check.limits,
          upgradeUrl: check.upgradeUrl
        });
      }

      next();
    } catch (error) {
      console.error('[Usage Check] Error:', error);
      res.status(500).json({ error: 'Failed to check model access' });
    }
  };
}

/**
 * Get usage warnings for user (non-blocking)
 */
export async function attachUsageWarnings(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.id;
    
    if (userId) {
      const warnings = await usageLimiter.getUsageWarnings(userId);
      (req as any).usageWarnings = warnings;
    }
    
    next();
  } catch (error) {
    // Non-blocking - just log and continue
    console.error('[Usage Warnings] Error:', error);
    next();
  }
}
