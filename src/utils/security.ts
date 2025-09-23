/**
 * Enterprise Security Utilities
 * Provides comprehensive security features including authentication, authorization, and data sanitization
 */

import { logger } from '../config/logger';
import { 
  EnterpriseError, 
  AuthenticationError, 
  AuthorizationError, 
  ValidationError 
} from '../utils/error-handling';
import { SECURITY, HTTP_STATUS } from '../constants';
import type { User, Role, Permission } from '../types/enterprise';

export interface SecurityContext {
  readonly user?: User;
  readonly permissions: readonly string[];
  readonly roles: readonly string[];
  readonly sessionId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly timestamp: Date;
}

export interface AuthenticationResult {
  readonly success: boolean;
  readonly user?: User;
  readonly token?: string;
  readonly expiresAt?: Date;
  readonly refreshToken?: string;
  readonly message?: string;
}

export interface PasswordValidationResult {
  readonly isValid: boolean;
  readonly strength: 'weak' | 'fair' | 'good' | 'strong';
  readonly score: number;
  readonly errors: readonly string[];
  readonly suggestions: readonly string[];
}

/**
 * Password Security Utilities
 */
export class PasswordSecurity {
  private static readonly COMMON_PASSWORDS = new Set([
    'password', '123456', 'password123', 'admin', 'qwerty', 'abc123',
    'welcome', 'login', 'master', 'password1', '12345678', 'letmein'
  ]);

