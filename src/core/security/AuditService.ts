/**
 * Enterprise Audit Logging System
 * Comprehensive audit trail with compliance and security features
 */

import { logger } from '../../config/logger';
import { UserRole } from '../../types/enums-constants';

/**
 * Audit event types
 */
export enum AuditEventType {
  // Authentication events
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  
  // Authorization events
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  ROLE_CHANGE = 'ROLE_CHANGE',
  
  // Data events
  DATA_CREATE = 'DATA_CREATE',
  DATA_READ = 'DATA_READ',
  DATA_UPDATE = 'DATA_UPDATE',
  DATA_DELETE = 'DATA_DELETE',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  
  // System events
  SYSTEM_START = 'SYSTEM_START',
  SYSTEM_STOP = 'SYSTEM_STOP',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  BACKUP_CREATE = 'BACKUP_CREATE',
  BACKUP_RESTORE = 'BACKUP_RESTORE',
  
  // Security events
  SECURITY_BREACH = 'SECURITY_BREACH',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  ENCRYPTION_KEY_CHANGE = 'ENCRYPTION_KEY_CHANGE',
  
  // Compliance events
  GDPR_DATA_REQUEST = 'GDPR_DATA_REQUEST',
  GDPR_DATA_DELETION = 'GDPR_DATA_DELETION',
  COMPLIANCE_REPORT = 'COMPLIANCE_REPORT',
  AUDIT_LOG_ACCESS = 'AUDIT_LOG_ACCESS'
}

/**
 * Audit event severity levels
 */
export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Audit event status
 */
export enum AuditStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  WARNING = 'WARNING',
  ERROR = 'ERROR'
}

/**
 * Audit event interface
 */
export interface AuditEvent {
  readonly id: string;
  readonly timestamp: Date;
  readonly eventType: AuditEventType;
  readonly severity: AuditSeverity;
  readonly status: AuditStatus;
  readonly userId?: string;
  readonly userEmail?: string;
  readonly userRole?: UserRole;
  readonly sessionId?: string;
  readonly organizationId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly resource?: string;
  readonly resourceId?: string;
  readonly action?: string;
  readonly description: string;
  readonly details?: Record<string, unknown>;
  readonly oldValues?: Record<string, unknown>;
  readonly newValues?: Record<string, unknown>;
  readonly requestId?: string;
  readonly correlationId?: string;
  readonly risk: AuditRiskLevel;
  readonly tags: readonly string[];
  readonly metadata: Record<string, unknown>;
}

/**
 * Risk level assessment
 */
export enum AuditRiskLevel {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Audit context for automatic data collection
 */
export interface AuditContext {
  readonly userId?: string;
  readonly userEmail?: string;
  readonly userRole?: UserRole;
  readonly sessionId?: string;
  readonly organizationId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly requestId?: string;
  readonly correlationId?: string;
}

/**
 * Audit log retention policy
 */
export interface AuditRetentionPolicy {
  readonly eventType: AuditEventType;
  readonly retentionDays: number;
  readonly archiveAfterDays: number;
  readonly compressionEnabled: boolean;
  readonly encryptionRequired: boolean;
}

/**
 * Audit log query interface
 */
export interface AuditLogQuery {
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly eventTypes?: AuditEventType[];
  readonly severity?: AuditSeverity[];
  readonly status?: AuditStatus[];
  readonly userId?: string;
  readonly organizationId?: string;
  readonly resource?: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly sortBy?: 'timestamp' | 'severity' | 'eventType';
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Audit log search result
 */
export interface AuditLogResult {
  readonly events: readonly AuditEvent[];
  readonly totalCount: number;
  readonly page: number;
  readonly pageSize: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
}

/**
 * Audit storage interface
 */
export interface IAuditStorage {
  store(event: AuditEvent): Promise<boolean>;
  query(query: AuditLogQuery): Promise<AuditLogResult>;
  archive(beforeDate: Date): Promise<number>;
  delete(beforeDate: Date): Promise<number>;
}

/**
 * Enterprise audit service implementation
 */
export class EnterpriseAuditService {
  private static instance: EnterpriseAuditService;
  private readonly storage: IAuditStorage;
  private readonly retentionPolicies: Map<AuditEventType, AuditRetentionPolicy>;
  private currentContext: AuditContext = {};

