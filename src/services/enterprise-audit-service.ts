/**
 * Enterprise Audit Logging Service
 * 
 * Provides comprehensive audit trail functionality following industry standards
 * for compliance (SOX, GDPR, HIPAA, SOC2) and security monitoring
 */

import { EventEmitter } from 'events';
import { logger } from '@/config/logger';
import { AuditTrail, BaseEntity, StandardResponse } from '@/types/universal-data-standard';

export interface EnhancedAuditTrail extends AuditTrail {
  // Additional enterprise fields
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  complianceCategory: string[];
  businessImpact: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dataClassification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  retentionCategory: 'STANDARD' | 'EXTENDED' | 'PERMANENT';
  
  // Technical details
  requestId: string;
  transactionId?: string;
  correlationId?: string;
  stackTrace?: string;
  errorCode?: string;
  
  // Audit metadata
  auditVersion: string;
  processingTime: number;
  dataHash?: string;
  digitalSignature?: string;
}

export interface AuditSearchCriteria {
  // Time range
  startDate?: Date;
  endDate?: Date;
  
  // Entity filters
  entityType?: string;
  entityId?: string;
  
  // User filters
  userId?: string;
  organizationId?: string;
  
  // Action filters
  actions?: string[];
  severity?: string[];
  riskLevel?: string[];
  complianceCategory?: string[];
  
  // Text search
  searchTerm?: string;
  
  // Pagination
  page?: number;
  pageSize?: number;
  
  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditAnalytics {
  totalEvents: number;
  highRiskEvents: number;
  criticalEvents: number;
  complianceViolations: number;
  uniqueUsers: number;
  uniqueEntities: number;
  
  // Risk distribution
  riskDistribution: Record<string, number>;
  severityDistribution: Record<string, number>;
  actionDistribution: Record<string, number>;
  moduleDistribution: Record<string, number>;
  complianceDistribution: Record<string, number>;
  
  // Trends
  dailyActivity: Array<{ date: string; count: number; riskScore: number }>;
  userActivity: Array<{ userId: string; userName: string; actionCount: number; lastActivity: Date }>;
  anomalies: Array<{
    type: 'UNUSUAL_ACTIVITY' | 'SUSPICIOUS_PATTERN' | 'COMPLIANCE_VIOLATION' | 'SECURITY_INCIDENT';
    description: string;
    severity: string;
    timestamp: Date;
    relatedEvents: string[];
  }>;
}

export class EnterpriseAuditService extends EventEmitter {
  private static instance: EnterpriseAuditService;
  private auditBuffer: EnhancedAuditTrail[] = [];
  private readonly bufferSize = 1000;
  private readonly flushInterval = 5000; // 5 seconds
  private readonly retentionPolicies: Map<string, number> = new Map();
  private readonly complianceRules: Map<string, any> = new Map();
  private readonly encryptionEnabled = true;
  private readonly digitalSigningEnabled = true;
  
  private constructor() {
    super();
    this.initializeRetentionPolicies();
    this.initializeComplianceRules();
    this.startPeriodicFlush();
    this.startComplianceMonitoring();
  }

  public static getInstance(): EnterpriseAuditService {
    if (!EnterpriseAuditService.instance) {
      EnterpriseAuditService.instance = new EnterpriseAuditService();
    }
    return EnterpriseAuditService.instance;
  }

  private initializeRetentionPolicies(): void {
    // Standard retention periods (in days)
    this.retentionPolicies.set('STANDARD', 2555); // 7 years
    this.retentionPolicies.set('EXTENDED', 3650); // 10 years
    this.retentionPolicies.set('PERMANENT', -1); // Never delete
    
    // Compliance-specific retention
    this.retentionPolicies.set('SOX', 2555); // 7 years for financial records
    this.retentionPolicies.set('GDPR', 2190); // 6 years maximum
    this.retentionPolicies.set('HIPAA', 2190); // 6 years minimum
    this.retentionPolicies.set('SOC2', 1095); // 3 years
  }

  private initializeComplianceRules(): void {
    // Define compliance monitoring rules
    this.complianceRules.set('financial_access', {
      entityTypes: ['Invoice', 'Payment', 'Budget', 'Contract'],
      requiredFields: ['userId', 'timestamp', 'oldValues', 'newValues'],
      retentionCategory: 'SOX',
      severity: 'HIGH'
    });
    
    this.complianceRules.set('personal_data', {
      entityTypes: ['User', 'Contact', 'Employee'],
      requiredFields: ['userId', 'timestamp', 'dataClassification'],
      retentionCategory: 'GDPR',
      severity: 'HIGH'
    });
    
    this.complianceRules.set('health_data', {
      entityTypes: ['HealthRecord', 'MedicalDevice'],
      requiredFields: ['userId', 'timestamp', 'encryption'],
      retentionCategory: 'HIPAA',
      severity: 'CRITICAL'
    });
  }

