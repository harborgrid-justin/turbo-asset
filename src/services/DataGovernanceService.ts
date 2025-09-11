import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { EventEmitter } from 'events';

export interface DataLineage {
  entityId: string;
  entityType: string;
  source: {
    system: string;
    table?: string;
    field?: string;
    lastUpdated: Date;
  };
  transformations: Array<{
    step: number;
    type: 'EXTRACT' | 'TRANSFORM' | 'LOAD' | 'VALIDATE' | 'ENRICH';
    description: string;
    timestamp: Date;
    system: string;
  }>;
  downstream: Array<{
    entityId: string;
    entityType: string;
    system: string;
    relationship: 'DIRECT' | 'DERIVED' | 'AGGREGATED';
  }>;
}

export interface DataQualityMetrics {
  completeness: number; // % of non-null values
  accuracy: number; // % of values meeting validation rules
  consistency: number; // % of values consistent across systems
  validity: number; // % of values in correct format
  uniqueness: number; // % of unique values where expected
  timeliness: number; // % of values updated within SLA
  overall: number; // Overall quality score
}

export interface DataClassification {
  level: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  categories: string[]; // PII, PHI, Financial, etc.
  retentionPeriod: number; // in days
  accessControls: Array<{
    role: string;
    permissions: string[];
  }>;
  encryptionRequired: boolean;
  auditRequired: boolean;
}

export interface DataSteward {
  userId: string;
  name: string;
  email: string;
  department: string;
  responsibilities: string[];
  domains: string[];
}

export interface PolicyViolation {
  id: string;
  policyId: string;
  policyName: string;
  entityId: string;
  entityType: string;
  violationType: 'ACCESS' | 'RETENTION' | 'QUALITY' | 'PRIVACY' | 'SECURITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detectedAt: Date;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'ACCEPTED';
  assignedTo?: string;
  resolvedAt?: Date;
  resolution?: string;
}

export interface MasterDataManagement {
  entityType: string;
  goldenRecord: any;
  sourceRecords: Array<{
    system: string;
    recordId: string;
    data: any;
    confidence: number;
    lastUpdated: Date;
  }>;
  matchingRules: Array<{
    field: string;
    weight: number;
    threshold: number;
    algorithm: 'EXACT' | 'FUZZY' | 'PHONETIC' | 'SEMANTIC';
  }>;
  qualityScore: number;
  lastUpdated: Date;
}

export class DataGovernanceService extends EventEmitter {
  private dataLineageCache: Map<string, DataLineage> = new Map();
  private qualityMetricsCache: Map<string, DataQualityMetrics> = new Map();
  private policiesCache: Map<string, any> = new Map();

  constructor() {
    super();
    this.setupEventHandlers();
    this.loadPolicies();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('policy:violated', this.handlePolicyViolation.bind(this));
    this.on('quality:degraded', this.handleQualityDegradation.bind(this));
    this.on('access:unauthorized', this.handleUnauthorizedAccess.bind(this));
    this.on('retention:expired', this.handleRetentionExpiry.bind(this));
  }

  /**
   * Create data governance rule
   */
  async createGovernanceRule(
    organizationId: string,
    name: string,
    description: string,
    ruleType: string,
    targetTable: string,
    targetField: string,
    ruleDefinition: any,
    severity: string = 'MEDIUM'
  ): Promise<any> {
    try {
      const rule = await prisma.dataGovernanceRule.create({
        data: {
          name,
          description,
          ruleType,
          targetTable,
          targetField,
          ruleDefinition,
          severity,
          organizationId,
        },
      });

      logger.info('Data governance rule created', {
        ruleId: rule.id,
        name,
        ruleType,
        targetTable,
      });

      return rule;
    } catch (error: unknown) {
      logger.error('Failed to create governance rule', { name, error });
      throw error;
    }
  }

