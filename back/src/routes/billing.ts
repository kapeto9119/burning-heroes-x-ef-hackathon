/**
 * Billing & Subscription Routes
 */

import express from 'express';
import { StripeService } from '../services/stripe-service';
import { UsageLimiter } from '../services/usage-limiter';
import { pool } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

const stripeService = new StripeService(
  process.env.STRIPE_SECRET_KEY || '',
  pool
);
const usageLimiter = new UsageLimiter(pool);

/**
 * GET /api/billing/plans
 * Get all available subscription plans
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await stripeService.getPlans();
    res.json({ success: true, data: plans });
  } catch (error: any) {
    console.error('[Billing] Error fetching plans:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch plans',
      message: error.message 
    });
  }
});

/**
 * GET /api/billing/usage
 * Get current usage and limits
 */
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    const summary = await usageLimiter.getUsageSummary(userId);
    const warnings = await usageLimiter.getUsageWarnings(userId);

    res.json({ 
      success: true, 
      data: {
        ...summary,
        warnings
      }
    });
  } catch (error: any) {
    console.error('[Billing] Error fetching usage:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch usage',
      message: error.message 
    });
  }
});

/**
 * POST /api/billing/checkout
 * Create a checkout session for upgrading
 */
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { planTier } = req.body;

    if (!planTier) {
      return res.status(400).json({ 
        success: false, 
        error: 'Plan tier is required' 
      });
    }

    // Validate plan exists
    const plans = await stripeService.getPlans();
    const plan = plans.find(p => p.planTier === planTier);
    
    if (!plan) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid plan tier' 
      });
    }

    // Don't allow downgrade to free via checkout
    if (planTier === 'free') {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot checkout for free plan' 
      });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const checkoutUrl = await stripeService.createCheckoutSession(
      userId,
      planTier,
      `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      `${baseUrl}/pricing`
    );

    res.json({ 
      success: true, 
      data: { checkoutUrl } 
    });
  } catch (error: any) {
    console.error('[Billing] Error creating checkout:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create checkout session',
      message: error.message 
    });
  }
});

/**
 * POST /api/billing/portal
 * Create a billing portal session
 */
router.post('/portal', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    const portalUrl = await stripeService.createPortalSession(
      userId,
      `${baseUrl}/billing`
    );

    res.json({ 
      success: true, 
      data: { portalUrl } 
    });
  } catch (error: any) {
    console.error('[Billing] Error creating portal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create portal session',
      message: error.message 
    });
  }
});

/**
 * POST /api/billing/cancel
 * Cancel subscription at period end
 */
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    await stripeService.cancelSubscription(userId);

    res.json({ 
      success: true, 
      message: 'Subscription will be cancelled at the end of the billing period' 
    });
  } catch (error: any) {
    console.error('[Billing] Error cancelling subscription:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to cancel subscription',
      message: error.message 
    });
  }
});

/**
 * POST /api/billing/reactivate
 * Reactivate a cancelled subscription
 */
router.post('/reactivate', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    await stripeService.reactivateSubscription(userId);

    res.json({ 
      success: true, 
      message: 'Subscription reactivated successfully' 
    });
  } catch (error: any) {
    console.error('[Billing] Error reactivating subscription:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reactivate subscription',
      message: error.message 
    });
  }
});

/**
 * GET /api/billing/history
 * Get billing history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    const result = await pool.query(
      `SELECT * FROM billing_history 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 50`,
      [userId]
    );

    res.json({ 
      success: true, 
      data: result.rows 
    });
  } catch (error: any) {
    console.error('[Billing] Error fetching history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch billing history',
      message: error.message 
    });
  }
});

/**
 * POST /api/billing/webhook
 * Stripe webhook endpoint (no auth required)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Billing] No webhook secret configured');
    return res.status(500).send('Webhook secret not configured');
  }

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    await stripeService.handleWebhook(event);

    res.json({ received: true });
  } catch (error: any) {
    console.error('[Billing] Webhook error:', error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

export default router;
