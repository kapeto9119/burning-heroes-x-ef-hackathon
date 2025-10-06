import axios from 'axios';
import crypto from 'crypto';
import { INTEGRATIONS, IntegrationConfig } from '../config/integrations';

/**
 * OAuth Service
 * Handles OAuth 2.0 flows for all integrations
 */

export interface OAuthState {
  userId: string;
  service: string;
  redirectUrl?: string;
  timestamp: number;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  [key: string]: any; // Service-specific fields
}

export class OAuthService {
  private stateStore: Map<string, OAuthState> = new Map();
  private readonly STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(
    service: string,
    userId: string,
    redirectUrl?: string
  ): { authUrl: string; state: string } {
    const integration = INTEGRATIONS[service];
    
    if (!integration) {
      throw new Error(`Unknown service: ${service}`);
    }

    if (!integration.oauth) {
      throw new Error(`Service ${service} does not support OAuth`);
    }

    const clientId = process.env[`${service.toUpperCase()}_CLIENT_ID`];
    const callbackUri = process.env[`${service.toUpperCase()}_REDIRECT_URI`] || 
                        `${process.env.BACKEND_URL}/api/oauth/${service}/callback`;

    if (!clientId) {
      throw new Error(
        `Missing OAuth configuration for ${service}. ` +
        `Set ${service.toUpperCase()}_CLIENT_ID in environment variables.`
      );
    }

    // Generate secure state token
    const state = this.generateState();
    
    // Store state with user info
    this.stateStore.set(state, {
      userId,
      service,
      redirectUrl,
      timestamp: Date.now()
    });

    // Clean up expired states
    this.cleanupExpiredStates();

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUri,
      response_type: 'code',
      state,
      scope: integration.oauth.scopes.join(integration.oauth.scopeSeparator || ' ')
    });

    // Service-specific parameters
    if (service === 'slack') {
      params.append('user_scope', 'identity.basic,identity.email');
    } else if (service === 'github') {
      params.append('allow_signup', 'false');
    } else if (service === 'notion') {
      params.append('owner', 'user');
    }

    const authUrl = `${integration.oauth.authUrl}?${params.toString()}`;

    console.log(`[OAuth] Generated auth URL for ${service}:`, authUrl);

    return { authUrl, state };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    service: string,
    code: string,
    state: string
  ): Promise<{ tokens: OAuthTokenResponse; stateData: OAuthState }> {
    const integration = INTEGRATIONS[service];
    
    if (!integration || !integration.oauth) {
      throw new Error(`Invalid service: ${service}`);
    }

    // Verify state
    const stateData = this.stateStore.get(state);
    if (!stateData) {
      throw new Error('Invalid or expired state token');
    }

    if (stateData.service !== service) {
      throw new Error('State service mismatch');
    }

    // Remove used state
    this.stateStore.delete(state);

    const clientId = process.env[`${service.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`${service.toUpperCase()}_CLIENT_SECRET`];
    const redirectUri = process.env[`${service.toUpperCase()}_REDIRECT_URI`] || 
                        `${process.env.BACKEND_URL}/api/oauth/${service}/callback`;

    if (!clientId || !clientSecret) {
      throw new Error(`Missing OAuth credentials for ${service}`);
    }

    try {
      console.log(`[OAuth] Exchanging code for ${service} tokens...`);

      // Service-specific token exchange
      const tokens = await this.exchangeTokens(
        integration,
        code,
        clientId,
        clientSecret,
        redirectUri
      );

      console.log(`[OAuth] ✅ Received tokens for ${service}`);

      return { tokens, stateData };
    } catch (error: any) {
      console.error(`[OAuth] ❌ Token exchange failed for ${service}:`, error.response?.data || error.message);
      throw new Error(`Failed to exchange code for tokens: ${error.message}`);
    }
  }

  /**
   * Refresh OAuth tokens
   */
  async refreshTokens(
    service: string,
    refreshToken: string
  ): Promise<OAuthTokenResponse> {
    const integration = INTEGRATIONS[service];
    
    if (!integration || !integration.oauth) {
      throw new Error(`Invalid service: ${service}`);
    }

    const clientId = process.env[`${service.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`${service.toUpperCase()}_CLIENT_SECRET`];

    if (!clientId || !clientSecret) {
      throw new Error(`Missing OAuth credentials for ${service}`);
    }

    try {
      console.log(`[OAuth] Refreshing tokens for ${service}...`);

      const response = await axios.post(
        integration.oauth.tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        }
      );

      console.log(`[OAuth] ✅ Tokens refreshed for ${service}`);

      return response.data;
    } catch (error: any) {
      console.error(`[OAuth] ❌ Token refresh failed for ${service}:`, error.response?.data || error.message);
      throw new Error(`Failed to refresh tokens: ${error.message}`);
    }
  }

  /**
   * Validate OAuth token
   */
  async validateToken(service: string, accessToken: string): Promise<boolean> {
    const integration = INTEGRATIONS[service];
    
    if (!integration || !integration.validation) {
      // No validation endpoint defined
      return true;
    }

    try {
      const response = await axios({
        method: integration.validation.method,
        url: integration.validation.url,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          ...integration.validation.headers
        }
      });

      return response.status === 200;
    } catch (error) {
      console.error(`[OAuth] Token validation failed for ${service}:`, error);
      return false;
    }
  }

  /**
   * Service-specific token exchange logic
   */
  private async exchangeTokens(
    integration: IntegrationConfig,
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<OAuthTokenResponse> {
    const service = integration.id;

    // Most services use standard OAuth 2.0 flow
    const params: any = {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    };

    // Service-specific adjustments
    if (service === 'slack') {
      // Slack uses different parameter names
      delete params.redirect_uri;
    } else if (service === 'github') {
      // GitHub accepts JSON
      const response = await axios.post(
        integration.oauth!.tokenUrl,
        params,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      return response.data;
    }

    // Standard OAuth 2.0 token exchange
    const response = await axios.post(
      integration.oauth!.tokenUrl,
      new URLSearchParams(params),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );

    return response.data;
  }

  /**
   * Generate secure random state token
   */
  private generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Clean up expired state tokens
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [state, data] of this.stateStore.entries()) {
      if (now - data.timestamp > this.STATE_EXPIRY_MS) {
        this.stateStore.delete(state);
      }
    }
  }

  /**
   * Calculate token expiry timestamp
   */
  calculateTokenExpiry(expiresIn?: number): Date | null {
    if (!expiresIn) return null;
    return new Date(Date.now() + expiresIn * 1000);
  }
}