  /**
   * Create master data record
   */
  async createMasterDataRecord(
    organizationId: string,
    entityType: string,
    entityId: string,
    masterSystemId: string,
    qualityScore: number = 0.0,
    governanceLevel: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'ENTERPRISE' = 'BASIC'
  ): Promise<any> {
    try {
      const record = await prisma.masterDataRecord.create({
        data: {
          entityType,
          entityId,
          masterSystemId,
          qualityScore,
          governanceLevel,
          organizationId,
        },
      });

      logger.info('Master data record created', {
        recordId: record.id,
        entityType,
        entityId,
        masterSystemId,
      });

      return record;
    } catch (error: unknown) {
      logger.error('Failed to create master data record', { entityType, entityId, error });
      throw error;
    }
  }

  /**
   * Track data lineage
   */
  async trackDataLineage(
    entityId: string,
    entityType: string,
    source: any,
    transformations: any[],
    downstream: any[] = []
  ): Promise<DataLineage> {
    try {
      const lineage: DataLineage = {
        entityId,
        entityType,
        source,
        transformations,
        downstream,
      };

      this.dataLineageCache.set(`${entityType}:${entityId}`, lineage);

      // Store in database
      await this.storeDataLineage(lineage);

      logger.info('Data lineage tracked', {
        entityId,
        entityType,
        transformationCount: transformations.length,
        downstreamCount: downstream.length,
      });

      return lineage;
    } catch (error: unknown) {
      logger.error('Data lineage tracking failed', { entityId, entityType, error });
      throw error;
    }
  }

  /**
   * Calculate data quality metrics
   */
  async calculateDataQualityMetrics(
    organizationId: string,
    entityType: string,
    entityId?: string
  ): Promise<DataQualityMetrics> {
    try {
      const cacheKey = entityId ? `${entityType}:${entityId}` : entityType;
      
      if (this.qualityMetricsCache.has(cacheKey)) {
        return this.qualityMetricsCache.get(cacheKey)!;
      }

      // Get data records for analysis
      const records = await this.getDataRecords(organizationId, entityType, entityId);
      
      const metrics: DataQualityMetrics = {
        completeness: this.calculateCompleteness(records),
        accuracy: this.calculateAccuracy(records, entityType),
        consistency: this.calculateConsistency(records),
        validity: this.calculateValidity(records, entityType),
        uniqueness: this.calculateUniqueness(records),
        timeliness: this.calculateTimeliness(records),
        overall: 0,
      };

      // Calculate overall score (weighted average)
      metrics.overall = (
        metrics.completeness * 0.2 +
        metrics.accuracy * 0.25 +
        metrics.consistency * 0.15 +
        metrics.validity * 0.15 +
        metrics.uniqueness * 0.1 +
        metrics.timeliness * 0.15
      );

      this.qualityMetricsCache.set(cacheKey, metrics);

      logger.info('Data quality metrics calculated', {
        entityType,
        entityId,
        overall: metrics.overall,
      });

      return metrics;
    } catch (error: unknown) {
      logger.error('Data quality calculation failed', { entityType, entityId, error });
      throw error;
    }
  }

  /**
   * Classify data based on sensitivity and compliance requirements
   */
  async classifyData(
    organizationId: string,
    entityType: string,
    entityId: string,
    classification: DataClassification
  ): Promise<void> {
    try {
      await this.storeDataClassification(organizationId, entityType, entityId, classification);

      // Apply access controls based on classification
      await this.applyAccessControls(entityType, entityId, classification);

      // Set retention policies
      await this.setRetentionPolicy(entityType, entityId, classification.retentionPeriod);

      logger.info('Data classified', {
        entityType,
        entityId,
        level: classification.level,
        categories: classification.categories,
      });
    } catch (error: unknown) {
      logger.error('Data classification failed', { entityType, entityId, error });
      throw error;
    }
  }

  /**
   * Assign data steward
   */
  async assignDataSteward(
    organizationId: string,
    steward: DataSteward,
    domains: string[]
  ): Promise<void> {
    try {
      await this.storeDataSteward(organizationId, steward, domains);

      // Set up monitoring for assigned domains
      await this.setupStewardMonitoring(steward.userId, domains);

      logger.info('Data steward assigned', {
        userId: steward.userId,
        name: steward.name,
        domains: domains.length,
      });
    } catch (error: unknown) {
      logger.error('Data steward assignment failed', { steward, error });
      throw error;
    }
  }

