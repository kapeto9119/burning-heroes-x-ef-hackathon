/**
 * Stripe Service
 * Handles subscription billing and payment processing
 */

import Stripe from 'stripe';
import { Pool } from 'pg';

export interface SubscriptionPlan {
  planTier: string;
  displayName: string;
  priceUsd: number;
  stripePriceId: string;
  executionsPerMonth: number;
  activeWorkflowsLimit: number;
  allowedModels: string[];
  features: string[];
}

export class StripeService {
  private stripe: Stripe;
  private pool: Pool;

  constructor(apiKey: string, pool: Pool) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2024-12-18.acacia'
    });
    this.pool = pool;
  }

  /**
   * Create a Stripe customer for a user
   */
  async createCustomer(userId: string, email: string, name: string): Promise<string> {
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: {
        userId
      }
    });

    // Store customer ID
    await this.pool.query(
      `UPDATE user_subscriptions 
      SET stripe_customer_id = $1 
      WHERE user_id = $2`,
      [customer.id, userId]
    );

    return customer.id;
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(
    userId: string,
    planTier: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    // Get user's subscription
    const subResult = await this.pool.query(
      `SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = $1`,
      [userId]
    );

    let customerId = subResult.rows[0]?.stripe_customer_id;

    // Create customer if doesn't exist
    if (!customerId) {
      const userResult = await this.pool.query(
        `SELECT email, name FROM users WHERE id = $1`,
        [userId]
      );
      const user = userResult.rows[0];
      customerId = await this.createCustomer(userId, user.email, user.name);
    }

    // Get plan details
    const planResult = await this.pool.query(
      `SELECT stripe_price_id FROM plan_limits WHERE plan_tier = $1`,
      [planTier]
    );

    const stripePriceId = planResult.rows[0]?.stripe_price_id;
    if (!stripePriceId) {
      throw new Error(`No Stripe price ID configured for plan: ${planTier}`);
    }

    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        planTier
      }
    });

    return session.url!;
  }

  /**
   * Create a billing portal session
   */
  async createPortalSession(userId: string, returnUrl: string): Promise<string> {
    const result = await this.pool.query(
      `SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = $1`,
      [userId]
    );

    const customerId = result.rows[0]?.stripe_customer_id;
    if (!customerId) {
      throw new Error('No Stripe customer found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });

    return session.url;
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    console.log(`[Stripe] Handling webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Stripe] Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle successful checkout
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const planTier = session.metadata?.planTier;

    if (!userId || !planTier) {
      console.error('[Stripe] Missing metadata in checkout session');
      return;
    }

    const subscription = await this.stripe.subscriptions.retrieve(
      session.subscription as string
    );

    // Get plan limits
    const planResult = await this.pool.query(
      `SELECT executions_per_month, active_workflows_limit 
      FROM plan_limits WHERE plan_tier = $1`,
      [planTier]
    );

    const plan = planResult.rows[0];

    // Update user subscription
    await this.pool.query(
      `UPDATE user_subscriptions 
      SET 
        plan_tier = $1,
        status = 'active',
        stripe_subscription_id = $2,
        executions_limit = $3,
        active_workflows_limit = $4,
        executions_used = 0,
        current_period_start = to_timestamp($5),
        current_period_end = to_timestamp($6)
      WHERE user_id = $7`,
      [
        planTier,
        subscription.id,
        plan.executions_per_month,
        plan.active_workflows_limit,
        subscription.current_period_start,
        subscription.current_period_end,
        userId
      ]
    );

    console.log(`[Stripe] Subscription activated for user ${userId}: ${planTier}`);
  }

  /**
   * Handle subscription updates
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;

    // Find user by customer ID
    const result = await this.pool.query(
      `SELECT user_id FROM user_subscriptions WHERE stripe_customer_id = $1`,
      [customerId]
    );

    if (result.rows.length === 0) {
      console.error(`[Stripe] No user found for customer ${customerId}`);
      return;
    }

    const userId = result.rows[0].user_id;

    // Update subscription status
    await this.pool.query(
      `UPDATE user_subscriptions 
      SET 
        status = $1,
        current_period_start = to_timestamp($2),
        current_period_end = to_timestamp($3),
        cancel_at_period_end = $4
      WHERE user_id = $5`,
      [
        subscription.status,
        subscription.current_period_start,
        subscription.current_period_end,
        subscription.cancel_at_period_end,
        userId
      ]
    );

    console.log(`[Stripe] Subscription updated for user ${userId}: ${subscription.status}`);
  }

  /**
   * Handle subscription cancellation
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;

    const result = await this.pool.query(
      `SELECT user_id FROM user_subscriptions WHERE stripe_customer_id = $1`,
      [customerId]
    );

    if (result.rows.length === 0) return;

    const userId = result.rows[0].user_id;

    // Downgrade to free plan
    await this.pool.query(
      `UPDATE user_subscriptions 
      SET 
        plan_tier = 'free',
        status = 'active',
        stripe_subscription_id = NULL,
        executions_limit = 10,
        active_workflows_limit = 1,
        executions_used = 0,
        cancelled_at = NOW()
      WHERE user_id = $1`,
      [userId]
    );

    console.log(`[Stripe] User ${userId} downgraded to free plan`);
  }

  /**
   * Handle successful payment
   */
  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    const subscriptionId = invoice.subscription as string;

    const result = await this.pool.query(
      `SELECT user_id, plan_tier FROM user_subscriptions 
      WHERE stripe_customer_id = $1`,
      [customerId]
    );

    if (result.rows.length === 0) return;

    const { user_id: userId, plan_tier: planTier } = result.rows[0];

    // Record payment in billing history
    await this.pool.query(
      `INSERT INTO billing_history 
      (user_id, stripe_invoice_id, stripe_charge_id, amount_usd, plan_tier, 
       period_start, period_end, status, paid_at, invoice_url)
      VALUES ($1, $2, $3, $4, $5, to_timestamp($6), to_timestamp($7), 'paid', NOW(), $8)`,
      [
        userId,
        invoice.id,
        invoice.charge,
        (invoice.amount_paid / 100).toFixed(2),
        planTier,
        invoice.period_start,
        invoice.period_end,
        invoice.hosted_invoice_url
      ]
    );

    console.log(`[Stripe] Payment recorded for user ${userId}: $${invoice.amount_paid / 100}`);
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;

    const result = await this.pool.query(
      `SELECT user_id FROM user_subscriptions WHERE stripe_customer_id = $1`,
      [customerId]
    );

    if (result.rows.length === 0) return;

    const userId = result.rows[0].user_id;

    // Update subscription status
    await this.pool.query(
      `UPDATE user_subscriptions 
      SET status = 'past_due'
      WHERE user_id = $1`,
      [userId]
    );

    console.log(`[Stripe] Payment failed for user ${userId}`);
  }

  /**
   * Get all available plans
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
    const result = await this.pool.query(
      `SELECT * FROM plan_limits WHERE is_visible = true ORDER BY sort_order`
    );

    return result.rows.map(row => ({
      planTier: row.plan_tier,
      displayName: row.display_name,
      priceUsd: parseFloat(row.price_usd),
      stripePriceId: row.stripe_price_id,
      executionsPerMonth: row.executions_per_month,
      activeWorkflowsLimit: row.active_workflows_limit,
      allowedModels: row.allowed_models,
      features: row.features
    }));
  }

  /**
   * Cancel subscription at period end
   */
  async cancelSubscription(userId: string): Promise<void> {
    const result = await this.pool.query(
      `SELECT stripe_subscription_id FROM user_subscriptions WHERE user_id = $1`,
      [userId]
    );

    const subscriptionId = result.rows[0]?.stripe_subscription_id;
    if (!subscriptionId) {
      throw new Error('No active subscription found');
    }

    await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    await this.pool.query(
      `UPDATE user_subscriptions 
      SET cancel_at_period_end = true, cancelled_at = NOW()
      WHERE user_id = $1`,
      [userId]
    );
  }

  /**
   * Reactivate cancelled subscription
   */
  async reactivateSubscription(userId: string): Promise<void> {
    const result = await this.pool.query(
      `SELECT stripe_subscription_id FROM user_subscriptions WHERE user_id = $1`,
      [userId]
    );

    const subscriptionId = result.rows[0]?.stripe_subscription_id;
    if (!subscriptionId) {
      throw new Error('No subscription found');
    }

    await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false
    });

    await this.pool.query(
      `UPDATE user_subscriptions 
      SET cancel_at_period_end = false, cancelled_at = NULL
      WHERE user_id = $1`,
      [userId]
    );
  }
}