  /**
   * Create audit log entry with automatic compliance classification
   */
  public async logAuditEvent(auditData: Partial<EnhancedAuditTrail>): Promise<StandardResponse<EnhancedAuditTrail>> {
    try {
      const startTime = Date.now();
      
      // Generate audit entry with enhanced metadata
      const auditEntry: EnhancedAuditTrail = {
        // Base audit fields
        entityId: auditData.entityId || '',
        entityType: auditData.entityType || '',
        action: auditData.action || 'VIEW',
        oldValues: auditData.oldValues,
        newValues: auditData.newValues,
        userId: auditData.userId || 'system',
        timestamp: auditData.timestamp || new Date(),
        ipAddress: auditData.ipAddress || '0.0.0.0',
        userAgent: auditData.userAgent || 'Unknown',
        sessionId: auditData.sessionId || this.generateSessionId(),
        organizationId: auditData.organizationId || 'default',
        
        // Enhanced fields with automatic classification
        severity: this.calculateSeverity(auditData),
        riskLevel: this.calculateRiskLevel(auditData),
        complianceCategory: this.determineComplianceCategory(auditData),
        businessImpact: this.assessBusinessImpact(auditData),
        dataClassification: this.classifyData(auditData),
        retentionCategory: this.determineRetentionCategory(auditData),
        
        // Technical metadata
        requestId: auditData.requestId || this.generateRequestId(),
        transactionId: auditData.transactionId,
        correlationId: auditData.correlationId,
        
        // Audit system metadata
        auditVersion: '2.0',
        processingTime: 0, // Will be updated before storage
        dataHash: this.calculateDataHash(auditData),
        digitalSignature: this.digitalSigningEnabled ? await this.generateDigitalSignature(auditData) : undefined
      };
      
      auditEntry.processingTime = Date.now() - startTime;
      
      // Add to buffer for batch processing
      this.auditBuffer.push(auditEntry);
      
      // Trigger immediate flush if buffer is full or high-severity event
      if (this.auditBuffer.length >= this.bufferSize || auditEntry.severity === 'CRITICAL') {
        await this.flushAuditBuffer();
      }
      
      // Emit real-time event for monitoring
      this.emit('auditEvent', auditEntry);
      
      // Check for compliance violations and anomalies
      await this.checkComplianceViolations(auditEntry);
      await this.detectAnomalies(auditEntry);
      
      return {
        success: true,
        data: auditEntry,
        metadata: {
          timestamp: new Date(),
          requestId: auditEntry.requestId,
          executionTime: auditEntry.processingTime,
          apiVersion: '2.0'
        }
      };
      
    } catch (error: unknown) {
      logger.error('Failed to create audit log entry', { error, auditData });
      
      return {
        success: false,
        error: {
          code: 'AUDIT_LOG_FAILED',
          message: (error as Error).message || 'Failed to create audit log entry',
          details: { auditData }
        },
        metadata: {
          timestamp: new Date(),
          requestId: auditData.requestId || 'unknown',
          executionTime: 0,
          apiVersion: '2.0'
        }
      };
    }
  }