  /**
   * Detect policy violations
   */
  async detectPolicyViolations(organizationId: string): Promise<PolicyViolation[]> {
    try {
      const violations: PolicyViolation[] = [];
      const policies = await this.getPolicies(organizationId);

      for (const policy of policies) {
        const policyViolations = await this.checkPolicyCompliance(policy);
        violations.push(...policyViolations);
      }

      // Store violations in database
      for (const violation of violations) {
        await this.storeViolation(violation);
        this.emit('policy:violated', violation);
      }

      logger.info('Policy violations detected', {
        organizationId,
        violationCount: violations.length,
      });

      return violations;
    } catch (error: unknown) {
      logger.error('Policy violation detection failed', { organizationId, error });
      throw error;
    }
  }

  /**
   * Manage master data with deduplication and golden record creation
   */
  async manageMasterData(
    organizationId: string,
    entityType: string,
    sourceRecords: any[],
    matchingRules: any[]
  ): Promise<MasterDataManagement> {
    try {
      // Group similar records using matching rules
      const recordGroups = this.groupSimilarRecords(sourceRecords, matchingRules);

      const masterDataManagement: MasterDataManagement = {
        entityType,
        goldenRecord: {},
        sourceRecords: [],
        matchingRules,
        qualityScore: 0,
        lastUpdated: new Date(),
      };

      for (const group of recordGroups) {
        // Create golden record from group
        const goldenRecord = this.createGoldenRecord(group, matchingRules);
        
        // Calculate quality score
        const qualityScore = this.calculateRecordQualityScore(group);

        // Store master data record
        const masterRecord = await prisma.masterDataRecord.create({
          data: {
            entityType,
            entityId: goldenRecord.id,
            masterSystemId: 'master_data_system',
            qualityScore,
            qualityStatus: this.getQualityStatus(qualityScore),
            organizationId,
          },
        });

        masterDataManagement.sourceRecords.push(...group);
        masterDataManagement.goldenRecord = goldenRecord;
        masterDataManagement.qualityScore = qualityScore;

        logger.info('Master data managed', {
          masterRecordId: masterRecord.id,
          entityType,
          qualityScore,
          sourceRecordCount: group.length,
        });
      }

      return masterDataManagement;
    } catch (error: unknown) {
      logger.error('Master data management failed', { entityType, error });
      throw error;
    }
  }

  /**
   * Get data lineage for entity
   */
  async getDataLineage(entityType: string, entityId: string): Promise<DataLineage | null> {
    const cacheKey = `${entityType}:${entityId}`;
    
    if (this.dataLineageCache.has(cacheKey)) {
      return this.dataLineageCache.get(cacheKey)!;
    }

    // Load from database
    return this.loadDataLineage(entityType, entityId);
  }

  /**
   * Audit data access
   */
  async auditDataAccess(
    userId: string,
    entityType: string,
    entityId: string,
    action: 'READ' | 'WRITE' | 'DELETE',
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    try {
      const classification = await this.getDataClassification(entityType, entityId);
      
      if (classification?.auditRequired) {
        await this.logDataAccess({
          userId,
          entityType,
          entityId,
          action,
          ipAddress,
          userAgent,
          timestamp: new Date(),
          classification: classification.level,
        });
      }

      // Check if access is authorized
      const isAuthorized = await this.checkDataAccess(userId, entityType, entityId, action);
      
      if (!isAuthorized) {
        this.emit('access:unauthorized', {
          userId,
          entityType,
          entityId,
          action,
          ipAddress,
        });
      }

      logger.debug('Data access audited', {
        userId,
        entityType,
        entityId,
        action,
        authorized: isAuthorized,
      });
    } catch (error: unknown) {
      logger.error('Data access auditing failed', {
        userId,
        entityType,
        entityId,
        error,
      });
    }
  }