  private constructor(storage: IAuditStorage) {
    this.storage = storage;
    this.retentionPolicies = new Map();
    this.initializeDefaultPolicies();
  }

  static getInstance(storage?: IAuditStorage): EnterpriseAuditService {
    if (!EnterpriseAuditService.instance) {
      if (!storage) {
        throw new Error('Storage must be provided for first initialization');
      }
      EnterpriseAuditService.instance = new EnterpriseAuditService(storage);
    }
    return EnterpriseAuditService.instance;
  }

  /**
   * Set audit context for automatic data collection
   */
  setContext(context: AuditContext): void {
    this.currentContext = { ...context };
  }

  /**
   * Clear audit context
   */
  clearContext(): void {
    this.currentContext = {};
  }

  /**
   * Log audit event
   */
  async logEvent(
    eventType: AuditEventType,
    description: string,
    options: Partial<Pick<AuditEvent, 
      'severity' | 'status' | 'resource' | 'resourceId' | 'action' | 'details' | 
      'oldValues' | 'newValues' | 'tags' | 'metadata'
    >> = {}
  ): Promise<boolean> {
    try {
      const auditEvent: AuditEvent = {
        id: this.generateEventId(),
        timestamp: new Date(),
        eventType,
        severity: options.severity ?? this.inferSeverity(eventType),
        status: options.status ?? AuditStatus.SUCCESS,
        description,
        risk: this.assessRisk(eventType, options.details),
        tags: options.tags ?? [],
        metadata: options.metadata ?? {},
        
        // Context information
        ...this.currentContext,
        
        // Optional fields
        resource: options.resource,
        resourceId: options.resourceId,
        action: options.action,
        details: options.details,
        oldValues: options.oldValues,
        newValues: options.newValues,
      };

      const success = await this.storage.store(auditEvent);
      
      if (success) {
        logger.debug('Audit event logged', { 
          eventId: auditEvent.id,
          eventType: auditEvent.eventType,
          severity: auditEvent.severity 
        });
        
        // Alert on critical events
        if (auditEvent.severity === AuditSeverity.CRITICAL || 
            auditEvent.risk === AuditRiskLevel.CRITICAL) {
          await this.handleCriticalEvent(auditEvent);
        }
      } else {
        logger.error('Failed to store audit event', { eventType, description });
      }

      return success;
    } catch (error) {
      logger.error('Audit logging error', { eventType, description, error });
      return false;
    }
  }

  /**
   * Log authentication events
   */
  async logLogin(userId: string, userEmail: string, success: boolean, ipAddress?: string): Promise<void> {
    await this.logEvent(
      success ? AuditEventType.LOGIN : AuditEventType.LOGIN_FAILED,
      `User ${success ? 'logged in' : 'login failed'}: ${userEmail}`,
      {
        severity: success ? AuditSeverity.LOW : AuditSeverity.MEDIUM,
        status: success ? AuditStatus.SUCCESS : AuditStatus.FAILURE,
        details: {
          userId,
          userEmail,
          ipAddress,
          success
        },
        tags: ['authentication']
      }
    );
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
    resource: string,
    resourceId: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>
  ): Promise<void> {
    const eventType = {
      CREATE: AuditEventType.DATA_CREATE,
      READ: AuditEventType.DATA_READ,
      UPDATE: AuditEventType.DATA_UPDATE,
      DELETE: AuditEventType.DATA_DELETE
    }[operation];

    await this.logEvent(
      eventType,
      `${operation} operation on ${resource}`,
      {
        severity: operation === 'DELETE' ? AuditSeverity.HIGH : AuditSeverity.LOW,
        resource,
        resourceId,
        action: operation.toLowerCase(),
        oldValues,
        newValues,
        tags: ['data-access', operation.toLowerCase()]
      }
    );
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    eventType: AuditEventType.SECURITY_BREACH | AuditEventType.SUSPICIOUS_ACTIVITY | AuditEventType.POLICY_VIOLATION,
    description: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.logEvent(eventType, description, {
      severity: AuditSeverity.CRITICAL,
      status: AuditStatus.WARNING,
      details,
      tags: ['security', 'alert']
    });
  }

