-- ============================================
-- SUBSCRIPTION & BILLING SYSTEM
-- Managed AI Service with Stripe Integration
-- ============================================

-- ============================================
-- 1. PLAN LIMITS (Configuration table)
-- ============================================
CREATE TABLE plan_limits (
  plan_tier VARCHAR(20) PRIMARY KEY,
  display_name VARCHAR(50) NOT NULL,
  price_usd DECIMAL(10, 2) NOT NULL,
  stripe_price_id VARCHAR(100), -- Stripe Price ID for billing
  
  -- Execution limits
  executions_per_month INTEGER NOT NULL,
  active_workflows_limit INTEGER NOT NULL,
  
  -- AI Model access
  allowed_models JSONB NOT NULL, -- ['gpt-4o-mini', 'gpt-4o', 'dall-e-3', 'claude-3-5-sonnet']
  
  -- Features
  features JSONB, -- ['priority_support', 'team_features', 'custom_branding']
  
  -- Display
  description TEXT,
  is_visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default plans
INSERT INTO plan_limits (plan_tier, display_name, price_usd, executions_per_month, active_workflows_limit, allowed_models, features, description, sort_order) VALUES
('free', 'Free', 0.00, 10, 1, 
  '["gpt-4o-mini"]'::jsonb,
  '["community_support"]'::jsonb,
  'Perfect for trying out AI workflows', 0),

('starter', 'Starter', 9.00, 100, 5,
  '["gpt-4o-mini", "gpt-4o", "dall-e-3"]'::jsonb,
  '["email_support", "all_templates"]'::jsonb,
  'Great for individuals and small projects', 1),

('pro', 'Pro', 29.00, 500, 20,
  '["gpt-4o-mini", "gpt-4o", "gpt-4", "dall-e-3", "claude-3-5-sonnet", "stable-diffusion-xl"]'::jsonb,
  '["priority_support", "priority_execution", "advanced_analytics"]'::jsonb,
  'For power users and growing teams', 2),

('business', 'Business', 99.00, 2000, 999,
  '["gpt-4o-mini", "gpt-4o", "gpt-4", "dall-e-3", "claude-3-5-sonnet", "claude-opus", "stable-diffusion-xl", "whisper", "elevenlabs"]'::jsonb,
  '["dedicated_support", "team_features", "custom_branding", "sla_guarantee"]'::jsonb,
  'For teams and businesses at scale', 3);

-- ============================================
-- 2. USER SUBSCRIPTIONS
-- ============================================
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Plan details
  plan_tier VARCHAR(20) NOT NULL REFERENCES plan_limits(plan_tier),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'past_due'
  
  -- Usage tracking
  executions_used INTEGER DEFAULT 0,
  executions_limit INTEGER NOT NULL,
  active_workflows_count INTEGER DEFAULT 0,
  active_workflows_limit INTEGER NOT NULL,
  
  -- Billing cycle
  current_period_start TIMESTAMP NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  
  -- Stripe integration
  stripe_customer_id VARCHAR(100),
  stripe_subscription_id VARCHAR(100),
  stripe_payment_method_id VARCHAR(100),
  
  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMP,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_subscriptions_plan ON user_subscriptions(plan_tier);
CREATE INDEX idx_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription ON user_subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_period_end ON user_subscriptions(current_period_end) WHERE status = 'active';

-- ============================================
-- 3. WORKFLOW EXECUTIONS (Enhanced with AI tracking)
-- ============================================
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  deployment_id UUID REFERENCES deployments(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Execution details
  status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'running', 'cancelled'
  trigger_type VARCHAR(50), -- 'webhook', 'schedule', 'manual'
  
  -- AI usage tracking
  ai_tokens_used INTEGER DEFAULT 0,
  ai_cost_usd DECIMAL(10, 6) DEFAULT 0.00,
  ai_models_used JSONB, -- [{"model": "gpt-4o", "tokens": 1500, "cost": 0.0375}]
  
  -- Performance
  execution_time_ms INTEGER,
  nodes_executed INTEGER,
  
  -- Error tracking
  error_message TEXT,
  error_node VARCHAR(255),
  error_stack TEXT,
  
  -- Timestamps
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_user ON workflow_executions(user_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_started ON workflow_executions(started_at DESC);
CREATE INDEX idx_workflow_executions_user_period ON workflow_executions(user_id, started_at DESC);

-- ============================================
-- 4. AI USAGE LOGS (Detailed AI tracking)
-- ============================================
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  
  -- AI details
  model VARCHAR(50) NOT NULL, -- 'gpt-4o', 'dall-e-3', 'claude-3-5-sonnet'
  provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'stability'
  operation VARCHAR(50), -- 'text_generation', 'image_generation', 'transcription'
  
  -- Usage
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6) NOT NULL,
  
  -- Request details
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  request_params JSONB, -- Temperature, max_tokens, etc.
  
  -- Response metadata
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_execution ON ai_usage_logs(execution_id);
CREATE INDEX idx_ai_usage_user ON ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_model ON ai_usage_logs(model);
CREATE INDEX idx_ai_usage_created ON ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_user_date ON ai_usage_logs(user_id, created_at DESC);

-- ============================================
-- 5. BILLING HISTORY
-- ============================================
CREATE TABLE billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  
  -- Invoice details
  stripe_invoice_id VARCHAR(100),
  stripe_charge_id VARCHAR(100),
  
  -- Amounts
  amount_usd DECIMAL(10, 2) NOT NULL,
  plan_tier VARCHAR(20) NOT NULL,
  
  -- Period
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  
  -- Status
  status VARCHAR(20) NOT NULL, -- 'paid', 'pending', 'failed', 'refunded'
  paid_at TIMESTAMP,
  
  -- Invoice URL
  invoice_url TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_billing_user ON billing_history(user_id);
CREATE INDEX idx_billing_subscription ON billing_history(subscription_id);
CREATE INDEX idx_billing_stripe_invoice ON billing_history(stripe_invoice_id);
CREATE INDEX idx_billing_created ON billing_history(created_at DESC);

-- ============================================
-- 6. USAGE EVENTS (For analytics)
-- ============================================
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  event_type VARCHAR(50) NOT NULL, -- 'execution_started', 'limit_reached', 'upgrade', 'downgrade'
  event_data JSONB,
  
  -- Context
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usage_events_user ON usage_events(user_id);
CREATE INDEX idx_usage_events_type ON usage_events(event_type);
CREATE INDEX idx_usage_events_created ON usage_events(created_at DESC);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Auto-reset monthly usage counter
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE user_subscriptions
  SET 
    executions_used = 0,
    current_period_start = current_period_end,
    current_period_end = current_period_end + INTERVAL '1 month'
  WHERE current_period_end < NOW()
    AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Increment execution counter
CREATE OR REPLACE FUNCTION increment_execution_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_subscriptions
  SET executions_used = executions_used + 1
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_execution
AFTER INSERT ON workflow_executions
FOR EACH ROW
EXECUTE FUNCTION increment_execution_count();

-- Update active workflows count
CREATE OR REPLACE FUNCTION update_active_workflows_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_subscriptions
  SET active_workflows_count = (
    SELECT COUNT(*)
    FROM workflows
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND is_active = true
  )
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_active_workflows
AFTER INSERT OR UPDATE OR DELETE ON workflows
FOR EACH ROW
EXECUTE FUNCTION update_active_workflows_count();

-- Apply updated_at trigger
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_limits_updated_at BEFORE UPDATE ON plan_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DEFAULT SUBSCRIPTIONS FOR EXISTING USERS
-- ============================================

-- Give all existing users a free plan
INSERT INTO user_subscriptions (user_id, plan_tier, executions_limit, active_workflows_limit)
SELECT 
  id,
  'free',
  10,
  1
FROM users
WHERE id NOT IN (SELECT user_id FROM user_subscriptions);

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- User usage summary
CREATE OR REPLACE VIEW user_usage_summary AS
SELECT 
  u.id AS user_id,
  u.email,
  u.name,
  s.plan_tier,
  s.status AS subscription_status,
  s.executions_used,
  s.executions_limit,
  ROUND((s.executions_used::DECIMAL / NULLIF(s.executions_limit, 0)) * 100, 2) AS usage_percentage,
  s.active_workflows_count,
  s.active_workflows_limit,
  s.current_period_end,
  COALESCE(SUM(ai.cost_usd), 0) AS total_ai_cost_this_period,
  COUNT(DISTINCT we.id) AS total_executions_this_period
FROM users u
JOIN user_subscriptions s ON u.id = s.user_id
LEFT JOIN workflow_executions we ON u.id = we.user_id 
  AND we.started_at >= s.current_period_start
LEFT JOIN ai_usage_logs ai ON u.id = ai.user_id
  AND ai.created_at >= s.current_period_start
GROUP BY u.id, u.email, u.name, s.plan_tier, s.status, s.executions_used, 
         s.executions_limit, s.active_workflows_count, s.active_workflows_limit, 
         s.current_period_end;

-- AI cost by model
CREATE OR REPLACE VIEW ai_cost_by_model AS
SELECT 
  user_id,
  model,
  COUNT(*) AS usage_count,
  SUM(tokens_used) AS total_tokens,
  SUM(cost_usd) AS total_cost,
  AVG(cost_usd) AS avg_cost_per_request,
  DATE_TRUNC('day', created_at) AS usage_date
FROM ai_usage_logs
GROUP BY user_id, model, DATE_TRUNC('day', created_at);

COMMENT ON TABLE plan_limits IS 'Subscription plan configuration and limits';
COMMENT ON TABLE user_subscriptions IS 'User subscription status and usage tracking';
COMMENT ON TABLE workflow_executions IS 'Workflow execution history with AI cost tracking';
COMMENT ON TABLE ai_usage_logs IS 'Detailed AI model usage and cost logs';
COMMENT ON TABLE billing_history IS 'Stripe billing and payment history';
COMMENT ON TABLE usage_events IS 'User activity events for analytics';
