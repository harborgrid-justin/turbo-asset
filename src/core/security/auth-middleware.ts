/**
 * Enterprise-grade authentication and authorization middleware
 * Provides comprehensive security for API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getLogger, LogContext, createCorrelationId } from '../config/enterprise-logger';
import { getEnvironmentConfig } from '../config/environment-validation';
import { CustomApiError, AuthenticationError, AuthorizationError } from '../middleware/errorHandler';
import { UserId, JwtToken } from '../types/branded-types';

/**
 * User roles enumeration
 */
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
  TECHNICIAN = 'technician',
  VIEWER = 'viewer'
}

/**
 * Permission enumeration
 */
export enum Permission {
  // Asset permissions
  ASSET_READ = 'asset:read',
  ASSET_WRITE = 'asset:write',
  ASSET_DELETE = 'asset:delete',
  
  // Work order permissions
  WORK_ORDER_READ = 'work_order:read',
  WORK_ORDER_WRITE = 'work_order:write',
  WORK_ORDER_ASSIGN = 'work_order:assign',
  WORK_ORDER_CLOSE = 'work_order:close',
  
  // Space permissions
  SPACE_READ = 'space:read',
  SPACE_WRITE = 'space:write',
  SPACE_MANAGE = 'space:manage',
  
  // User management permissions
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',
  
  // Financial permissions
  BUDGET_READ = 'budget:read',
  BUDGET_WRITE = 'budget:write',
  EXPENSE_APPROVE = 'expense:approve',
  
  // System permissions
  SYSTEM_CONFIG = 'system:config',
  AUDIT_ACCESS = 'audit:access',
  REPORT_ACCESS = 'report:access'
}

/**
 * Authenticated user interface
 */
export interface AuthenticatedUser {
  readonly id: UserId;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: UserRole;
  readonly permissions: readonly Permission[];
  readonly organizationId?: string;
  readonly lastLoginAt?: Date;
  readonly sessionId: string;
}

/**
 * JWT payload interface
 */
export interface JwtPayload {
  readonly sub: string; // User ID
  readonly email: string;
  readonly role: UserRole;
  readonly permissions: Permission[];
  readonly organizationId?: string;
  readonly sessionId: string;
  readonly iat: number;
  readonly exp: number;
}

/**
 * Extended request interface with user context
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  correlationId: string;
}

/**
 * Role-based permission mapping
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
  
  [UserRole.ADMIN]: [
    Permission.ASSET_READ,
    Permission.ASSET_WRITE,
    Permission.ASSET_DELETE,
    Permission.WORK_ORDER_READ,
    Permission.WORK_ORDER_WRITE,
    Permission.WORK_ORDER_ASSIGN,
    Permission.WORK_ORDER_CLOSE,
    Permission.SPACE_READ,
    Permission.SPACE_WRITE,
    Permission.SPACE_MANAGE,
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.BUDGET_READ,
    Permission.BUDGET_WRITE,
    Permission.EXPENSE_APPROVE,
    Permission.REPORT_ACCESS
  ],
  
  [UserRole.MANAGER]: [
    Permission.ASSET_READ,
    Permission.ASSET_WRITE,
    Permission.WORK_ORDER_READ,
    Permission.WORK_ORDER_WRITE,
    Permission.WORK_ORDER_ASSIGN,
    Permission.SPACE_READ,
    Permission.SPACE_WRITE,
    Permission.USER_READ,
    Permission.BUDGET_READ,
    Permission.EXPENSE_APPROVE,
    Permission.REPORT_ACCESS
  ],
  
  [UserRole.USER]: [
    Permission.ASSET_READ,
    Permission.WORK_ORDER_READ,
    Permission.WORK_ORDER_WRITE,
    Permission.SPACE_READ,
    Permission.BUDGET_READ,
    Permission.REPORT_ACCESS
  ],
  
  [UserRole.TECHNICIAN]: [
    Permission.ASSET_READ,
    Permission.ASSET_WRITE,
    Permission.WORK_ORDER_READ,
    Permission.WORK_ORDER_WRITE,
    Permission.WORK_ORDER_CLOSE,
    Permission.SPACE_READ
  ],
  
  [UserRole.VIEWER]: [
    Permission.ASSET_READ,
    Permission.WORK_ORDER_READ,
    Permission.SPACE_READ,
    Permission.BUDGET_READ,
    Permission.REPORT_ACCESS
  ]
};

/**
 * JWT token service for authentication
 */
export class JwtService {
  private readonly logger = getLogger();
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor() {
    const env = getEnvironmentConfig();
    this.secret = env.JWT_SECRET;
    this.expiresIn = env.JWT_EXPIRES_IN;
  }

  /**
   * Generate JWT token for user
   */
  generateToken(user: Omit<AuthenticatedUser, 'sessionId'>): JwtToken {
    const sessionId = createCorrelationId();
    
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: [...user.permissions],
      organizationId: user.organizationId,
      sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (parseInt(this.expiresIn.replace('h', '')) * 3600)
    };