  /**
   * Log GDPR compliance events
   */
  async logGDPREvent(
    eventType: AuditEventType.GDPR_DATA_REQUEST | AuditEventType.GDPR_DATA_DELETION,
    dataSubjectId: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.logEvent(eventType, `GDPR event for data subject: ${dataSubjectId}`, {
      severity: AuditSeverity.HIGH,
      resourceId: dataSubjectId,
      details,
      tags: ['gdpr', 'compliance']
    });
  }

  /**
   * Query audit logs
   */
  async query(query: AuditLogQuery): Promise<AuditLogResult> {
    try {
      // Log the audit log access
      await this.logEvent(
        AuditEventType.AUDIT_LOG_ACCESS,
        'Audit log queried',
        {
          severity: AuditSeverity.MEDIUM,
          details: { query },
          tags: ['audit-access']
        }
      );

      return await this.storage.query(query);
    } catch (error) {
      logger.error('Audit log query error', { query, error });
      throw error;
    }
  }

  /**
   * Set retention policy for event type
   */
  setRetentionPolicy(eventType: AuditEventType, policy: AuditRetentionPolicy): void {
    this.retentionPolicies.set(eventType, policy);
    logger.info('Audit retention policy set', { eventType, policy });
  }

  /**
   * Archive old audit logs
   */
  async archiveOldLogs(): Promise<number> {
    let totalArchived = 0;

    for (const [eventType, policy] of this.retentionPolicies) {
      const archiveDate = new Date();
      archiveDate.setDate(archiveDate.getDate() - policy.archiveAfterDays);

      try {
        const archivedCount = await this.storage.archive(archiveDate);
        totalArchived += archivedCount;
        
        logger.info('Audit logs archived', { 
          eventType, 
          archivedCount, 
          beforeDate: archiveDate.toISOString() 
        });
      } catch (error) {
        logger.error('Archive error for event type', { eventType, error });
      }
    }

    await this.logEvent(
      AuditEventType.BACKUP_CREATE,
      `Archived ${totalArchived} audit log entries`,
      {
        severity: AuditSeverity.LOW,
        details: { totalArchived },
        tags: ['maintenance', 'archive']
      }
    );

    return totalArchived;
  }