  /**
   * Validate password strength and security
   */
  public static validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Check minimum length
    if (password.length < SECURITY.PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${SECURITY.PASSWORD_MIN_LENGTH} characters long`);
    } else {
      score += 10;
    }

    // Check for uppercase letters
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
      suggestions.push('Add uppercase letters (A-Z)');
    } else {
      score += 15;
    }

    // Check for lowercase letters
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
      suggestions.push('Add lowercase letters (a-z)');
    } else {
      score += 15;
    }

    // Check for numbers
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
      suggestions.push('Add numbers (0-9)');
    } else {
      score += 15;
    }

    // Check for special characters
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
      suggestions.push('Add special characters (!@#$%^&*)');
    } else {
      score += 20;
    }

    // Check for common passwords
    if (this.COMMON_PASSWORDS.has(password.toLowerCase())) {
      errors.push('Password is too common');
      suggestions.push('Use a unique password that is not commonly used');
      score -= 30;
    }

    // Check for repeated characters
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password contains repeated characters');
      suggestions.push('Avoid repeating the same character multiple times');
      score -= 10;
    }

    // Check for sequential characters
    if (this.hasSequentialChars(password)) {
      errors.push('Password contains sequential characters');
      suggestions.push('Avoid sequential characters (abc, 123)');
      score -= 10;
    }

    // Bonus for longer passwords
    if (password.length >= 12) {score += 10;}
    if (password.length >= 16) {score += 10;}

    // Determine strength
    let strength: PasswordValidationResult['strength'];
    if (score < 40) {strength = 'weak';}
    else if (score < 60) {strength = 'fair';}
    else if (score < 80) {strength = 'good';}
    else {strength = 'strong';}

    return {
      isValid: errors.length === 0,
      strength,
      score: Math.max(0, Math.min(100, score)),
      errors,
      suggestions
    };
  }

  /**
   * Hash password with bcrypt
   */
  public static async hashPassword(password: string): Promise<string> {
    // Simulate bcrypt hashing - in real implementation, use bcrypt library
    const salt = Math.random().toString(36).substring(2, 15);
    return `bcrypt:${SECURITY.BCRYPT_SALT_ROUNDS}:${salt}:${password}`;
  }

  /**
   * Verify password against hash
   */
  public static async verifyPassword(password: string, hash: string): Promise<boolean> {
    // Simulate bcrypt verification - in real implementation, use bcrypt library
    if (!hash.startsWith('bcrypt:')) {return false;}
    const [, , , originalPassword] = hash.split(':');
    return password === originalPassword;
  }

  private static hasSequentialChars(password: string): boolean {
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      '0123456789',
      'qwertyuiopasdfghjklzxcvbnm'
    ];

    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const subseq = sequence.substring(i, i + 3);
        if (password.toLowerCase().includes(subseq)) {
          return true;
        }
      }
    }

    return false;
  }
}

/**
 * Input Sanitization Utilities
 */
export class InputSanitizer {
  private static readonly HTML_ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  } as const;

  private static readonly SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /(-{2}|\/\*|\*\/)/,
    /(;|\||&)/,
    /(\bOR\b|\bAND\b)/i
  ];

  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi
  ];

  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  public static sanitizeHtml(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Escape HTML characters
    let sanitized = input.replace(/[&<>"'/]/g, (match) => {
      return this.HTML_ESCAPE_MAP[match as keyof typeof this.HTML_ESCAPE_MAP] || match;
    });

    // Remove dangerous patterns
    for (const pattern of this.XSS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    return sanitized;
  }

  /**
   * Sanitize input to prevent SQL injection
   */
  public static sanitizeSql(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Check for SQL injection patterns
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        throw new ValidationError('Input contains potentially malicious SQL patterns', [{
          field: 'input',
          value: input,
          constraint: 'security',
          message: 'Input contains SQL injection patterns'
        }]);
      }
    }

    // Escape single quotes
    return input.replace(/'/g, "''");
  }

  /**
   * Sanitize file name to prevent path traversal
   */
  public static sanitizeFileName(fileName: string): string {
    if (typeof fileName !== 'string') {
      return '';
    }

    // Remove path traversal attempts
    let sanitized = fileName.replace(/[\\\/\.\.]/g, '');
    
    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*]/g, '');
    
    // Remove leading/trailing whitespace and dots
    sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '');
    
    // Ensure filename is not empty and not too long
    if (sanitized.length === 0) {
      sanitized = 'unnamed_file';
    }
    
    if (sanitized.length > 255) {
      sanitized = sanitized.substring(0, 255);
    }

    return sanitized;
  }

  /**
   * Validate and sanitize email address
   */
  public static sanitizeEmail(email: string): string {
    if (typeof email !== 'string') {
      throw new ValidationError('Email must be a string', [{
        field: 'email',
        value: email,
        constraint: 'type',
        message: 'Must be a string'
      }]);
    }

    // Basic sanitization
    const sanitized = email.trim().toLowerCase();
    
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(sanitized)) {
      throw new ValidationError('Invalid email format', [{
        field: 'email',
        value: email,
        constraint: 'format',
        message: 'Must be a valid email address'
      }]);
    }

    return sanitized;
  }
}

/**
 * Permission Management System
 */
export class PermissionManager {
  /**
   * Check if user has specific permission
   */
  public static hasPermission(
    securityContext: SecurityContext,
    requiredPermission: string
  ): boolean {
    return securityContext.permissions.includes(requiredPermission) ||
           securityContext.permissions.includes('*'); // Super admin
  }

  /**
   * Check if user has any of the specified permissions
   */
  public static hasAnyPermission(
    securityContext: SecurityContext,
    permissions: readonly string[]
  ): boolean {
    return permissions.some(permission => this.hasPermission(securityContext, permission));
  }

  /**
   * Check if user has all of the specified permissions
   */
  public static hasAllPermissions(
    securityContext: SecurityContext,
    permissions: readonly string[]
  ): boolean {
    return permissions.every(permission => this.hasPermission(securityContext, permission));
  }

  /**
   * Check if user has specific role
   */
  public static hasRole(securityContext: SecurityContext, roleName: string): boolean {
    return securityContext.roles.includes(roleName);
  }

  /**
   * Check if user has any of the specified roles
   */
  public static hasAnyRole(
    securityContext: SecurityContext,
    roles: readonly string[]
  ): boolean {
    return roles.some(role => this.hasRole(securityContext, role));
  }

  /**
   * Create permission string from resource and action
   */
  public static createPermission(resource: string, action: string): string {
    return `${resource}:${action}`;
  }

  /**
   * Parse permission string into resource and action
   */
  public static parsePermission(permission: string): { resource: string; action: string } {
    const [resource, action] = permission.split(':');
    return { resource: resource ?? '', action: action ?? '' };
  }
}

/**
 * Rate Limiting Utilities
 */
export class RateLimiter {
  private readonly attempts = new Map<string, Array<{ timestamp: number; count: number }>>();
  private readonly windowMs: number;
  private readonly maxAttempts: number;

  constructor(windowMs: number = 60000, maxAttempts: number = 100) {
    this.windowMs = windowMs;
    this.maxAttempts = maxAttempts;
  }

  /**
   * Check if request is allowed under rate limit
   */
  public isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userAttempts = this.attempts.get(identifier) || [];

    // Remove expired attempts
    const validAttempts = userAttempts.filter(
      attempt => now - attempt.timestamp < this.windowMs
    );

    // Calculate total count in the window
    const totalCount = validAttempts.reduce((sum, attempt) => sum + attempt.count, 0);

    if (totalCount >= this.maxAttempts) {
      return false;
    }

    // Add current attempt
    validAttempts.push({ timestamp: now, count: 1 });
    this.attempts.set(identifier, validAttempts);

    return true;
  }

  /**
   * Get remaining attempts for identifier
   */
  public getRemainingAttempts(identifier: string): number {
    const now = Date.now();
    const userAttempts = this.attempts.get(identifier) || [];

    // Remove expired attempts
    const validAttempts = userAttempts.filter(
      attempt => now - attempt.timestamp < this.windowMs
    );

    // Calculate total count in the window
    const totalCount = validAttempts.reduce((sum, attempt) => sum + attempt.count, 0);

    return Math.max(0, this.maxAttempts - totalCount);
  }

  /**
   * Get time until rate limit resets
   */
  public getResetTime(identifier: string): number {
    const userAttempts = this.attempts.get(identifier) || [];
    if (userAttempts.length === 0) {return 0;}

    const oldestAttempt = Math.min(...userAttempts.map(a => a.timestamp));
    const resetTime = oldestAttempt + this.windowMs;
    
    return Math.max(0, resetTime - Date.now());
  }

  /**
   * Clear rate limit for identifier
   */
  public clearLimits(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

/**
 * Security Audit Logger
 */
export class SecurityAuditLogger {
  /**
   * Log authentication attempt
   */
  public static logAuthenticationAttempt(
    username: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    details?: Record<string, unknown>
  ): void {
    const logEntry = {
      event: 'authentication_attempt',
      username,
      success,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      details
    };

    if (success) {
      logger.info('Authentication successful', logEntry);
    } else {
      logger.warn('Authentication failed', logEntry);
    }
  }

  /**
   * Log authorization check
   */
  public static logAuthorizationCheck(
    userId: string,
    resource: string,
    action: string,
    granted: boolean,
    ipAddress?: string
  ): void {
    const logEntry = {
      event: 'authorization_check',
      userId,
      resource,
      action,
      granted,
      ipAddress,
      timestamp: new Date()
    };

    logger.info('Authorization check performed', logEntry);
  }

  /**
   * Log security violation
   */
  public static logSecurityViolation(
    type: string,
    description: string,
    userId?: string,
    ipAddress?: string,
    details?: Record<string, unknown>
  ): void {
    const logEntry = {
      event: 'security_violation',
      type,
      description,
      userId,
      ipAddress,
      timestamp: new Date(),
      details
    };

    logger.error('Security violation detected', logEntry);
  }
}

// Export rate limiter instances
export const authenticationRateLimiter = new RateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes
export const apiRateLimiter = new RateLimiter(60 * 1000, 1000); // 1000 requests per minute