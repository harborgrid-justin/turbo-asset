/**
 * Enterprise-grade audit logging system
 * Provides comprehensive tracking of sensitive operations for compliance
 */

import { getLogger, LogContext, createCorrelationId } from '../config/enterprise-logger';
import { getEnvironmentConfig } from '../config/environment-validation';
import { UserId } from '../types/branded-types';
import { Request, Response, NextFunction } from 'express';

/**
 * Audit event types enumeration
 */
export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  
  // Data events
  RECORD_CREATE = 'RECORD_CREATE',
  RECORD_READ = 'RECORD_READ',
  RECORD_UPDATE = 'RECORD_UPDATE',
  RECORD_DELETE = 'RECORD_DELETE',
  
  // Security events
  ACCESS_DENIED = 'ACCESS_DENIED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  
  // Business events
  ASSET_CREATED = 'ASSET_CREATED',
  WORK_ORDER_COMPLETED = 'WORK_ORDER_COMPLETED'
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
 * Audit event outcome
 */
export enum AuditOutcome {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE'
}

/**
 * Audit event interface
 */
export interface AuditEvent {
  readonly id: string;
  readonly timestamp: string;
  readonly correlationId: string;
  readonly eventType: AuditEventType;
  readonly severity: AuditSeverity;
  readonly outcome: AuditOutcome;
  readonly userId?: UserId;
  readonly ipAddress: string;
  readonly userAgent?: string;
  readonly resourceType: string;
  readonly resourceId?: string;
  readonly action: string;
  readonly description: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Enterprise Audit Logger
 */
export class EnterpriseAuditLogger {
  private readonly logger = getLogger();
  private readonly config = getEnvironmentConfig();
  private readonly eventStore: AuditEvent[] = [];
  private readonly maxEvents = 10000;
  
  /**
   * Log an audit event
   */
  async logEvent(event: Partial<AuditEvent>): Promise<void> {
    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      correlationId: event.correlationId || createCorrelationId(),
      eventType: (event.eventType != null) || AuditEventType.RECORD_READ,
      severity: (event.severity != null) || AuditSeverity.LOW,
      outcome: (event.outcome != null) || AuditOutcome.SUCCESS,
      userId: event.userId,
      ipAddress: event.ipAddress || 'unknown',
      userAgent: event.userAgent,
      resourceType: event.resourceType || 'unknown',
      resourceId: event.resourceId,
      action: event.action || 'unknown',
      description: event.description || '',
      metadata: event.metadata || {}
    };

    this.eventStore.push(auditEvent);
    
    if (this.eventStore.length > this.maxEvents) {
      this.eventStore.shift();
    }

    this.logger.audit('Audit event recorded', {
      correlationId: auditEvent.correlationId,
      eventType: auditEvent.eventType,
      severity: auditEvent.severity,
      userId: auditEvent.userId,
      result: 'success'
    });

    if (auditEvent.severity === AuditSeverity.CRITICAL) {
      this.handleCriticalEvent(auditEvent);
    }
  }

  /**
   * Log authentication event
   */
  async logAuthentication(
    eventType: AuditEventType.LOGIN_SUCCESS | AuditEventType.LOGIN_FAILURE | AuditEventType.LOGOUT,
    userId: UserId | undefined,
    ipAddress: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent({
      eventType,
      severity: eventType === AuditEventType.LOGIN_FAILURE ? AuditSeverity.MEDIUM : AuditSeverity.LOW,
      outcome: eventType === AuditEventType.LOGIN_FAILURE ? AuditOutcome.FAILURE : AuditOutcome.SUCCESS,
      userId,
      ipAddress,
      userAgent,
      resourceType: 'authentication',
      action: eventType.toLowerCase(),
      description: `User ${eventType.toLowerCase()}`
    });
  }

  /**
   * Log data access event
   */
  async logDataAccess(
    eventType: AuditEventType.RECORD_CREATE | AuditEventType.RECORD_READ | 
              AuditEventType.RECORD_UPDATE | AuditEventType.RECORD_DELETE,
    userId: UserId,
    resourceType: string,
    resourceId: string,
    correlationId?: string
  ): Promise<void> {
    const severity = eventType === AuditEventType.RECORD_DELETE ? AuditSeverity.HIGH : AuditSeverity.LOW;
    
    await this.logEvent({
      eventType,
      severity,
      outcome: AuditOutcome.SUCCESS,
      userId,
      resourceType,
      resourceId,
      correlationId,
      action: eventType.toLowerCase().replace('record_', ''),
      description: `${eventType.toLowerCase().replace('record_', '')} ${resourceType}`
    });
  }

  /**
   * Get recent audit events
   */
  getRecentEvents(limit: number = 100): AuditEvent[] {
    return this.eventStore
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle critical audit events
   */
  private handleCriticalEvent(event: AuditEvent): void {
    this.logger.error('Critical audit event detected', {
      correlationId: event.correlationId,
      eventType: event.eventType,
      userId: event.userId
    });
  }
}

/**
 * Audit logging middleware for Express
 */
export function createAuditMiddleware(auditLogger: EnterpriseAuditLogger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const {user} = (req as any);
    
    // Log sensitive operations
    if (req.method !== 'GET' || res.statusCode >= 400) {
      const originalEnd = res.end;
      
      res.end = function(chunk?: any, encoding?: any, cb?: () => void): Response {
        auditLogger.logEvent({
          eventType: AuditEventType.RECORD_READ,
          severity: res.statusCode >= 400 ? AuditSeverity.MEDIUM : AuditSeverity.LOW,
          outcome: res.statusCode < 400 ? AuditOutcome.SUCCESS : AuditOutcome.FAILURE,
          userId: user?.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          resourceType: 'api_endpoint',
          action: req.method.toLowerCase(),
          description: `API ${req.method} request to ${req.path}`,
          metadata: {
            statusCode: res.statusCode,
            path: req.path
          }
        }).catch(error => {
          console.error('Audit logging failed:', error);
        });
        
        return originalEnd.call(this, chunk, encoding, cb);
      };
    }
    
    next();
  };
}

// Singleton instance
let auditLoggerInstance: EnterpriseAuditLogger | null = null;

/**
 * Get singleton audit logger instance
 */
export function getAuditLogger(): EnterpriseAuditLogger {
  if (!auditLoggerInstance) {
    auditLoggerInstance = new EnterpriseAuditLogger();
  }
  return auditLoggerInstance;
}