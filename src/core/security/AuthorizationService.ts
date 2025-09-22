/**
 * Enterprise Authorization System
 * Role-based access control with permissions and policies
 */

import { logger } from '../../config/logger';
import { UserRole, Permissions } from '../../types/enums-constants';

/**
 * Permission interface
 */
export interface Permission {
  readonly id: string;
  readonly name: string;
  readonly resource: string;
  readonly action: string;
  readonly conditions?: Record<string, unknown>;
}

/**
 * Role interface
 */
export interface Role {
  readonly id: string;
  readonly name: UserRole;
  readonly description: string;
  readonly permissions: readonly Permission[];
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * User context for authorization
 */
export interface UserContext {
  readonly id: string;
  readonly organizationId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
  readonly isActive: boolean;
  readonly sessionId?: string;
}

/**
 * Authorization request context
 */
export interface AuthorizationContext {
  readonly user: UserContext;
  readonly resource: string;
  readonly action: string;
  readonly resourceId?: string;
  readonly organizationId: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Authorization result
 */
export interface AuthorizationResult {
  readonly granted: boolean;
  readonly reason?: string;
  readonly requiredPermission?: Permission;
  readonly evaluatedPolicies: readonly string[];
  readonly executionTime: number;
}

/**
 * Policy evaluation result
 */
export interface PolicyEvaluationResult {
  readonly policyId: string;
  readonly allowed: boolean;
  readonly reason: string;
  readonly conditions?: Record<string, unknown>;
}

/**
 * Authorization policy interface
 */
export interface AuthorizationPolicy {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly resource: string;
  readonly action: string;
  readonly effect: 'ALLOW' | 'DENY';
  readonly conditions: readonly PolicyCondition[];
  readonly priority: number;
  readonly isActive: boolean;
}

/**
 * Policy condition interface
 */
export interface PolicyCondition {
  readonly field: string;
  readonly operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'exists' | 'regex';
  readonly value: unknown;
  readonly type: 'user' | 'resource' | 'environment' | 'time';
}

/**
 * Authorization cache entry
 */
interface AuthorizationCacheEntry {
  readonly result: AuthorizationResult;
  readonly timestamp: Date;
  readonly ttl: number;
}

/**
 * Enterprise authorization service
 */
export class EnterpriseAuthorizationService {
  private static instance: EnterpriseAuthorizationService;
  private readonly authorizationCache = new Map<string, AuthorizationCacheEntry>();
  private readonly policies: AuthorizationPolicy[] = [];
  private readonly cacheTTL = 300000; // 5 minutes

  private constructor() {}

  static getInstance(): EnterpriseAuthorizationService {
    if (!EnterpriseAuthorizationService.instance) {
      EnterpriseAuthorizationService.instance = new EnterpriseAuthorizationService();
    }
    return EnterpriseAuthorizationService.instance;
  }

  /**
   * Check if user is authorized for a specific action
   */
  async authorize(context: AuthorizationContext): Promise<AuthorizationResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(context);

