import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthenticationError, AuthorizationError } from './errorHandler';
import { logger } from '../config/logger';

export interface UserPayload {
  id: string;
  email: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
  tier?: 'free' | 'premium' | 'enterprise';
}

export interface AuthRequest extends Request {
  user?: UserPayload;
  apiKey?: {
    id: string;
    organizationId: string;
    permissions: string[];
    rateLimit?: {
      windowMs: number;
      max: number;
    };
  };
}

/**
 * JWT Authentication middleware
 */
export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new AuthenticationError('Authorization header required');
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>
    
    if (!token) {
      throw new AuthenticationError('Invalid authorization format. Use: Bearer <token>');
    }

    try {
      const decoded = jwt.verify(token, config.auth.jwtSecret) as UserPayload;
      req.user = decoded;
      
      logger.debug('JWT authentication successful', {
        userId: decoded.id,
        organizationId: decoded.organizationId,
      });
      
      next();
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        throw new AuthenticationError('Token has expired');
      } else if (jwtError.name === 'JsonWebTokenError') {
        throw new AuthenticationError('Invalid token');
      } else {
        throw new AuthenticationError('Token verification failed');
      }
    }
  } catch (error) {
    next(error);
  }
};

/**
 * API Key authentication middleware
 */
export const authenticateAPIKey = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      throw new AuthenticationError('API key required');
    }

    // TODO: Implement actual API key validation with database lookup
    // This is a placeholder implementation
    const mockAPIKey = {
      id: 'mock-api-key',
      organizationId: req.params.organizationId || 'unknown',
      permissions: ['read', 'write'], // This should come from database
      rateLimit: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 1000, // 1000 requests per hour
      },
    };

    req.apiKey = mockAPIKey;
    
    logger.debug('API Key authentication successful', {
      apiKeyId: mockAPIKey.id,
      organizationId: mockAPIKey.organizationId,
    });
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Combined authentication middleware (JWT or API Key)
 */
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const hasJWTToken = req.headers.authorization?.startsWith('Bearer ');
  const hasAPIKey = req.headers['x-api-key'];

  if (hasJWTToken) {
    return authenticateJWT(req, res, next);
  } else if (hasAPIKey) {
    return authenticateAPIKey(req, res, next);
  } else {
    return next(new AuthenticationError('Authentication required. Provide either JWT token or API key.'));
  }
};

/**
 * Optional authentication middleware
 */
export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const hasJWTToken = req.headers.authorization?.startsWith('Bearer ');
  const hasAPIKey = req.headers['x-api-key'];

  if (hasJWTToken || hasAPIKey) {
    return authenticate(req, res, next);
  } else {
    // No authentication provided, but that's okay
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRoles = (roles: string | string[]) => {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const userRoles = req.user.roles || [];
      const hasRequiredRole = requiredRoles.some(role => 
        userRoles.includes(role) || userRoles.includes('super_admin')
      );

      if (!hasRequiredRole) {
        logger.warn('Role authorization failed', {
          userId: req.user.id,
          userRoles,
          requiredRoles,
          path: req.path,
        });
        
        throw new AuthorizationError(
          `Access denied. Required roles: ${requiredRoles.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermissions = (permissions: string | string[]) => {
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
  
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const userPermissions = req.user?.permissions || req.apiKey?.permissions || [];
      
      const hasAllPermissions = requiredPermissions.every(permission =>
        userPermissions.includes(permission) || 
        userPermissions.includes('*') || // Wildcard permission
        (req.user?.roles && req.user.roles.includes('super_admin'))
      );

      if (!hasAllPermissions) {
        logger.warn('Permission authorization failed', {
          userId: req.user?.id,
          apiKeyId: req.apiKey?.id,
          userPermissions,
          requiredPermissions,
          path: req.path,
        });
        
        throw new AuthorizationError(
          `Access denied. Required permissions: ${requiredPermissions.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Organization ownership middleware
 */
export const requireOrganizationAccess = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const { organizationId } = req.params;
    
    if (!organizationId) {
      throw new AuthorizationError('Organization ID required in URL');
    }

    const userOrgId = req.user?.organizationId || req.apiKey?.organizationId;
    
    if (!userOrgId) {
      throw new AuthenticationError('User organization not found');
    }

    // Super admins can access any organization
    const isSuperAdmin = req.user?.roles?.includes('super_admin');
    
    if (userOrgId !== organizationId && !isSuperAdmin) {
      logger.warn('Organization access denied', {
        userId: req.user?.id,
        apiKeyId: req.apiKey?.id,
        userOrganizationId: userOrgId,
        requestedOrganizationId: organizationId,
        path: req.path,
      });
      
      throw new AuthorizationError('Access denied to this organization');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Resource ownership middleware
 */
export const requireResourceOwnership = (resourceIdParam: string = 'id') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resourceId = req.params[resourceIdParam];
      const userId = req.user?.id;
      
      if (!resourceId) {
        throw new AuthorizationError(`Resource ID (${resourceIdParam}) required in URL`);
      }
      
      if (!userId) {
        throw new AuthenticationError('User ID not found in token');
      }

      // TODO: Implement actual resource ownership check with database
      // This is a placeholder implementation
      const isOwner = true; // Mock ownership check
      
      if (!isOwner && !req.user?.roles?.includes('super_admin')) {
        logger.warn('Resource ownership denied', {
          userId,
          resourceId,
          resourceIdParam,
          path: req.path,
        });
        
        throw new AuthorizationError('Access denied to this resource');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Tier-based access middleware
 */
export const requireTier = (minimumTier: 'free' | 'premium' | 'enterprise') => {
  const tierLevels = { free: 0, premium: 1, enterprise: 2 };
  
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const userTier = req.user?.tier || 'free';
      const requiredLevel = tierLevels[minimumTier];
      const userLevel = tierLevels[userTier];
      
      if (userLevel < requiredLevel) {
        logger.warn('Tier access denied', {
          userId: req.user?.id,
          userTier,
          minimumTier,
          path: req.path,
        });
        
        throw new AuthorizationError(
          `This feature requires ${minimumTier} tier or higher. Current tier: ${userTier}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Feature flag middleware
 */
export const requireFeature = (featureName: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // TODO: Implement actual feature flag checking
      // This is a placeholder implementation
      const hasFeature = true; // Mock feature check
      
      if (!hasFeature) {
        logger.warn('Feature access denied', {
          userId: req.user?.id,
          organizationId: req.user?.organizationId,
          featureName,
          path: req.path,
        });
        
        throw new AuthorizationError(`Feature '${featureName}' is not enabled`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Time-based access middleware (e.g., business hours only)
 */
export const requireBusinessHours = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Business hours: Monday-Friday, 6 AM - 10 PM
    const isBusinessDay = day >= 1 && day <= 5;
    const isBusinessHour = hour >= 6 && hour <= 22;
    
    // Super admins can always access
    const isSuperAdmin = req.user?.roles?.includes('super_admin');
    
    if (!isBusinessDay || !isBusinessHour) {
      if (!isSuperAdmin) {
        throw new AuthorizationError('Access restricted to business hours (Mon-Fri, 6 AM - 10 PM)');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * IP whitelist middleware
 */
export const requireWhitelistedIP = (allowedIPs: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const clientIP = req.ip;
      
      if (!allowedIPs.includes(clientIP)) {
        logger.warn('IP access denied', {
          clientIP,
          allowedIPs,
          userId: req.user?.id,
          path: req.path,
        });
        
        throw new AuthorizationError(`Access denied from IP: ${clientIP}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};