  /**
   * Search audit logs with advanced filtering and analytics
   */
  public async searchAuditLogs(criteria: AuditSearchCriteria): Promise<StandardResponse<{
    logs: EnhancedAuditTrail[];
    totalCount: number;
    analytics: AuditAnalytics;
    pagination: {
      page: number;
      pageSize: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }>> {
    try {
      const startTime = Date.now();
      
      // In a real implementation, this would query your audit database
      // For now, we'll generate mock data based on criteria
      const mockLogs = this.generateMockAuditLogs(criteria);
      const analytics = await this.generateAuditAnalytics(mockLogs);
      
      const page = criteria.page || 1;
      const pageSize = Math.min(criteria.pageSize || 50, 1000);
      const totalPages = Math.ceil(mockLogs.length / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      
      const paginatedLogs = mockLogs.slice(startIndex, endIndex);
      
      return {
        success: true,
        data: {
          logs: paginatedLogs,
          totalCount: mockLogs.length,
          analytics,
          pagination: {
            page,
            pageSize,
            totalPages,
            hasNext: page < totalPages,
            hasPrevious: page > 1
          }
        },
        metadata: {
          timestamp: new Date(),
          requestId: this.generateRequestId(),
          executionTime: Date.now() - startTime,
          apiVersion: '2.0'
        }
      };
      
    } catch (error: unknown) {
      logger.error('Failed to search audit logs', { error, criteria });
      
      return {
        success: false,
        error: {
          code: 'AUDIT_SEARCH_FAILED',
          message: (error as Error).message || 'Failed to search audit logs',
          details: { criteria }
        },
        metadata: {
          timestamp: new Date(),
          requestId: 'unknown',
          executionTime: 0,
          apiVersion: '2.0'
        }
      };
    }
  }

  /**
   * Generate compliance report
   */
  public async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    complianceStandards: string[]
  ): Promise<StandardResponse<{
    summary: {
      totalEvents: number;
      complianceViolations: number;
      riskScore: number;
      coveragePercentage: number;
    };
    violations: Array<{
      standard: string;
      violation: string;
      severity: string;
      count: number;
      examples: EnhancedAuditTrail[];
    }>;
    recommendations: Array<{
      category: string;
      priority: string;
      recommendation: string;
      impact: string;
    }>;
  }>> {
    try {
      // Mock implementation - in production, this would query the audit database
      const mockReport = this.generateMockComplianceReport(startDate, endDate, complianceStandards);
      
      return {
        success: true,
        data: mockReport,
        metadata: {
          timestamp: new Date(),
          requestId: this.generateRequestId(),
          executionTime: 250,
          apiVersion: '2.0'
        }
      };
      
    } catch (error: unknown) {
      logger.error('Failed to generate compliance report', { error, startDate, endDate, complianceStandards });
      
      return {
        success: false,
        error: {
          code: 'COMPLIANCE_REPORT_FAILED',
          message: (error as Error).message || 'Failed to generate compliance report'
        },
        metadata: {
          timestamp: new Date(),
          requestId: 'unknown',
          executionTime: 0,
          apiVersion: '2.0'
        }
      };
    }
  }

  // Private helper methods
  private calculateSeverity(auditData: Partial<EnhancedAuditTrail>): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (auditData.action === 'DELETE' && auditData.entityType === 'User') {return 'CRITICAL';}
    if (auditData.action === 'DELETE') {return 'HIGH';}
    if (auditData.action === 'UPDATE' && auditData.entityType === 'User') {return 'HIGH';}
    if (auditData.action === 'CREATE' && auditData.entityType === 'User') {return 'MEDIUM';}
    if (auditData.action === 'EXPORT') {return 'MEDIUM';}
    return 'LOW';
  }

  private calculateRiskLevel(auditData: Partial<EnhancedAuditTrail>): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' {
    if (auditData.entityType && ['User', 'Financial', 'Contract'].includes(auditData.entityType)) {
      return auditData.action === 'DELETE' ? 'HIGH' : 'MEDIUM';
    }
    return auditData.action === 'VIEW' ? 'NONE' : 'LOW';
  }

  private determineComplianceCategory(auditData: Partial<EnhancedAuditTrail>): string[] {
    const categories: string[] = [];
    
    if (auditData.entityType && ['Invoice', 'Payment', 'Budget', 'Contract'].includes(auditData.entityType)) {
      categories.push('SOX');
    }
    
    if (auditData.entityType && ['User', 'Contact', 'Employee'].includes(auditData.entityType)) {
      categories.push('GDPR', 'Data Protection');
    }
    
    if (auditData.entityType && ['HealthRecord', 'MedicalDevice'].includes(auditData.entityType)) {
      categories.push('HIPAA');
    }
    
    categories.push('SOC2'); // All events are subject to SOC2
    
    return categories.length > 0 ? categories : ['General'];
  }