    try {
      // Check cache first
      const cachedResult = this.getCachedResult(cacheKey);
      if (cachedResult) {
        logger.debug('Authorization cache hit', { 
          userId: context.user.id,
          resource: context.resource,
          action: context.action 
        });
        return cachedResult;
      }

      // Perform authorization check
      const result = await this.performAuthorization(context, startTime);
      
      // Cache the result
      this.cacheResult(cacheKey, result);
      
      logger.info('Authorization completed', {
        userId: context.user.id,
        resource: context.resource,
        action: context.action,
        granted: result.granted,
        executionTime: result.executionTime
      });

      return result;

    } catch (error) {
      logger.error('Authorization error', {
        userId: context.user.id,
        resource: context.resource,
        action: context.action,
        error
      });

      return {
        granted: false,
        reason: 'Authorization service error',
        evaluatedPolicies: [],
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check multiple permissions at once
   */
  async authorizeMultiple(
    user: UserContext,
    requests: Array<{ resource: string; action: string; resourceId?: string }>
  ): Promise<Record<string, AuthorizationResult>> {
    const results: Record<string, AuthorizationResult> = {};
    
    const authPromises = requests.map(async (request) => {
      const context: AuthorizationContext = {
        user,
        resource: request.resource,
        action: request.action,
        resourceId: request.resourceId,
        organizationId: user.organizationId
      };
      
      const result = await this.authorize(context);
      const key = `${request.resource}:${request.action}`;
      return { key, result };
    });

    const resolvedResults = await Promise.all(authPromises);
    
    for (const { key, result } of resolvedResults) {
      results[key] = result;
    }

    return results;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(user: UserContext, permissionName: string): boolean {
    return user.permissions.some(permission => 
      permission.name === permissionName || permission.id === permissionName
    );
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(user: UserContext, roles: readonly UserRole[]): boolean {
    return user.roles.some(userRole => 
      roles.includes(userRole.name)
    );
  }

  /**
   * Check if user has all of the specified roles
   */
  hasAllRoles(user: UserContext, roles: readonly UserRole[]): boolean {
    return roles.every(requiredRole =>
      user.roles.some(userRole => userRole.name === requiredRole)
    );
  }

  /**
   * Get effective permissions for user
   */
  getEffectivePermissions(user: UserContext): readonly Permission[] {
    const allPermissions = new Map<string, Permission>();
    
    // Collect permissions from roles
    for (const role of user.roles) {
      if (role.isActive) {
        for (const permission of role.permissions) {
          allPermissions.set(permission.id, permission);
        }
      }
    }
    
    // Add direct permissions
    for (const permission of user.permissions) {
      allPermissions.set(permission.id, permission);
    }
    
    return Array.from(allPermissions.values());
  }

  /**
   * Register authorization policy
   */
  registerPolicy(policy: AuthorizationPolicy): void {
    const existingIndex = this.policies.findIndex(p => p.id === policy.id);
    
    if (existingIndex >= 0) {
      this.policies[existingIndex] = policy;
    } else {
      this.policies.push(policy);
    }
    
    // Sort by priority (higher priority first)
    this.policies.sort((a, b) => b.priority - a.priority);
    
    // Clear cache when policies change
    this.clearCache();
    
    logger.info('Authorization policy registered', { policyId: policy.id, name: policy.name });
  }

  /**
   * Remove authorization policy
   */
  removePolicy(policyId: string): boolean {
    const index = this.policies.findIndex(p => p.id === policyId);
    
    if (index >= 0) {
      this.policies.splice(index, 1);
      this.clearCache();
      logger.info('Authorization policy removed', { policyId });
      return true;
    }
    
    return false;
  }

  /**
   * Clear authorization cache
   */
  clearCache(): void {
    this.authorizationCache.clear();
    logger.info('Authorization cache cleared');
  }

  /**
   * Perform the actual authorization logic
   */
  private async performAuthorization(
    context: AuthorizationContext,
    startTime: number
  ): Promise<AuthorizationResult> {
    const evaluatedPolicies: string[] = [];
    
    // Check if user is active
    if (!context.user.isActive) {
      return {
        granted: false,
        reason: 'User account is inactive',
        evaluatedPolicies,
        executionTime: Date.now() - startTime
      };
    }
    
    // Check organization match
    if (context.organizationId !== context.user.organizationId) {
      return {
        granted: false,
        reason: 'Organization access denied',
        evaluatedPolicies,
        executionTime: Date.now() - startTime
      };
    }
    
    // Check direct permissions first
    const requiredPermissionName = `${context.resource}:${context.action}`;
    const hasDirectPermission = this.hasPermission(context.user, requiredPermissionName);
    
    if (hasDirectPermission) {
      return {
        granted: true,
        evaluatedPolicies,
        executionTime: Date.now() - startTime
      };
    }
    
    // Evaluate policies
    const policyResults = await this.evaluatePolicies(context);
    evaluatedPolicies.push(...policyResults.map(r => r.policyId));
    
    // Check for explicit DENY first
    const denyResult = policyResults.find(r => r.policyId.includes('DENY') && !r.allowed);
    if (denyResult) {
      return {
        granted: false,
        reason: denyResult.reason,
        evaluatedPolicies,
        executionTime: Date.now() - startTime
      };
    }
    
    // Check for explicit ALLOW
    const allowResult = policyResults.find(r => r.allowed);
    if (allowResult) {
      return {
        granted: true,
        evaluatedPolicies,
        executionTime: Date.now() - startTime
      };
    }
    
    // Default deny
    return {
      granted: false,
      reason: 'No matching authorization policy found',
      evaluatedPolicies,
      executionTime: Date.now() - startTime
    };
  }

  /**
   * Evaluate authorization policies
   */
  private async evaluatePolicies(context: AuthorizationContext): Promise<PolicyEvaluationResult[]> {
    const results: PolicyEvaluationResult[] = [];
    
    const applicablePolicies = this.policies.filter(policy =>
      policy.isActive &&
      policy.resource === context.resource &&
      policy.action === context.action
    );
    
    for (const policy of applicablePolicies) {
      const conditionsMet = await this.evaluatePolicyConditions(policy.conditions, context);
      
      results.push({
        policyId: policy.id,
        allowed: policy.effect === 'ALLOW' && conditionsMet,
        reason: conditionsMet 
          ? `Policy ${policy.id} conditions satisfied`
          : `Policy ${policy.id} conditions not met`,
        conditions: policy.conditions.reduce((acc, condition) => {
          acc[condition.field] = condition.value;
          return acc;
        }, {} as Record<string, unknown>)
      });
    }
    
    return results;
  }

  /**
   * Evaluate policy conditions
   */
  private async evaluatePolicyConditions(
    conditions: readonly PolicyCondition[],
    context: AuthorizationContext
  ): Promise<boolean> {
    if (conditions.length === 0) {
      return true;
    }
    
    for (const condition of conditions) {
      const actualValue = this.getConditionValue(condition, context);
      
      if (!this.evaluateCondition(condition, actualValue)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get the actual value for a condition
   */
  private getConditionValue(condition: PolicyCondition, context: AuthorizationContext): unknown {
    switch (condition.type) {
      case 'user':
        return this.getNestedValue(context.user, condition.field);
      case 'resource':
        return context.resourceId || context.resource;
      case 'environment':
        return context.metadata?.[condition.field];
      case 'time':
        return new Date();
      default:
        return undefined;
    }
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: PolicyCondition, actualValue: unknown): boolean {
    const { operator, value } = condition;
    
    switch (operator) {
      case 'eq':
        return actualValue === value;
      case 'ne':
        return actualValue !== value;
      case 'gt':
        return Number(actualValue) > Number(value);
      case 'lt':
        return Number(actualValue) < Number(value);
      case 'gte':
        return Number(actualValue) >= Number(value);
      case 'lte':
        return Number(actualValue) <= Number(value);
      case 'in':
        return Array.isArray(value) && value.includes(actualValue);
      case 'nin':
        return Array.isArray(value) && !value.includes(actualValue);
      case 'exists':
        return actualValue !== undefined && actualValue !== null;
      case 'regex':
        return typeof actualValue === 'string' && new RegExp(String(value)).test(actualValue);
      default:
        return false;
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' && key in current 
        ? (current as Record<string, unknown>)[key] 
        : undefined;
    }, obj);
  }

  /**
   * Generate cache key for authorization request
   */
  private generateCacheKey(context: AuthorizationContext): string {
    const keyParts = [
      context.user.id,
      context.resource,
      context.action,
      context.resourceId || '',
      context.organizationId
    ];
    
    return keyParts.join(':');
  }

  /**
   * Get cached authorization result
   */
  private getCachedResult(cacheKey: string): AuthorizationResult | null {
    const cached = this.authorizationCache.get(cacheKey);
    
    if (!cached) {
      return null;
    }
    
    // Check if cache entry has expired
    if (Date.now() - cached.timestamp.getTime() > cached.ttl) {
      this.authorizationCache.delete(cacheKey);
      return null;
    }
    
    return cached.result;
  }

  /**
   * Cache authorization result
   */
  private cacheResult(cacheKey: string, result: AuthorizationResult): void {
    this.authorizationCache.set(cacheKey, {
      result,
      timestamp: new Date(),
      ttl: this.cacheTTL
    });
  }
}

/**
 * Authorization decorators for method-level access control
 */
export function RequirePermission(permission: string) {
  return function (
    target: unknown,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      // Extract user context from arguments or this context
      const userContext = this && typeof this === 'object' && 'user' in this 
        ? (this as { user: UserContext }).user
        : args.find((arg): arg is UserContext => 
            arg && typeof arg === 'object' && 'id' in arg && 'permissions' in arg
          );

      if (!userContext) {
        throw new Error('User context required for authorization');
      }

      const authService = EnterpriseAuthorizationService.getInstance();
      const hasPermission = authService.hasPermission(userContext, permission);

      if (!hasPermission) {
        throw new Error(`Access denied: ${permission} permission required`);
      }

      return await method.apply(this, args);
    };

    return descriptor;
  };
}

export function RequireRole(role: UserRole) {
  return function (
    target: unknown,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const userContext = this && typeof this === 'object' && 'user' in this 
        ? (this as { user: UserContext }).user
        : args.find((arg): arg is UserContext => 
            arg && typeof arg === 'object' && 'id' in arg && 'roles' in arg
          );

      if (!userContext) {
        throw new Error('User context required for authorization');
      }

      const authService = EnterpriseAuthorizationService.getInstance();
      const hasRole = authService.hasAnyRole(userContext, [role]);

      if (!hasRole) {
        throw new Error(`Access denied: ${role} role required`);
      }

      return await method.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Global authorization service instance
 */
export const authorizationService = EnterpriseAuthorizationService.getInstance();