  /**
   * Delete expired audit logs
   */
  async deleteExpiredLogs(): Promise<number> {
    let totalDeleted = 0;

    for (const [eventType, policy] of this.retentionPolicies) {
      const deleteDate = new Date();
      deleteDate.setDate(deleteDate.getDate() - policy.retentionDays);

      try {
        const deletedCount = await this.storage.delete(deleteDate);
        totalDeleted += deletedCount;
        
        logger.info('Expired audit logs deleted', { 
          eventType, 
          deletedCount, 
          beforeDate: deleteDate.toISOString() 
        });
      } catch (error) {
        logger.error('Delete error for event type', { eventType, error });
      }
    }

    await this.logEvent(
      AuditEventType.CONFIGURATION_CHANGE,
      `Deleted ${totalDeleted} expired audit log entries`,
      {
        severity: AuditSeverity.LOW,
        details: { totalDeleted },
        tags: ['maintenance', 'cleanup']
      }
    );

    return totalDeleted;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Infer severity from event type
   */
  private inferSeverity(eventType: AuditEventType): AuditSeverity {
    switch (eventType) {
      case AuditEventType.SECURITY_BREACH:
      case AuditEventType.POLICY_VIOLATION:
      case AuditEventType.ENCRYPTION_KEY_CHANGE:
        return AuditSeverity.CRITICAL;
      
      case AuditEventType.LOGIN_FAILED:
      case AuditEventType.ACCESS_DENIED:
      case AuditEventType.SUSPICIOUS_ACTIVITY:
      case AuditEventType.DATA_DELETE:
      case AuditEventType.GDPR_DATA_DELETION:
        return AuditSeverity.HIGH;
      
      case AuditEventType.PERMISSION_CHANGE:
      case AuditEventType.ROLE_CHANGE:
      case AuditEventType.DATA_UPDATE:
      case AuditEventType.CONFIGURATION_CHANGE:
        return AuditSeverity.MEDIUM;
      
      default:
        return AuditSeverity.LOW;
    }
  }

  /**
   * Assess risk level
   */
  private assessRisk(eventType: AuditEventType, details?: Record<string, unknown>): AuditRiskLevel {
    // Risk assessment logic based on event type and details
    switch (eventType) {
      case AuditEventType.SECURITY_BREACH:
        return AuditRiskLevel.CRITICAL;
      
      case AuditEventType.POLICY_VIOLATION:
      case AuditEventType.SUSPICIOUS_ACTIVITY:
        return AuditRiskLevel.HIGH;
      
      case AuditEventType.LOGIN_FAILED:
        // Assess based on repeated failures
        if (details && typeof details.attemptCount === 'number' && details.attemptCount > 3) {
          return AuditRiskLevel.HIGH;
        }
        return AuditRiskLevel.MEDIUM;
      
      case AuditEventType.ACCESS_DENIED:
        return AuditRiskLevel.MEDIUM;
      
      default:
        return AuditRiskLevel.LOW;
    }
  }

  /**
   * Handle critical events
   */
  private async handleCriticalEvent(event: AuditEvent): Promise<void> {
    logger.error('Critical audit event detected', {
      eventId: event.id,
      eventType: event.eventType,
      description: event.description,
      userId: event.userId,
      organizationId: event.organizationId
    });

    // Additional alerting logic could be implemented here
    // such as sending notifications, triggering security responses, etc.
  }

  /**
   * Initialize default retention policies
   */
  private initializeDefaultPolicies(): void {
    const defaultPolicies: Array<[AuditEventType, AuditRetentionPolicy]> = [
      [AuditEventType.LOGIN, { 
        eventType: AuditEventType.LOGIN, 
        retentionDays: 90, 
        archiveAfterDays: 30, 
        compressionEnabled: true, 
        encryptionRequired: false 
      }],
      [AuditEventType.SECURITY_BREACH, { 
        eventType: AuditEventType.SECURITY_BREACH, 
        retentionDays: 2555, // 7 years
        archiveAfterDays: 365, 
        compressionEnabled: true, 
        encryptionRequired: true 
      }],
      [AuditEventType.GDPR_DATA_DELETION, { 
        eventType: AuditEventType.GDPR_DATA_DELETION, 
        retentionDays: 2555, // 7 years
        archiveAfterDays: 90, 
        compressionEnabled: true, 
        encryptionRequired: true 
      }],
      [AuditEventType.DATA_DELETE, { 
        eventType: AuditEventType.DATA_DELETE, 
        retentionDays: 365, 
        archiveAfterDays: 90, 
        compressionEnabled: true, 
        encryptionRequired: true 
      }]
    ];

    for (const [eventType, policy] of defaultPolicies) {
      this.retentionPolicies.set(eventType, policy);
    }
  }
}

/**
 * Audit decorator for automatic method auditing
 */
export function AuditLog(eventType: AuditEventType, description?: string) {
  return function (
    target: unknown,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;
    const methodName = String(propertyName);

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const auditService = EnterpriseAuditService.getInstance();
      const startTime = Date.now();

      try {
        const result = await method.apply(this, args);
        const executionTime = Date.now() - startTime;

        await auditService.logEvent(
          eventType,
          description || `Method executed: ${methodName}`,
          {
            severity: AuditSeverity.LOW,
            status: AuditStatus.SUCCESS,
            action: methodName,
            details: {
              method: methodName,
              executionTime,
              argumentCount: args.length
            },
            tags: ['method-audit']
          }
        );

        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;

        await auditService.logEvent(
          eventType,
          description || `Method failed: ${methodName}`,
          {
            severity: AuditSeverity.MEDIUM,
            status: AuditStatus.ERROR,
            action: methodName,
            details: {
              method: methodName,
              executionTime,
              error: error instanceof Error ? error.message : 'Unknown error',
              argumentCount: args.length
            },
            tags: ['method-audit', 'error']
          }
        );

        throw error;
      }
    };

    return descriptor;
  };
}