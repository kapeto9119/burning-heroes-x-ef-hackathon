-- Migration: Add OAuth token fields to credentials table
-- Run this to add OAuth support to existing database

-- Add OAuth-specific fields
ALTER TABLE credentials ADD COLUMN IF NOT EXISTS auth_type VARCHAR(20) DEFAULT 'apiKey';
ALTER TABLE credentials ADD COLUMN IF NOT EXISTS access_token TEXT;
ALTER TABLE credentials ADD COLUMN IF NOT EXISTS refresh_token TEXT;
ALTER TABLE credentials ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP;
ALTER TABLE credentials ADD COLUMN IF NOT EXISTS scope TEXT;

-- Add index for expiring tokens (for refresh job)
CREATE INDEX IF NOT EXISTS idx_credentials_expiring 
  ON credentials(token_expires_at) 
  WHERE token_expires_at IS NOT NULL AND is_valid = true;

-- Add comment
COMMENT ON COLUMN credentials.auth_type IS 'oauth2, apiKey, basic, or custom';
COMMENT ON COLUMN credentials.access_token IS 'OAuth access token (encrypted separately)';
COMMENT ON COLUMN credentials.refresh_token IS 'OAuth refresh token (encrypted separately)';
COMMENT ON COLUMN credentials.token_expires_at IS 'When the access token expires';
COMMENT ON COLUMN credentials.scope IS 'OAuth scopes granted';
