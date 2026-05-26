import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';
import { AuthenticationError, AuthorizationError } from './errorHandler';
import { logger } from '@/config/logger';
import { UserPayload } from '../types/express';

/** SHA-256 hex digest of a raw API key. Keys are only ever stored hashed. */
const hashApiKey = (key: string): string =>
  crypto.createHash('sha256').update(key).digest('hex');

/** Normalize a stored permissions value (JSON array, JSON string, or CSV) to string[]. */
const parsePermissions = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
  }
  return [];
};

/**
 * Enabled feature set from the ENABLED_FEATURES env var (comma-separated).
 * Returns null when unset, meaning "not configured" (features default to on so
 * an operator must opt in to gating rather than have it silently block).
 */
const getEnabledFeatures = (): Set<string> | null => {
  const raw = process.env.ENABLED_FEATURES;
  if (!raw || raw.trim().length === 0) {
    return null;
  }
  return new Set(
    raw
      .split(',')
      .map((feature) => feature.trim())
      .filter((feature) => feature.length > 0)
  );
};

/**
 * JWT Authentication middleware
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
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
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * API Key authentication middleware
 */
export const authenticateAPIKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new AuthenticationError('API key required');
    }

    // Look the key up by its hash; the raw key is never stored.
    const record = await prisma.apiKey.findFirst({
      where: { keyHash: hashApiKey(apiKey), isActive: true },
    });

    if (!record) {
      throw new AuthenticationError('Invalid API key');
    }

    if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
      throw new AuthenticationError('API key has expired');
    }

    req.apiKey = {
      id: record.id,
      organizationId: record.organizationId,
      permissions: parsePermissions(record.permissions),
    };

    logger.debug('API Key authentication successful', {
      apiKeyId: record.id,
      organizationId: record.organizationId,
    });

    next();
  } catch (error: unknown) {
    // Fail closed: a known auth error or any unexpected failure (including an
    // unavailable key store) denies access rather than granting it.
    if (error instanceof AuthenticationError) {
      next(error);
    } else {
      logger.error('API key validation error', { error });
      next(new AuthenticationError('API key validation failed'));
    }
  }
};

/**
 * Combined authentication middleware (JWT or API Key)
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const hasJWTToken = req.headers.authorization?.startsWith('Bearer ');
  const hasAPIKey = req.headers['x-api-key'];

  if (hasJWTToken) {
    authenticateJWT(req, res, next); return;
  } else if (hasAPIKey) {
    authenticateAPIKey(req, res, next); return;
  } else {
    next(new AuthenticationError('Authentication required. Provide either JWT token or API key.')); return;
  }
};

/**
 * Optional authentication middleware
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const hasJWTToken = req.headers.authorization?.startsWith('Bearer ');
  const hasAPIKey = req.headers['x-api-key'];

  if (hasJWTToken || hasAPIKey) {
    authenticate(req, res, next); return;
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
  
  return (req: Request, res: Response, next: NextFunction): void => {
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
    } catch (error: unknown) {
      next(error);
    }
  };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermissions = (permissions: string | string[]) => {
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
  
  return (req: Request, res: Response, next: NextFunction): void => {
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
    } catch (error: unknown) {
      next(error);
    }
  };
};

/**
 * Organization ownership middleware
 */
export const requireOrganizationAccess = (req: Request, res: Response, next: NextFunction): void => {
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
    const isSuperAdmin = req.user?.roles.includes('super_admin');
    
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
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Resource ownership middleware
 */
export const requireResourceOwnership = (
  modelName: string,
  resourceIdParam: string = 'id'
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resourceId = req.params[resourceIdParam];
      const userId = req.user?.id;
      const userOrgId = req.user?.organizationId;
      const roles = req.user?.roles ?? [];

      if (!resourceId) {
        throw new AuthorizationError(`Resource ID (${resourceIdParam}) required in URL`);
      }

      if (!userId) {
        throw new AuthenticationError('User ID not found in token');
      }

      // Only super_admin may cross the organization boundary; a tenant-scoped
      // admin may bypass per-record ownership but stays within its own org.
      const isSuperAdmin = roles.includes('super_admin');
      const isAdmin = isSuperAdmin || roles.includes('admin');

      const model = (prisma as Record<string, any>)[modelName];
      if (!model || typeof model.findUnique !== 'function') {
        throw new AuthorizationError(`Unknown resource type: ${modelName}`);
      }

      const record = await model.findUnique({ where: { id: resourceId } });
      if (!record) {
        throw new AuthorizationError('Resource not found');
      }

      const denyAccess = (reason: string): never => {
        logger.warn('Resource access denied', {
          reason,
          userId,
          organizationId: userOrgId,
          modelName,
          resourceId,
          path: req.path,
        });
        throw new AuthorizationError('Access denied to this resource');
      };

      // Multi-tenant boundary (fail closed): an org-scoped record must match the
      // caller's org. A caller lacking org context cannot reach another org's data.
      const recordOrgId = record.organizationId;
      if (recordOrgId && recordOrgId !== userOrgId && !isSuperAdmin) {
        denyAccess('cross-tenant');
      }

      // Ownership: when the record exposes an owner field, non-admins must match
      // it. Org-scoped records without a personal owner rely on the tenant check.
      const ownerId =
        record.createdById ?? record.createdBy ?? record.ownerId ?? record.userId;
      const ownsResource = ownerId === undefined || ownerId === userId;
      if (!ownsResource && !isAdmin) {
        denyAccess('ownership');
      }

      next();
    } catch (error: unknown) {
      next(error);
    }
  };
};

/**
 * Tier-based access middleware
 */
export const requireTier = (minimumTier: 'free' | 'premium' | 'enterprise') => {
  const tierLevels = { free: 0, premium: 1, enterprise: 2 };
  
  return (req: Request, res: Response, next: NextFunction): void => {
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
    } catch (error: unknown) {
      next(error);
    }
  };
};

/**
 * Feature flag middleware
 */
export const requireFeature = (featureName: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const enabledFeatures = getEnabledFeatures();
      // Unset env => not configured => allow; otherwise gate on membership.
      const hasFeature = enabledFeatures === null || enabledFeatures.has(featureName);

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
    } catch (error: unknown) {
      next(error);
    }
  };
};

/**
 * Time-based access middleware (e.g., business hours only)
 */
export const requireBusinessHours = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Business hours: Monday-Friday, 6 AM - 10 PM
    const isBusinessDay = day >= 1 && day <= 5;
    const isBusinessHour = hour >= 6 && hour <= 22;
    
    // Super admins can always access
    const isSuperAdmin = req.user?.roles.includes('super_admin');
    
    if (!isBusinessDay || !isBusinessHour) {
      if (!isSuperAdmin) {
        throw new AuthorizationError('Access restricted to business hours (Mon-Fri, 6 AM - 10 PM)');
      }
    }

    next();
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * IP whitelist middleware
 */
export const requireWhitelistedIP = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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
    } catch (error: unknown) {
      next(error);
    }
  };
};