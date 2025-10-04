import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth-service';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export function createAuthMiddleware(authService: AuthService) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'No token provided'
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify token
      const decoded = authService.verifyToken(token);
      
      // Attach user to request
      req.user = decoded;
      
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
  };
}

/**
 * Optional auth middleware
 * Attaches user if token is present, but doesn't require it
 */
export function createOptionalAuthMiddleware(authService: AuthService) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = authService.verifyToken(token);
        req.user = decoded;
      }
      
      next();
    } catch (error) {
      // Token is invalid, but that's okay for optional auth
      next();
    }
  };
}