    try {
      const token = jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
      
      this.logger.audit('JWT token generated', {
        userId: user.id,
        sessionId,
        result: 'success'
      });
      
      return token as JwtToken;
    } catch (error) {
      this.logger.error('JWT token generation failed', { userId: user.id }, error as Error);
      throw new CustomApiError('Token generation failed', 500, 'TOKEN_GENERATION_ERROR');
    }
  }

  /**
   * Verify and decode JWT token
   */
  verifyToken(token: JwtToken): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.secret) as JwtPayload;
      
      // Validate payload structure
      if (!decoded.sub || !decoded.email || !decoded.role || !decoded.permissions) {
        throw new AuthenticationError('Invalid token payload');
      }
      
      return decoded;
    } catch (error) {
      this.logger.warn('JWT token verification failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token');
      }
      
      throw new AuthenticationError('Token verification failed');
    }
  }

  /**
   * Refresh JWT token
   */
  refreshToken(token: JwtToken): JwtToken {
    try {
      const decoded = this.verifyToken(token);
      
      // Create new token with extended expiration
      const user: Omit<AuthenticatedUser, 'sessionId' | 'lastLoginAt'> = {
        id: decoded.sub as UserId,
        email: decoded.email,
        firstName: '', // Would be fetched from database in real implementation
        lastName: '',
        role: decoded.role,
        permissions: decoded.permissions,
        organizationId: decoded.organizationId
      };
      
      return this.generateToken(user);
    } catch (error) {
      this.logger.error('JWT token refresh failed', undefined, error as Error);
      throw new AuthenticationError('Token refresh failed');
    }
  }
}

// Singleton JWT service instance
const jwtService = new JwtService();

/**
 * Authentication middleware
 */
export function authenticate() {
  const logger = getLogger();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = createCorrelationId();
    (req as any).correlationId = correlationId;
    
    const context: LogContext = { correlationId };

    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError('Missing or invalid authorization header');
      }

      const token = authHeader.substring(7) as JwtToken;
      const decoded = jwtService.verifyToken(token);

      // Create authenticated user object
      const user: AuthenticatedUser = {
        id: decoded.sub as UserId,
        email: decoded.email,
        firstName: '', // Would be fetched from database
        lastName: '',
        role: decoded.role,
        permissions: decoded.permissions,
        organizationId: decoded.organizationId,
        sessionId: decoded.sessionId
      };

      // Attach user to request
      (req as AuthenticatedRequest).user = user;

      logger.info('User authenticated successfully', {
        ...context,
        userId: user.id,
        role: user.role,
        sessionId: user.sessionId
      });

      next();
    } catch (error) {
      logger.warn('Authentication failed', context, error as Error);
      
      if (error instanceof AuthenticationError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Authentication service error',
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  };
}

/**
 * Authorization middleware factory
 */
export function authorize(...requiredPermissions: Permission[]) {
  const logger = getLogger();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.user) {
      logger.error('Authorization check failed: No authenticated user', { 
        correlationId: authReq.correlationId 
      });
      
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Check if user has all required permissions
    const userPermissions = new Set(authReq.user.permissions);
    const hasPermissions = requiredPermissions.every(permission => 
      userPermissions.has(permission)
    );

    if (!hasPermissions) {
      logger.audit('Authorization denied', {
        correlationId: authReq.correlationId,
        userId: authReq.user.id,
        requiredPermissions,
        userPermissions: authReq.user.permissions,
        result: 'failure'
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Insufficient permissions',
          timestamp: new Date().toISOString(),
          details: {
            required: requiredPermissions,
            missing: requiredPermissions.filter(p => !userPermissions.has(p))
          }
        }
      });
      return;
    }

    logger.debug('Authorization successful', {
      correlationId: authReq.correlationId,
      userId: authReq.user.id,
      requiredPermissions
    });

    next();
  };
}

/**
 * Role-based authorization middleware factory
 */
export function authorizeRole(...requiredRoles: UserRole[]) {
  const logger = getLogger();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    if (!requiredRoles.includes(authReq.user.role)) {
      logger.audit('Role-based authorization denied', {
        correlationId: authReq.correlationId,
        userId: authReq.user.id,
        userRole: authReq.user.role,
        requiredRoles,
        result: 'failure'
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Insufficient role privileges',
          timestamp: new Date().toISOString(),
          details: {
            userRole: authReq.user.role,
            requiredRoles
          }
        }
      });
      return;
    }

    next();
  };
}

/**
 * Organization-scoped authorization middleware
 */
export function authorizeOrganization() {
  const logger = getLogger();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    const requestedOrgId = req.params.organizationId;
    
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Super admins can access any organization
    if (authReq.user.role === UserRole.SUPER_ADMIN) {
      next();
      return;
    }

    // Check if user belongs to the requested organization
    if (authReq.user.organizationId !== requestedOrgId) {
      logger.audit('Organization access denied', {
        correlationId: authReq.correlationId,
        userId: authReq.user.id,
        userOrganization: authReq.user.organizationId,
        requestedOrganization: requestedOrgId,
        result: 'failure'
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'ORGANIZATION_ACCESS_DENIED',
          message: 'Access denied to organization',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
}

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Export JWT service for external use
 */
export { jwtService as JwtService };