  /**
   * Monitor data retention policies
   */
  async monitorRetentionPolicies(organizationId: string): Promise<void> {
    try {
      const expiredData = await this.findExpiredData(organizationId);

      for (const item of expiredData) {
        this.emit('retention:expired', {
          entityType: item.entityType,
          entityId: item.entityId,
          expiredAt: item.expiredAt,
          retentionPeriod: item.retentionPeriod,
        });

        logger.info('Data retention expired', {
          entityType: item.entityType,
          entityId: item.entityId,
          expiredAt: item.expiredAt,
        });
      }
    } catch (error: unknown) {
      logger.error('Retention policy monitoring failed', { organizationId, error });
    }
  }

  /**
   * Generate governance report
   */
  async generateGovernanceReport(
    organizationId: string,
    reportType: 'COMPLIANCE' | 'QUALITY' | 'LINEAGE' | 'STEWARDSHIP' | 'VIOLATIONS'
  ): Promise<any> {
    try {
      const report: any = {
        organizationId,
        reportType,
        generatedAt: new Date(),
        data: {},
      };

      switch (reportType) {
        case 'COMPLIANCE':
          report.data = await this.generateComplianceReport(organizationId);
          break;
        case 'QUALITY':
          report.data = await this.generateQualityReport(organizationId);
          break;
        case 'LINEAGE':
          report.data = await this.generateLineageReport(organizationId);
          break;
        case 'STEWARDSHIP':
          report.data = await this.generateStewardshipReport(organizationId);
          break;
        case 'VIOLATIONS':
          report.data = await this.generateViolationsReport(organizationId);
          break;
      }

      logger.info('Governance report generated', {
        organizationId,
        reportType,
      });

      return report;
    } catch (error: unknown) {
      logger.error('Governance report generation failed', { organizationId, reportType, error });
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private calculateCompleteness(records: any[]): number {
    if (!records.length) {return 0;}

    const totalFields = records.length * Object.keys(records[0]).length;
    const nonNullFields = records.reduce((count, record) => {
      return count + Object.values(record).filter(value => value != null).length;
    }, 0);

    return (nonNullFields / totalFields) * 100;
  }

  private calculateAccuracy(records: any[], entityType: string): number {
    // This would validate against known good data or business rules
    // For now, return a mock accuracy score
    return 85 + Math.random() * 10; // 85-95%
  }

  private calculateConsistency(records: any[]): number {
    // Check consistency across duplicate fields
    // For now, return a mock consistency score
    return 80 + Math.random() * 15; // 80-95%
  }

  private calculateValidity(records: any[], entityType: string): number {
    // Validate format and business rules
    // For now, return a mock validity score
    return 90 + Math.random() * 8; // 90-98%
  }

  private calculateUniqueness(records: any[]): number {
    // Check for duplicate records where uniqueness is expected
    // For now, return a mock uniqueness score
    return 95 + Math.random() * 4; // 95-99%
  }

  private calculateTimeliness(records: any[]): number {
    // Check if records are updated within acceptable timeframes
    // For now, return a mock timeliness score
    return 88 + Math.random() * 10; // 88-98%
  }

  private groupSimilarRecords(records: any[], matchingRules: any[]): any[][] {
    // Group similar records based on matching rules
    const groups: any[][] = [];
    const processed = new Set();

    for (let i = 0; i < records.length; i++) {
      if (processed.has(i)) {continue;}

      const group = [records[i]];
      processed.add(i);

      for (let j = i + 1; j < records.length; j++) {
        if (processed.has(j)) {continue;}

        if (this.recordsMatch(records[i], records[j], matchingRules)) {
          group.push(records[j]);
          processed.add(j);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  private recordsMatch(record1: any, record2: any, matchingRules: any[]): boolean {
    let totalScore = 0;
    let maxScore = 0;

    for (const rule of matchingRules) {
      const score = this.calculateFieldSimilarity(
        record1[rule.field],
        record2[rule.field],
        rule.algorithm
      );

      totalScore += score * rule.weight;
      maxScore += rule.weight;
    }

    const similarity = totalScore / maxScore;
    return similarity >= (matchingRules[0]?.threshold || 0.8);
  }

  private calculateFieldSimilarity(value1: any, value2: any, algorithm: string): number {
    if (value1 === value2) {return 1.0;}
    if (!value1 || !value2) {return 0.0;}

    switch (algorithm) {
      case 'EXACT':
        return value1 === value2 ? 1.0 : 0.0;
      case 'FUZZY':
        return this.fuzzyMatch(String(value1), String(value2));
      case 'PHONETIC':
        return this.phoneticMatch(String(value1), String(value2));
      case 'SEMANTIC':
        return this.semanticMatch(String(value1), String(value2));
      default:
        return 0.0;
    }
  }

  private fuzzyMatch(str1: string, str2: string): number {
    // Implement fuzzy string matching (e.g., Levenshtein distance)
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) {return 1.0;}

    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array.from({ length: str2.length + 1 }, (_, i) => i);
    
    for (let i = 0; i < str1.length; i++) {
      const row = [i + 1];
      for (let j = 0; j < str2.length; j++) {
        const cost = str1[i] === str2[j] ? 0 : 1;
        row.push(Math.min(
          row[j] + 1,
          matrix[j + 1] + 1,
          matrix[j] + cost
        ));
      }
      matrix.splice(0, matrix.length, ...row);
    }
    
    return matrix[str2.length];
  }

  private phoneticMatch(str1: string, str2: string): number {
    // Implement phonetic matching (e.g., Soundex, Metaphone)
    // For now, return fuzzy match
    return this.fuzzyMatch(str1, str2);
  }

  private semanticMatch(str1: string, str2: string): number {
    // Implement semantic similarity
    // For now, return fuzzy match
    return this.fuzzyMatch(str1, str2);
  }

  private createGoldenRecord(group: any[], matchingRules: any[]): any {
    // Create the best possible record from the group
    const goldenRecord: any = { id: this.generateId() };

    // For each field, pick the best value from the group
    const allFields = new Set(group.flatMap(record => Object.keys(record)));

    for (const field of allFields) {
      const values = group.map(record => record[field]).filter(v => v != null);
      
      if (values.length > 0) {
        // Choose the most common value, or the first non-null value
        const valueCounts = values.reduce((counts, value) => {
          counts[value] = (counts[value] || 0) + 1;
          return counts;
        }, {} as Record<string, number>);

        const bestValue = Object.entries(valueCounts).reduce((best, [value, count]) => {
          return (count as number) > best.count ? { value, count: count as number } : best;
        }, { value: values[0], count: 0 });

        goldenRecord[field] = bestValue.value;
      }
    }

    return goldenRecord;
  }

  private calculateRecordQualityScore(group: any[]): number {
    // Calculate quality based on completeness, consistency, etc.
    let score = 0;
    let factors = 0;

    // Completeness factor
    const avgCompleteness = group.reduce((sum, record) => {
      const nonNullFields = Object.values(record).filter(v => v != null).length;
      return sum + (nonNullFields / Object.keys(record).length);
    }, 0) / group.length;

    score += avgCompleteness * 40; // 40% weight
    factors++;

    // Consistency factor (more sources = higher confidence)
    const consistencyScore = Math.min(group.length / 3, 1) * 30; // up to 30% for 3+ sources
    score += consistencyScore;

    // Recency factor
    const hasRecentData = group.some(record => 
      record.lastUpdated && new Date(record.lastUpdated) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    score += hasRecentData ? 30 : 10; // 30% if recent, 10% if old

    return Math.min(score, 100);
  }

  private getQualityStatus(qualityScore: number): 'UNKNOWN' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL' {
    if (qualityScore >= 95) {return 'EXCELLENT';}
    if (qualityScore >= 85) {return 'GOOD';}
    if (qualityScore >= 70) {return 'FAIR';}
    if (qualityScore >= 50) {return 'POOR';}
    return 'CRITICAL';
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Database interaction methods (would be implemented with actual DB calls)
  private async getDataRecords(organizationId: string, entityType: string, entityId?: string): Promise<any[]> {
    // Mock implementation
    return Array.from({ length: 100 }, (_, i) => ({
      id: `record_${i}`,
      name: `Record ${i}`,
      value: Math.random() * 1000,
      lastUpdated: new Date(),
    }));
  }

  private async storeDataLineage(lineage: DataLineage): Promise<void> {
    // Store lineage data in database
  }

  private async storeDataClassification(organizationId: string, entityType: string, entityId: string, classification: DataClassification): Promise<void> {
    // Store classification in database
  }

  private async applyAccessControls(entityType: string, entityId: string, classification: DataClassification): Promise<void> {
    // Apply access controls based on classification
  }

  private async setRetentionPolicy(entityType: string, entityId: string, retentionPeriod: number): Promise<void> {
    // Set retention policy
  }

  private async storeDataSteward(organizationId: string, steward: DataSteward, domains: string[]): Promise<void> {
    // Store data steward assignment
  }

  private async setupStewardMonitoring(userId: string, domains: string[]): Promise<void> {
    // Setup monitoring for steward
  }

  private async getPolicies(organizationId: string): Promise<any[]> {
    // Get governance policies
    return [];
  }

  private async checkPolicyCompliance(policy: any): Promise<PolicyViolation[]> {
    // Check policy compliance
    return [];
  }

  private async storeViolation(violation: PolicyViolation): Promise<void> {
    // Store violation in database
  }

  private async loadDataLineage(entityType: string, entityId: string): Promise<DataLineage | null> {
    // Load lineage from database
    return null;
  }

  private async getDataClassification(entityType: string, entityId: string): Promise<DataClassification | null> {
    // Get data classification
    return null;
  }

  private async checkDataAccess(userId: string, entityType: string, entityId: string, action: string): Promise<boolean> {
    // Check if user has access
    return true;
  }

  private async logDataAccess(accessLog: any): Promise<void> {
    // Log data access
  }

  private async findExpiredData(organizationId: string): Promise<any[]> {
    // Find data that has exceeded retention period
    return [];
  }

  private async loadPolicies(): Promise<void> {
    // Load governance policies
  }

  // Report generation methods
  private async generateComplianceReport(organizationId: string): Promise<any> {
    return {
      totalEntities: 10000,
      compliantEntities: 9500,
      complianceRate: 95,
      violations: 50,
      criticalViolations: 5,
    };
  }

  private async generateQualityReport(organizationId: string): Promise<any> {
    return {
      overallQuality: 87.5,
      completeness: 92.0,
      accuracy: 89.0,
      consistency: 85.0,
      validity: 90.0,
      uniqueness: 95.0,
      timeliness: 83.0,
    };
  }

  private async generateLineageReport(organizationId: string): Promise<any> {
    return {
      trackedEntities: 5000,
      fullyMapped: 4200,
      partiallyMapped: 600,
      unmapped: 200,
      complexTransformations: 150,
    };
  }

  private async generateStewardshipReport(organizationId: string): Promise<any> {
    return {
      totalStewards: 25,
      activeStewards: 23,
      domainsManaged: 45,
      averageResponseTime: '2.5 hours',
      resolvedIssues: 125,
      pendingIssues: 15,
    };
  }

  private async generateViolationsReport(organizationId: string): Promise<any> {
    return {
      totalViolations: 75,
      openViolations: 45,
      resolvedViolations: 30,
      criticalViolations: 8,
      averageResolutionTime: '3.2 days',
      violationsByType: {
        'ACCESS': 25,
        'RETENTION': 20,
        'QUALITY': 15,
        'PRIVACY': 10,
        'SECURITY': 5,
      },
    };
  }

  // Event handlers
  private async handlePolicyViolation(violation: PolicyViolation): Promise<void> {
    logger.warn('Policy violation detected', violation);
  }

  private async handleQualityDegradation(data: any): Promise<void> {
    logger.warn('Data quality degraded', data);
  }

  private async handleUnauthorizedAccess(data: any): Promise<void> {
    logger.error('Unauthorized data access attempt', data);
  }

  private async handleRetentionExpiry(data: any): Promise<void> {
    logger.info('Data retention expired', data);
  }
}