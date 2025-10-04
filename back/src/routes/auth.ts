import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth-service';
import { AuthRequest, ApiResponse, AuthResponse } from '../types';
import { createAuthMiddleware } from '../middleware/auth';

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(authService);

  /**
   * POST /api/auth/register
   * Register a new user
   */
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const { email, password, name }: AuthRequest = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          error: 'Email, password, and name are required'
        } as ApiResponse);
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format'
        } as ApiResponse);
      }

      // Validate password length
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters'
        } as ApiResponse);
      }

      const { user, token } = await authService.register(email, password, name);

      res.status(201).json({
        success: true,
        data: { user, token }
      } as ApiResponse<AuthResponse>);

    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Registration failed'
      } as ApiResponse);
    }
  });

  /**
   * POST /api/auth/login
   * Login user
   */
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { email, password }: AuthRequest = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        } as ApiResponse);
      }

      const { user, token } = await authService.login(email, password);

      res.json({
        success: true,
        data: { user, token }
      } as ApiResponse<AuthResponse>);

    } catch (error: any) {
      console.error('Login error:', error);
      res.status(401).json({
        success: false,
        error: error.message || 'Login failed'
      } as ApiResponse);
    }
  });

  /**
   * GET /api/auth/me
   * Get current user
   */
  router.get('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = authService.getUserById(req.user!.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: user
      } as ApiResponse);

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user'
      } as ApiResponse);
    }
  });

  /**
   * POST /api/auth/credentials/:service
   * Update user credentials for a service
   */
  router.post('/credentials/:service', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { service } = req.params;
      const credentials = req.body;

      await authService.updateCredentials(req.user!.userId, service, credentials);

      res.json({
        success: true,
        message: `${service} credentials updated successfully`
      } as ApiResponse);

    } catch (error: any) {
      console.error('Update credentials error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update credentials'
      } as ApiResponse);
    }
  });

  /**
   * GET /api/auth/credentials/:service
   * Get user credentials for a service
   */
  router.get('/credentials/:service', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { service } = req.params;
      const credentials = authService.getCredentials(req.user!.userId, service);

      if (!credentials) {
        return res.status(404).json({
          success: false,
          error: `No ${service} credentials found`
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: credentials
      } as ApiResponse);

    } catch (error) {
      console.error('Get credentials error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get credentials'
      } as ApiResponse);
    }
  });

  return router;
}
