import { Router, Request, Response } from 'express';
import { CredentialRepository } from '../repositories/credential-repository';
import { CredentialValidator } from '../services/credential-validator';
import { AuthService } from '../services/auth-service';
import { createAuthMiddleware } from '../middleware/auth';
import { INTEGRATIONS, getIntegration } from '../config/integrations';

export function createCredentialsRouter(
  credentialRepository: CredentialRepository,
  credentialValidator: CredentialValidator,
  authService: AuthService
): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(authService);

  /**
   * GET /api/credentials
   * Get all user's credentials
   */
  router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const credentials = await credentialRepository.findByUser(userId);

      // Don't send sensitive data to frontend
      const sanitized = credentials.map(cred => ({
        id: cred.id,
        service: cred.service,
        n8nCredentialType: cred.n8n_credential_type,
        credentialName: cred.credential_name,
        isValid: cred.is_valid,
        lastValidatedAt: cred.last_validated_at,
        validationError: cred.validation_error,
        createdAt: cred.created_at,
        lastUsedAt: cred.last_used_at
      }));

      res.json({
        success: true,
        data: sanitized
      });
    } catch (error: any) {
      console.error('[Credentials] Error fetching credentials:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch credentials'
      });
    }
  });

  /**
   * POST /api/credentials
   * Add new API-key based credential
   */
  router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { service, credentialData, credentialName } = req.body;

      if (!service || !credentialData) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: service, credentialData'
        });
      }

      const integration = getIntegration(service);
      if (!integration) {
        return res.status(404).json({
          success: false,
          error: `Unknown service: ${service}`
        });
      }

      // OAuth services should use /api/oauth endpoints
      if (integration.authType === 'oauth2') {
        return res.status(400).json({
          success: false,
          error: `${service} uses OAuth. Use /api/oauth/${service}/connect instead.`
        });
      }

      console.log(`[Credentials] User ${userId} adding ${service} credentials`);

      // Validate credentials
      const validation = await credentialValidator.validate(service, credentialData);
      
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.error || 'Invalid credentials',
          validationError: validation.error
        });
      }

      // Check if credential already exists with the same name
      const defaultName = credentialName || `${integration.name} Account`;
      const existingCredentials = await credentialRepository.findByUser(userId, false);
      const existingCredential = existingCredentials.find(
        c => c.service === service && c.credential_name === defaultName
      );

      let credential;
      if (existingCredential) {
        // Update existing credential
        console.log(`[Credentials] Updating existing ${service} credential ${existingCredential.id}`);
        await credentialRepository.update(existingCredential.id, credentialData);
        await credentialRepository.markValid(existingCredential.id);
        credential = await credentialRepository.findById(existingCredential.id);
        
        if (!credential) {
          throw new Error('Failed to retrieve updated credential');
        }
      } else {
        // Create new credential
        credential = await credentialRepository.create(
          userId,
          service,
          integration.n8nCredentialType,
          credentialData,
          defaultName
        );
      }

      console.log(`[Credentials] ✅ Stored ${service} credentials for user ${userId}`);

      res.json({
        success: true,
        message: `${integration.name} credentials ${existingCredential ? 'updated' : 'added'} successfully`,
        data: {
          id: credential.id,
          service: credential.service,
          credentialName: credential.credential_name,
          isValid: credential.is_valid,
          metadata: validation.metadata
        }
      });

    } catch (error: any) {
      console.error('[Credentials] Error adding credential:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to add credential'
      });
    }
  });

  /**
   * PUT /api/credentials/:id
   * Update existing credential
   */
  router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { credentialData, credentialName } = req.body;

      const credential = await credentialRepository.findById(id);

      if (!credential) {
        return res.status(404).json({
          success: false,
          error: 'Credential not found'
        });
      }

      // Verify ownership
      if (credential.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // If updating credential data, validate it
      if (credentialData) {
        const validation = await credentialValidator.validate(
          credential.service,
          credentialData
        );

        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            error: validation.error || 'Invalid credentials'
          });
        }

        await credentialRepository.update(id, credentialData);
        await credentialRepository.markValid(id);
      }

      // Update name if provided
      if (credentialName) {
        // Note: We'd need to add an updateName method to repository
        // For now, this is a placeholder
      }

      console.log(`[Credentials] ✅ Updated credential ${id}`);

      res.json({
        success: true,
        message: 'Credential updated successfully'
      });

    } catch (error: any) {
      console.error('[Credentials] Error updating credential:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update credential'
      });
    }
  });

  /**
   * DELETE /api/credentials/:id
   * Delete a credential
   */
  router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const credential = await credentialRepository.findById(id);

      if (!credential) {
        return res.status(404).json({
          success: false,
          error: 'Credential not found'
        });
      }

      // Verify ownership
      if (credential.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      await credentialRepository.delete(id);

      console.log(`[Credentials] ✅ Deleted credential ${id}`);

      res.json({
        success: true,
        message: 'Credential deleted successfully'
      });

    } catch (error: any) {
      console.error('[Credentials] Error deleting credential:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete credential'
      });
    }
  });

  /**
   * POST /api/credentials/:id/validate
   * Re-validate a credential
   */
  router.post('/:id/validate', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const credential = await credentialRepository.findById(id);

      if (!credential) {
        return res.status(404).json({
          success: false,
          error: 'Credential not found'
        });
      }

      // Verify ownership
      if (credential.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      console.log(`[Credentials] Validating ${credential.service} credential ${id}`);

      const validation = await credentialValidator.validate(
        credential.service,
        credential.credential_data
      );

      if (validation.valid) {
        await credentialRepository.markValid(id);
      } else {
        await credentialRepository.markInvalid(id, validation.error);
      }

      res.json({
        success: true,
        data: {
          valid: validation.valid,
          error: validation.error,
          metadata: validation.metadata
        }
      });

    } catch (error: any) {
      console.error('[Credentials] Error validating credential:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to validate credential'
      });
    }
  });

  /**
   * GET /api/credentials/services
   * Get list of all available services
   */
  router.get('/services', async (req: Request, res: Response) => {
    try {
      const services = Object.values(INTEGRATIONS).map(integration => ({
        id: integration.id,
        name: integration.name,
        category: integration.category,
        authType: integration.authType,
        icon: integration.ui.icon,
        color: integration.ui.color,
        description: integration.ui.description,
        fields: integration.apiKey?.fields || null,
        setupGuideUrl: integration.ui.setupGuideUrl
      }));

      res.json({
        success: true,
        data: services
      });
    } catch (error: any) {
      console.error('[Credentials] Error fetching services:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch services'
      });
    }
  });

  /**
   * GET /api/credentials/services/:service
   * Get details for a specific service
   */
  router.get('/services/:service', async (req: Request, res: Response) => {
    try {
      const { service } = req.params;
      const integration = getIntegration(service);

      if (!integration) {
        return res.status(404).json({
          success: false,
          error: `Service '${service}' not found`
        });
      }

      res.json({
        success: true,
        data: {
          id: integration.id,
          name: integration.name,
          category: integration.category,
          authType: integration.authType,
          icon: integration.ui.icon,
          color: integration.ui.color,
          description: integration.ui.description,
          fields: integration.apiKey?.fields || null,
          setupGuideUrl: integration.ui.setupGuideUrl,
          oauthScopes: integration.oauth?.scopes || null
        }
      });
    } catch (error: any) {
      console.error('[Credentials] Error fetching service:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch service details'
      });
    }
  });

  return router;
}
