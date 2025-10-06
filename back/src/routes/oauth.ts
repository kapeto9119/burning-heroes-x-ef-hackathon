import { Router, Request, Response } from 'express';
import { OAuthService } from '../services/oauth-service';
import { CredentialRepository } from '../repositories/credential-repository';
import { AuthService } from '../services/auth-service';
import { createAuthMiddleware } from '../middleware/auth';
import { INTEGRATIONS } from '../config/integrations';

export function createOAuthRouter(
  oauthService: OAuthService,
  credentialRepository: CredentialRepository,
  authService: AuthService
): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(authService);

  /**
   * GET /api/oauth/:service/connect
   * Initiate OAuth flow for a service
   */
  router.get('/:service/connect', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { service } = req.params;
      const userId = req.user!.userId;
      const redirectUrl = req.query.redirect as string;

      const integration = INTEGRATIONS[service];
      if (!integration) {
        return res.status(404).json({
          success: false,
          error: `Service '${service}' not found`
        });
      }

      if (integration.authType !== 'oauth2') {
        return res.status(400).json({
          success: false,
          error: `Service '${service}' does not use OAuth. Use API key setup instead.`
        });
      }

      console.log(`[OAuth] User ${userId} initiating OAuth for ${service}`);

      const { authUrl, state } = oauthService.generateAuthUrl(service, userId, redirectUrl);

      // Redirect user to OAuth provider
      res.redirect(authUrl);

    } catch (error: any) {
      console.error('[OAuth Connect] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to initiate OAuth flow'
      });
    }
  });

  /**
   * GET /api/oauth/:service/callback
   * OAuth callback endpoint - receives authorization code
   */
  router.get('/:service/callback', async (req: Request, res: Response) => {
    try {
      const { service } = req.params;
      const { code, state, error, error_description } = req.query;

      // Handle OAuth errors
      if (error) {
        console.error(`[OAuth Callback] ${service} error:`, error, error_description);
        return res.redirect(
          `${process.env.FRONTEND_URL}/settings?error=${encodeURIComponent(error as string)}&service=${service}`
        );
      }

      if (!code || !state) {
        console.error(`[OAuth Callback] Missing parameters - code: ${!!code}, state: ${!!state}`);
        return res.status(400).json({
          success: false,
          error: 'Missing code or state parameter'
        });
      }

      console.log(`[OAuth Callback] Received callback for ${service} with code and state`);

      // Exchange code for tokens
      let tokens, stateData;
      try {
        const result = await oauthService.exchangeCodeForTokens(
          service,
          code as string,
          state as string
        );
        tokens = result.tokens;
        stateData = result.stateData;
      } catch (exchangeError: any) {
        console.error(`[OAuth Callback] Token exchange failed:`, exchangeError);
        return res.status(400).json({
          success: false,
          error: exchangeError.message || 'No token provided'
        });
      }

      // Extract token data
      const {
        access_token,
        refresh_token,
        expires_in,
        scope,
        ...additionalData
      } = tokens;

      // Calculate expiry
      const expiresAt = oauthService.calculateTokenExpiry(expires_in);

      // Store credential in database
      const integration = INTEGRATIONS[service];
      
      // Prepare credential data based on service
      const credentialData = prepareCredentialData(service, tokens);

      await credentialRepository.create(
        stateData.userId,
        service,
        integration.n8nCredentialType,
        credentialData,
        generateCredentialName(service, tokens)
      );

      console.log(`[OAuth Callback] ✅ Stored credentials for ${service}`);

      // Redirect back to frontend
      const redirectUrl = stateData.redirectUrl || 
                         `${process.env.FRONTEND_URL}/settings?connected=${service}`;
      
      res.redirect(redirectUrl);

    } catch (error: any) {
      console.error('[OAuth Callback] Error:', error);
      const { service } = req.params;
      res.redirect(
        `${process.env.FRONTEND_URL}/settings?error=${encodeURIComponent(error.message)}&service=${service}`
      );
    }
  });

  /**
   * POST /api/oauth/:service/refresh
   * Manually refresh OAuth tokens
   */
  router.post('/:service/refresh', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { service } = req.params;
      const userId = req.user!.userId;

      console.log(`[OAuth Refresh] User ${userId} refreshing ${service} tokens`);

      // Get user's credential
      const credentials = await credentialRepository.findByUserAndService(userId, service);
      
      if (credentials.length === 0) {
        return res.status(404).json({
          success: false,
          error: `No ${service} credentials found`
        });
      }

      const credential = credentials[0];
      const refreshToken = credential.credential_data.refresh_token || credential.credential_data.refreshToken;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'No refresh token available'
        });
      }

      // Refresh tokens
      const newTokens = await oauthService.refreshTokens(service, refreshToken);

      // Update credential
      const updatedData = {
        ...credential.credential_data,
        access_token: newTokens.access_token,
        accessToken: newTokens.access_token,
        refresh_token: newTokens.refresh_token || refreshToken,
        refreshToken: newTokens.refresh_token || refreshToken
      };

      await credentialRepository.update(credential.id, updatedData);

      console.log(`[OAuth Refresh] ✅ Refreshed tokens for ${service}`);

      res.json({
        success: true,
        message: 'Tokens refreshed successfully'
      });

    } catch (error: any) {
      console.error('[OAuth Refresh] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to refresh tokens'
      });
    }
  });

  /**
   * DELETE /api/oauth/:service/disconnect
   * Disconnect OAuth integration
   */
  router.delete('/:service/disconnect', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { service } = req.params;
      const userId = req.user!.userId;

      console.log(`[OAuth Disconnect] User ${userId} disconnecting ${service}`);

      const credentials = await credentialRepository.findByUserAndService(userId, service);
      
      if (credentials.length === 0) {
        return res.status(404).json({
          success: false,
          error: `No ${service} credentials found`
        });
      }

      // Delete all credentials for this service
      for (const credential of credentials) {
        await credentialRepository.delete(credential.id);
      }

      console.log(`[OAuth Disconnect] ✅ Disconnected ${service}`);

      res.json({
        success: true,
        message: `${service} disconnected successfully`
      });

    } catch (error: any) {
      console.error('[OAuth Disconnect] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to disconnect service'
      });
    }
  });

  /**
   * Helper: Prepare credential data for storage
   */
  function prepareCredentialData(service: string, tokens: any): any {
    const baseData = {
      access_token: tokens.access_token,
      accessToken: tokens.access_token,
      refresh_token: tokens.refresh_token,
      refreshToken: tokens.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type
    };

    // Service-specific data extraction
    switch (service) {
      case 'slack':
        return {
          ...baseData,
          teamId: tokens.team?.id,
          teamName: tokens.team?.name,
          userId: tokens.authed_user?.id
        };

      case 'github':
        return {
          ...baseData,
          // GitHub returns user info in separate call
        };

      case 'notion':
        return {
          ...baseData,
          workspaceId: tokens.workspace_id,
          workspaceName: tokens.workspace_name,
          botId: tokens.bot_id
        };

      case 'googleSheets':
      case 'googleDrive':
        return {
          ...baseData,
          // Google OAuth tokens are standard
        };

      default:
        return baseData;
    }
  }

  /**
   * Helper: Generate friendly credential name
   */
  function generateCredentialName(service: string, tokens: any): string {
    switch (service) {
      case 'slack':
        return tokens.team?.name || 'Slack Workspace';
      case 'notion':
        return tokens.workspace_name || 'Notion Workspace';
      case 'github':
        return 'GitHub Account';
      case 'googleSheets':
        return 'Google Sheets';
      case 'googleDrive':
        return 'Google Drive';
      default:
        return `${service.charAt(0).toUpperCase() + service.slice(1)} Account`;
    }
  }

  return router;
}
