# 🎯 Stripe Integration Setup Guide

## Overview

Your managed AI service is now ready! Users will use **your** OpenAI/Anthropic keys, and you'll bill them via Stripe based on usage tiers.

---

## 📋 Prerequisites

1. **Stripe Account** - Sign up at https://stripe.com
2. **OpenAI API Key** - For providing AI services
3. **Database** - PostgreSQL with new schema

---

## 🚀 Quick Setup (15 minutes)

### Step 1: Install Dependencies

```bash
cd back
npm install stripe
npm install --save-dev @types/stripe
```

### Step 2: Run Database Migration

```bash
# Apply the new subscription schema
psql -U postgres -d ai_workflow_builder -f db/migrations/002_add_subscriptions_and_billing.sql
```

This creates:
- `plan_limits` - Subscription tiers (Free, Starter, Pro, Business)
- `user_subscriptions` - User subscription status
- `workflow_executions` - Execution tracking with AI costs
- `ai_usage_logs` - Detailed AI usage logs
- `billing_history` - Payment records

### Step 3: Create Stripe Products

1. Go to https://dashboard.stripe.com/test/products
2. Create 3 products (skip Free tier):

**Starter Plan**
- Name: "Starter"
- Price: $9/month
- Recurring: Monthly
- Copy the **Price ID** (starts with `price_`)

**Pro Plan**
- Name: "Pro"  
- Price: $29/month
- Recurring: Monthly
- Copy the **Price ID**

**Business Plan**
- Name: "Business"
- Price: $99/month
- Recurring: Monthly
- Copy the **Price ID**

### Step 4: Update Database with Stripe Price IDs

```sql
-- Update plan_limits with your Stripe Price IDs
UPDATE plan_limits SET stripe_price_id = 'price_YOUR_STARTER_ID' WHERE plan_tier = 'starter';
UPDATE plan_limits SET stripe_price_id = 'price_YOUR_PRO_ID' WHERE plan_tier = 'pro';
UPDATE plan_limits SET stripe_price_id = 'price_YOUR_BUSINESS_ID' WHERE plan_tier = 'business';
```

### Step 5: Configure Environment Variables

Add to `/back/.env`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...  # From https://dashboard.stripe.com/test/apikeys
STRIPE_WEBHOOK_SECRET=whsec_...  # We'll get this in Step 6

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_workflow_builder
DB_USER=postgres
DB_PASSWORD=postgres

# Frontend URL (for Stripe redirects)
FRONTEND_URL=http://localhost:3000
```

### Step 6: Setup Stripe Webhook

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `http://localhost:3001/api/billing/webhook` (for testing)
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to `.env` as `STRIPE_WEBHOOK_SECRET`

### Step 7: Test the Integration

```bash
# Start the backend
cd back
npm run dev

# In another terminal, test the endpoints
curl http://localhost:3001/api/billing/plans
```

You should see the 4 plans (Free, Starter, Pro, Business).

---

## 🧪 Testing Locally

### Use Stripe CLI for Webhook Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/billing/webhook

# This will give you a webhook secret starting with whsec_
# Update your .env with this secret
```

### Test Checkout Flow

```bash
# 1. Get a test user token (login first)
TOKEN="your_jwt_token"

# 2. Create checkout session
curl -X POST http://localhost:3001/api/billing/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planTier": "starter"}'

# 3. Visit the returned checkoutUrl
# 4. Use test card: 4242 4242 4242 4242, any future date, any CVC
```

---

## 📊 How It Works

### User Flow

```
1. User signs up → Gets FREE plan automatically
2. User creates AI workflow → Uses YOUR OpenAI key
3. Workflow executes → Tracked in workflow_executions table
4. Counter increments → executions_used++
5. Hits limit (10 for free) → Prompted to upgrade
6. Clicks upgrade → Stripe checkout
7. Pays → Subscription activated
8. Limits increased → Can execute more workflows
```

### Enforcement Points

**Before Workflow Execution:**
```typescript
// Check if user has executions left
if (executions_used >= executions_limit) {
  return 429 "Upgrade to continue"
}
```

**Before Workflow Activation:**
```typescript
// Check if user has active workflow slots
if (active_workflows >= active_workflows_limit) {
  return 429 "Deactivate a workflow or upgrade"
}
```

**Before AI Node Execution:**
```typescript
// Check if model is allowed on plan
if (!allowed_models.includes(model)) {
  return 403 "Upgrade to use this model"
}
```

---

## 💰 Cost Management

### Your Costs (Using YOUR API Keys)

```
FREE TIER (10 executions/month)
- Cost you: ~$0.50/month per user
- Revenue: $0
- Purpose: Acquisition funnel

STARTER ($9/month, 100 executions)
- Cost you: ~$3-5/month per user
- Profit: ~$4-6/month per user
- Margin: ~50%

