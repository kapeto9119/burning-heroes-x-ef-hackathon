-- AI Workflow Builder Database Schema
-- MVP+ Production-Ready Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ============================================
-- 2. CREDENTIALS TABLE (Dynamic - supports all N8N types)
-- ============================================
CREATE TABLE credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Dynamic identification (supports 400+ N8N credential types)
  service VARCHAR(100) NOT NULL,              -- 'slack', 'gmail', 'postgres', 'airtable', etc.
  n8n_credential_type VARCHAR(200) NOT NULL,  -- 'slackApi', 'gmailOAuth2', 'postgres', etc.
  credential_name VARCHAR(200),               -- User-friendly: 'My Work Slack', 'Personal Gmail'
  
  -- Encrypted credential data (JSONB for flexibility)
  credential_data JSONB NOT NULL,  -- Encrypted: { token: '...', host: '...', etc. }
  
  -- N8N integration
  n8n_credential_id VARCHAR(100),  -- n8n's internal credential ID (for reuse)
  
  -- Status tracking
  is_valid BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMP,
  validation_error TEXT,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  
  -- Allow multiple credentials per service (e.g., 2 Slack workspaces)
  UNIQUE(user_id, service, credential_name)
);

CREATE INDEX idx_credentials_user ON credentials(user_id);
CREATE INDEX idx_credentials_user_service ON credentials(user_id, service);
CREATE INDEX idx_credentials_n8n_type ON credentials(n8n_credential_type);
CREATE INDEX idx_credentials_valid ON credentials(user_id, is_valid) WHERE is_valid = true;

-- ============================================
-- 3. WORKFLOWS TABLE (Stores n8n JSON + metadata)
-- ============================================
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Complete n8n workflow structure (nodes, connections, settings)
  workflow_data JSONB NOT NULL,
  
  -- Quick reference arrays (denormalized for fast queries)
  node_types TEXT[],                  -- ['n8n-nodes-base.slack', 'n8n-nodes-base.webhook']
  required_credential_types TEXT[],   -- ['slackApi', 'postgres']
  
  -- Metadata
  is_active BOOLEAN DEFAULT false,
  created_from_prompt TEXT,  -- Original AI prompt that generated this
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_workflows_user ON workflows(user_id);
CREATE INDEX idx_workflows_active ON workflows(user_id, is_active);
CREATE INDEX idx_workflows_created ON workflows(created_at DESC);
-- GIN indexes for array searches (fast "find workflows using Slack" queries)
CREATE INDEX idx_workflows_node_types ON workflows USING GIN(node_types);
CREATE INDEX idx_workflows_cred_types ON workflows USING GIN(required_credential_types);

-- ============================================
-- 4. DEPLOYMENTS TABLE (Tracks deployed workflows)
-- ============================================
CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- N8N integration
  n8n_workflow_id VARCHAR(100) UNIQUE NOT NULL,  -- n8n's internal workflow ID
  webhook_url TEXT,  -- If workflow has webhook trigger
  
  -- Status
  status VARCHAR(50) DEFAULT 'active',  -- 'active', 'inactive', 'error', 'deleted'
  
  -- Credentials snapshot (which credentials were used at deployment)
  credentials_snapshot JSONB,  -- [{ service: 'slack', credential_id: 'uuid', n8n_credential_id: 'xxx' }]
  
  -- Execution tracking
  last_execution_at TIMESTAMP,
  execution_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  -- Timestamps
  deployed_at TIMESTAMP DEFAULT NOW(),
  activated_at TIMESTAMP,
  deactivated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_deployments_workflow ON deployments(workflow_id);
CREATE INDEX idx_deployments_user ON deployments(user_id);
CREATE INDEX idx_deployments_n8n_id ON deployments(n8n_workflow_id);
CREATE INDEX idx_deployments_status ON deployments(status);
CREATE INDEX idx_deployments_active ON deployments(user_id, status) WHERE status = 'active';

-- ============================================
-- 5. EXECUTIONS TABLE (Execution history)
-- ============================================
CREATE TABLE executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- N8N execution data
  n8n_execution_id VARCHAR(100),
  status VARCHAR(50) NOT NULL,  -- 'success', 'error', 'running', 'waiting'
  
  -- Timing
  started_at TIMESTAMP NOT NULL,
  finished_at TIMESTAMP,
  duration_ms INTEGER,
  
  -- Trigger info
  trigger_type VARCHAR(50),  -- 'webhook', 'schedule', 'manual', 'api'
  
  -- Error tracking
  error_message TEXT,
  failed_node VARCHAR(255),  -- Which node failed
  
  -- Data (optional - can be large, consider separate storage for production)
  input_data JSONB,
  output_data JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_executions_deployment ON executions(deployment_id);
CREATE INDEX idx_executions_workflow ON executions(workflow_id);
CREATE INDEX idx_executions_user ON executions(user_id);
CREATE INDEX idx_executions_time ON executions(started_at DESC);
CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_executions_errors ON executions(status, started_at DESC) WHERE status = 'error';

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credentials_updated_at BEFORE UPDATE ON credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deployments_updated_at BEFORE UPDATE ON deployments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================

-- Insert test user (password: 'password123')
INSERT INTO users (email, name, password_hash) VALUES
  ('test@example.com', 'Test User', '$2b$10$rBV2kHZ7vLlXJZYxKp4zPOxK8qZ9mYxQxZxKp4zPOxK8qZ9mYxQxZ');

COMMENT ON TABLE users IS 'User accounts and authentication';
COMMENT ON TABLE credentials IS 'Encrypted service credentials (supports all N8N types dynamically)';
COMMENT ON TABLE workflows IS 'Workflow definitions with n8n JSON structure';
COMMENT ON TABLE deployments IS 'Deployed workflow instances in n8n';
COMMENT ON TABLE executions IS 'Workflow execution history and logs';
