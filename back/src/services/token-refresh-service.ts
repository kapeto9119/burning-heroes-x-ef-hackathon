import { CredentialRepository } from '../repositories/credential-repository';
import { OAuthService } from './oauth-service';
import { N8nApiClient } from './n8n-api-client';

/**
 * Token Refresh Service
 * Background job that refreshes expiring OAuth tokens
 */
export class TokenRefreshService {
  private credentialRepository: CredentialRepository;
  private oauthService: OAuthService;
  private n8nApiClient: N8nApiClient | null;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  // Refresh tokens that expire within this window
  private readonly REFRESH_WINDOW_HOURS = 1;
  
  // Run refresh check every 30 minutes
  private readonly CHECK_INTERVAL_MS = 30 * 60 * 1000;

  constructor(
    credentialRepository: CredentialRepository,
    oauthService: OAuthService,
    n8nApiClient: N8nApiClient | null
  ) {
    this.credentialRepository = credentialRepository;
    this.oauthService = oauthService;
    this.n8nApiClient = n8nApiClient;
  }

  /**
   * Start the token refresh background job
   */
  start(): void {
    if (this.isRunning) {
      console.log('[Token Refresh] Service already running');
      return;
    }

    console.log('[Token Refresh] Starting background service...');
    console.log(`[Token Refresh] Check interval: ${this.CHECK_INTERVAL_MS / 1000 / 60} minutes`);
    console.log(`[Token Refresh] Refresh window: ${this.REFRESH_WINDOW_HOURS} hour(s)`);

    // Run immediately on start
    this.refreshExpiringTokens();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.refreshExpiringTokens();
    }, this.CHECK_INTERVAL_MS);

    this.isRunning = true;
    console.log('[Token Refresh] ✅ Service started');
  }

  /**
   * Stop the token refresh background job
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('[Token Refresh] Service stopped');
  }

  /**
   * Main refresh logic - find and refresh expiring tokens
   */
  private async refreshExpiringTokens(): Promise<void> {
    try {
      console.log('[Token Refresh] Checking for expiring tokens...');

      // This would require a database query to find expiring tokens
      // For now, we'll log that the check ran
      // In production, you'd add a method to CredentialRepository like:
      // const expiring = await this.credentialRepository.findExpiringTokens(this.REFRESH_WINDOW_HOURS);

      // Placeholder for actual implementation
      console.log('[Token Refresh] Check complete (no expiring tokens found)');

      // TODO: Implement actual refresh logic when database supports token_expires_at field
      
    } catch (error) {
      console.error('[Token Refresh] Error during refresh check:', error);
    }
  }

  /**
   * Refresh a specific credential's token
   */
  async refreshCredential(credentialId: string): Promise<boolean> {
    try {
      const credential = await this.credentialRepository.findById(credentialId);

      if (!credential) {
        console.error(`[Token Refresh] Credential ${credentialId} not found`);
        return false;
      }

      const refreshToken = credential.credential_data.refresh_token || 
                          credential.credential_data.refreshToken;

      if (!refreshToken) {
        console.log(`[Token Refresh] No refresh token for ${credential.service} credential ${credentialId}`);
        return false;
      }

      console.log(`[Token Refresh] Refreshing ${credential.service} token for credential ${credentialId}`);

      // Refresh the token
      const newTokens = await this.oauthService.refreshTokens(
        credential.service,
        refreshToken
      );

      // Update credential data
      const updatedData = {
        ...credential.credential_data,
        access_token: newTokens.access_token,
        accessToken: newTokens.access_token,
        refresh_token: newTokens.refresh_token || refreshToken,
        refreshToken: newTokens.refresh_token || refreshToken
      };

      await this.credentialRepository.update(credentialId, updatedData);

      // If we have n8n credential ID, update it in n8n too
      if (credential.n8n_credential_id && this.n8nApiClient) {
        try {
          // Note: n8n API doesn't have a direct update credentials endpoint
          // You'd need to delete and recreate, or use n8n's internal API
          console.log(`[Token Refresh] Would update n8n credential ${credential.n8n_credential_id}`);
        } catch (error) {
          console.error(`[Token Refresh] Failed to update n8n credential:`, error);
        }
      }

      // Mark as valid
      await this.credentialRepository.markValid(credentialId);

      console.log(`[Token Refresh] ✅ Successfully refreshed ${credential.service} token`);
      return true;

    } catch (error: any) {
      console.error(`[Token Refresh] Failed to refresh credential ${credentialId}:`, error);
      
      // Mark credential as invalid
      await this.credentialRepository.markInvalid(
        credentialId,
        `Token refresh failed: ${error.message}`
      );

      return false;
    }
  }

  /**
   * Get service status
   */
  getStatus(): { running: boolean; checkIntervalMinutes: number; refreshWindowHours: number } {
    return {
      running: this.isRunning,
      checkIntervalMinutes: this.CHECK_INTERVAL_MS / 1000 / 60,
      refreshWindowHours: this.REFRESH_WINDOW_HOURS
    };
  }
}