PRO ($29/month, 500 executions)
- Cost you: ~$15-20/month per user
- Profit: ~$9-14/month per user
- Margin: ~40%

BUSINESS ($99/month, 2000 executions)
- Cost you: ~$60-70/month per user
- Profit: ~$29-39/month per user
- Margin: ~35%
```

### AI Model Costs (2025 Pricing)

```
GPT-4o:        $2.50 / 1M tokens
GPT-4o-mini:   $0.15 / 1M tokens
DALL-E 3:      $0.04 / image
Claude Sonnet: $3.00 / 1M tokens
Whisper:       $0.006 / minute
```

---

## 🎨 Frontend Integration

### 1. Pricing Page (`/pricing`)

```typescript
// Fetch plans
const response = await fetch('/api/billing/plans');
const { data: plans } = await response.json();

// Show plans with features
plans.map(plan => (
  <PricingCard
    name={plan.displayName}
    price={plan.priceUsd}
    executions={plan.executionsPerMonth}
    workflows={plan.activeWorkflowsLimit}
    features={plan.features}
    onUpgrade={() => handleUpgrade(plan.planTier)}
  />
));
```

### 2. Usage Dashboard (`/dashboard`)

```typescript
// Fetch usage
const response = await fetch('/api/billing/usage', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data: usage } = await response.json();

// Show usage bars
<UsageBar 
  used={usage.executions_used}
  limit={usage.executions_limit}
  label="Executions this month"
/>

// Show warnings
{usage.warnings.map(warning => (
  <Alert>{warning}</Alert>
))}
```

### 3. Upgrade Flow

```typescript
async function handleUpgrade(planTier: string) {
  const response = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ planTier })
  });
  
  const { data } = await response.json();
  window.location.href = data.checkoutUrl; // Redirect to Stripe
}
```

### 4. Billing Portal

```typescript
async function openBillingPortal() {
  const response = await fetch('/api/billing/portal', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const { data } = await response.json();
  window.location.href = data.portalUrl; // Stripe manages everything
}
```

---

## 🔒 Security Best Practices

1. **Never expose Stripe Secret Key** - Keep in `.env`, never commit
2. **Verify webhook signatures** - Already implemented in billing route
3. **Use HTTPS in production** - Required for Stripe webhooks
4. **Validate plan tiers** - Check against database before checkout
5. **Rate limit billing endpoints** - Prevent abuse

---

## 🚀 Going to Production

### 1. Switch to Live Mode

```bash
# Get live keys from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_live_...

# Create live webhook
# URL: https://yourdomain.com/api/billing/webhook
STRIPE_WEBHOOK_SECRET=whsec_live_...
```

### 2. Update Stripe Price IDs

Create live products in Stripe dashboard and update database:

```sql
UPDATE plan_limits SET stripe_price_id = 'price_LIVE_ID' WHERE plan_tier = 'starter';
-- Repeat for pro and business
```

### 3. Set Frontend URL

```bash
FRONTEND_URL=https://yourdomain.com
```

---

## 📈 Monitoring & Analytics

### Track Key Metrics

```sql
-- Total MRR (Monthly Recurring Revenue)
SELECT 
  SUM(p.price_usd) as mrr
FROM user_subscriptions s
JOIN plan_limits p ON s.plan_tier = p.plan_tier
WHERE s.status = 'active' AND s.plan_tier != 'free';

-- AI costs this month
SELECT 
  SUM(cost_usd) as total_cost,
  model,
  COUNT(*) as usage_count
FROM ai_usage_logs
WHERE created_at >= date_trunc('month', NOW())
GROUP BY model;

-- Users approaching limits
SELECT * FROM user_usage_summary
WHERE usage_percentage > 80
ORDER BY usage_percentage DESC;
```

---

## 🎯 Next Steps

1. **Run the migration** - Apply database schema
2. **Install Stripe** - `npm install stripe`
3. **Configure .env** - Add Stripe keys
4. **Test locally** - Use Stripe test mode
5. **Build pricing page** - Show plans to users
6. **Add usage dashboard** - Show limits and warnings
7. **Deploy** - Switch to live mode

---

## 🆘 Troubleshooting

### "No Stripe customer found"
- User needs to go through checkout first
- Or manually create customer in Stripe dashboard

### "Webhook signature verification failed"
- Check `STRIPE_WEBHOOK_SECRET` is correct
- Use Stripe CLI for local testing

### "Model not available on plan"
- Check `allowed_models` in `plan_limits` table
- Ensure model name matches exactly

### "Execution limit reached"
- Working as intended! User needs to upgrade
- Or wait for monthly reset

---

## 📚 Resources

- [Stripe Docs](https://stripe.com/docs)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Webhook Events](https://stripe.com/docs/api/events/types)
- [Billing Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)

---

**You're all set!** 🎉 Users can now use AI workflows with your keys, and you'll bill them based on usage tiers.