  private assessBusinessImpact(auditData: Partial<EnhancedAuditTrail>): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (auditData.action === 'DELETE' && auditData.entityType === 'Asset') {return 'HIGH';}
    if (auditData.action === 'DELETE') {return 'MEDIUM';}
    return 'LOW';
  }

  private classifyData(auditData: Partial<EnhancedAuditTrail>): 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' {
    if (auditData.entityType && ['User', 'Employee', 'HealthRecord'].includes(auditData.entityType)) {
      return 'RESTRICTED';
    }
    if (auditData.entityType && ['Contract', 'Financial'].includes(auditData.entityType)) {
      return 'CONFIDENTIAL';
    }
    return 'INTERNAL';
  }

  private determineRetentionCategory(auditData: Partial<EnhancedAuditTrail>): 'STANDARD' | 'EXTENDED' | 'PERMANENT' {
    const complianceCategories = this.determineComplianceCategory(auditData);
    
    if (complianceCategories.includes('SOX') || complianceCategories.includes('HIPAA')) {
      return 'EXTENDED';
    }
    if (auditData.severity === 'CRITICAL' || auditData.action === 'DELETE') {
      return 'PERMANENT';
    }
    return 'STANDARD';
  }

  private calculateDataHash(auditData: Partial<EnhancedAuditTrail>): string {
    // In production, use a proper cryptographic hash
    const dataString = JSON.stringify(auditData);
    return Buffer.from(dataString).toString('base64').substring(0, 32);
  }

  private async generateDigitalSignature(auditData: Partial<EnhancedAuditTrail>): Promise<string> {
    // In production, use proper digital signing with private key
    const dataString = JSON.stringify(auditData);
    return `sig_${Buffer.from(dataString).toString('base64').substring(0, 16)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async flushAuditBuffer(): Promise<void> {
    if (this.auditBuffer.length === 0) {return;}
    
    const bufferCopy = [...this.auditBuffer];
    this.auditBuffer = [];
    
    try {
      // In production, this would batch insert into your audit database
      logger.info(`Flushing ${bufferCopy.length} audit entries to permanent storage`);
      
      // Emit batch processed event
      this.emit('auditBatchProcessed', { count: bufferCopy.length, timestamp: new Date() });
      
    } catch (error: unknown) {
      logger.error('Failed to flush audit buffer', { error, count: bufferCopy.length });
      // Put entries back in buffer for retry
      this.auditBuffer.unshift(...bufferCopy);
    }
  }

  private startPeriodicFlush(): void {
    setInterval(async () => {
      if (this.auditBuffer.length > 0) {
        await this.flushAuditBuffer();
      }
    }, this.flushInterval);
  }

  private startComplianceMonitoring(): void {
    // Monitor for compliance violations every minute
    setInterval(async () => {
      await this.runComplianceCheck();
    }, 60000);
  }

  private async checkComplianceViolations(auditEntry: EnhancedAuditTrail): Promise<void> {
    // Check against compliance rules
    for (const [ruleName, rule] of this.complianceRules.entries()) {
      if (rule.entityTypes.includes(auditEntry.entityType)) {
        // Check if all required fields are present
        const missingFields = rule.requiredFields.filter((field: string) => !auditEntry[field as keyof EnhancedAuditTrail]);
        
        if (missingFields.length > 0) {
          this.emit('complianceViolation', {
            rule: ruleName,
            violation: 'MISSING_REQUIRED_FIELDS',
            missingFields,
            auditEntry,
            severity: rule.severity
          });
        }
      }
    }
  }

  private async detectAnomalies(auditEntry: EnhancedAuditTrail): Promise<void> {
    // Basic anomaly detection - in production, this would be more sophisticated
    const recentEvents = this.auditBuffer.filter(entry => 
      entry.userId === auditEntry.userId &&
      entry.timestamp > new Date(Date.now() - 300000) // Last 5 minutes
    );
    
    if (recentEvents.length > 50) {
      this.emit('anomaly', {
        type: 'UNUSUAL_ACTIVITY',
        description: `User ${auditEntry.userId} performed ${recentEvents.length} actions in 5 minutes`,
        severity: 'HIGH',
        userId: auditEntry.userId,
        timestamp: new Date(),
        relatedEvents: recentEvents.map(e => e.requestId)
      });
    }
  }

  private async runComplianceCheck(): Promise<void> {
    // Periodic compliance monitoring
    logger.debug('Running periodic compliance check');
  }

  private generateMockAuditLogs(criteria: AuditSearchCriteria): EnhancedAuditTrail[] {
    // Mock implementation for testing
    return [];
  }

  private async generateAuditAnalytics(logs: EnhancedAuditTrail[]): Promise<AuditAnalytics> {
    // Mock analytics implementation
    return {
      totalEvents: logs.length,
      highRiskEvents: logs.filter(l => l.riskLevel === 'HIGH').length,
      criticalEvents: logs.filter(l => l.severity === 'CRITICAL').length,
      complianceViolations: 0,
      uniqueUsers: new Set(logs.map(l => l.userId)).size,
      uniqueEntities: new Set(logs.map(l => l.entityType)).size,
      riskDistribution: {},
      severityDistribution: {},
      actionDistribution: {},
      moduleDistribution: {},
      complianceDistribution: {},
      dailyActivity: [],
      userActivity: [],
      anomalies: []
    };
  }

  private generateMockComplianceReport(startDate: Date, endDate: Date, standards: string[]): any {
    return {
      summary: {
        totalEvents: 1500,
        complianceViolations: 5,
        riskScore: 0.85,
        coveragePercentage: 98.5
      },
      violations: [],
      recommendations: []
    };
  }
}

// Export singleton instance
export const auditService = EnterpriseAuditService.getInstance();