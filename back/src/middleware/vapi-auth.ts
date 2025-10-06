import { Request, Response, NextFunction } from 'express';

/**
 * Vapi Webhook Authentication Middleware
 * Validates that requests are coming from Vapi using the webhook secret
 * 
 * According to Vapi docs: https://docs.vapi.ai/server-url/server-authentication
 * Vapi sends the secret in the request headers or body
 */
export function vapiAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const configuredSecret = process.env.VAPI_WEBHOOK_SECRET;

  // Skip validation if no secret is configured (development mode)
  if (!configuredSecret) {
    console.warn('[Vapi Auth] No VAPI_WEBHOOK_SECRET configured - skipping validation');
    return next();
  }

  // Check for secret in headers (common pattern)
  const headerSecret = req.headers['x-vapi-secret'] || req.headers['authorization'];
  
  // Check for secret in body (alternative pattern)
  const bodySecret = req.body?.secret;

  const receivedSecret = headerSecret || bodySecret;

  if (!receivedSecret) {
    console.error('[Vapi Auth] No secret provided in request');
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing authentication secret'
    });
  }

  // Validate secret
  const secretMatch = receivedSecret === configuredSecret || 
                      receivedSecret === `Bearer ${configuredSecret}`;

  if (!secretMatch) {
    console.error('[Vapi Auth] Invalid secret provided');
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid authentication secret'
    });
  }

  // Secret is valid, proceed
  console.log('[Vapi Auth] ✅ Request authenticated');
  next();
}
