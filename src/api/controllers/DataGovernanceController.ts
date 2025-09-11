import { Request, Response } from 'express';
import { DataGovernanceService } from '../../services/DataGovernanceService';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';

const dataGovernanceService = new DataGovernanceService();

export class DataGovernanceController {
  /**
   * Get governance rules
   */
  async getGovernanceRules(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { page = 1, limit = 20, ruleType } = req.query;

      const where: any = { organizationId };
      if (ruleType) {
        where.ruleType = ruleType;
      }

      const rules = await prisma.dataGovernanceRule.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      });

      const total = await prisma.dataGovernanceRule.count({ where });

      res.json({
        rules,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      logger.error('Failed to get governance rules', { error });
      res.status(500).json({ error: 'Failed to get governance rules' });
    }
  }

  /**
   * Create governance rule
   */
  async createGovernanceRule(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const {
        name,
        description,
        ruleType,
        targetTable,
        targetField,
        ruleDefinition,
        severity,
      } = req.body;

      const rule = await dataGovernanceService.createGovernanceRule(
        organizationId,
        name,
        description,
        ruleType,
        targetTable,
        targetField,
        ruleDefinition,
        severity
      );

      res.status(201).json(rule);
    } catch (error) {
      logger.error('Failed to create governance rule', { error });
      res.status(500).json({ error: 'Failed to create governance rule' });
    }
  }

  /**
   * Update governance rule
   */
  async updateGovernanceRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const updates = req.body;

      const rule = await prisma.dataGovernanceRule.update({
        where: { id: ruleId },
        data: updates,
      });

      res.json(rule);
    } catch (error) {
      logger.error('Failed to update governance rule', { error });
      res.status(500).json({ error: 'Failed to update governance rule' });
    }
  }

  /**
   * Delete governance rule
   */
  async deleteGovernanceRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;

      await prisma.dataGovernanceRule.delete({
        where: { id: ruleId },
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete governance rule', { error });
      res.status(500).json({ error: 'Failed to delete governance rule' });
    }
  }

  /**
   * Get master data records
   */
  async getMasterDataRecords(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { page = 1, limit = 20, entityType, qualityStatus } = req.query;

      const where: any = { organizationId };
      if (entityType) {
        where.entityType = entityType;
      }
      if (qualityStatus) {
        where.qualityStatus = qualityStatus;
      }

      const records = await prisma.masterDataRecord.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      });

      const total = await prisma.masterDataRecord.count({ where });

      res.json({
        records,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      logger.error('Failed to get master data records', { error });
      res.status(500).json({ error: 'Failed to get master data records' });
    }
  }

  /**
   * Create master data record
   */
  async createMasterDataRecord(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { entityType, entityId, masterSystemId, qualityScore, governanceLevel } = req.body;

      const record = await dataGovernanceService.createMasterDataRecord(
        organizationId,
        entityType,
        entityId,
        masterSystemId,
        qualityScore,
        governanceLevel
      );

      res.status(201).json(record);
    } catch (error) {
      logger.error('Failed to create master data record', { error });
      res.status(500).json({ error: 'Failed to create master data record' });
    }
  }

  /**
   * Track data lineage
   */
  async trackDataLineage(req: Request, res: Response): Promise<void> {
    try {
      const { entityId, entityType, source, transformations, downstream } = req.body;

      const lineage = await dataGovernanceService.trackDataLineage(
        entityId,
        entityType,
        source,
        transformations,
        downstream
      );

      res.json(lineage);
    } catch (error) {
      logger.error('Failed to track data lineage', { error });
      res.status(500).json({ error: 'Failed to track data lineage' });
    }
  }

  /**
   * Get data lineage
   */
  async getDataLineage(req: Request, res: Response): Promise<void> {
    try {
      const { entityType, entityId } = req.params;

      const lineage = await dataGovernanceService.getDataLineage(entityType, entityId);

      if (!lineage) {
        res.status(404).json({ error: 'Data lineage not found' });
        return;
      }

      res.json(lineage);
    } catch (error) {
      logger.error('Failed to get data lineage', { error });
      res.status(500).json({ error: 'Failed to get data lineage' });
    }
  }

  /**
   * Calculate data quality metrics
   */
  async getDataQualityMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { entityType, entityId } = req.query;

      const metrics = await dataGovernanceService.calculateDataQualityMetrics(
        organizationId,
        entityType as string,
        entityId as string
      );

      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get data quality metrics', { error });
      res.status(500).json({ error: 'Failed to get data quality metrics' });
    }
  }

  /**
   * Classify data
   */
  async classifyData(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { entityType, entityId, classification } = req.body;

      await dataGovernanceService.classifyData(
        organizationId,
        entityType,
        entityId,
        classification
      );

      res.json({ message: 'Data classified successfully' });
    } catch (error) {
      logger.error('Failed to classify data', { error });
      res.status(500).json({ error: 'Failed to classify data' });
    }
  }

  /**
   * Assign data steward
   */
  async assignDataSteward(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { steward, domains } = req.body;

      await dataGovernanceService.assignDataSteward(organizationId, steward, domains);

      res.json({ message: 'Data steward assigned successfully' });
    } catch (error) {
      logger.error('Failed to assign data steward', { error });
      res.status(500).json({ error: 'Failed to assign data steward' });
    }
  }

  /**
   * Detect policy violations
   */
  async detectPolicyViolations(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      const violations = await dataGovernanceService.detectPolicyViolations(organizationId);

      res.json(violations);
    } catch (error) {
      logger.error('Failed to detect policy violations', { error });
      res.status(500).json({ error: 'Failed to detect policy violations' });
    }
  }

  /**
   * Manage master data
   */
  async manageMasterData(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { entityType, sourceRecords, matchingRules } = req.body;

      const management = await dataGovernanceService.manageMasterData(
        organizationId,
        entityType,
        sourceRecords,
        matchingRules
      );

      res.json(management);
    } catch (error) {
      logger.error('Failed to manage master data', { error });
      res.status(500).json({ error: 'Failed to manage master data' });
    }
  }

  /**
   * Audit data access
   */
  async auditDataAccess(req: Request, res: Response): Promise<void> {
    try {
      const { userId, entityType, entityId, action } = req.body;
      const ipAddress = req.ip || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      await dataGovernanceService.auditDataAccess(
        userId,
        entityType,
        entityId,
        action,
        ipAddress,
        userAgent
      );

      res.json({ message: 'Data access audited successfully' });
    } catch (error) {
      logger.error('Failed to audit data access', { error });
      res.status(500).json({ error: 'Failed to audit data access' });
    }
  }

  /**
   * Monitor retention policies
   */
  async monitorRetentionPolicies(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      await dataGovernanceService.monitorRetentionPolicies(organizationId);

      res.json({ message: 'Retention policies monitored successfully' });
    } catch (error) {
      logger.error('Failed to monitor retention policies', { error });
      res.status(500).json({ error: 'Failed to monitor retention policies' });
    }
  }

  /**
   * Generate governance report
   */
  async generateGovernanceReport(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { reportType } = req.query;

      const report = await dataGovernanceService.generateGovernanceReport(
        organizationId,
        reportType as 'COMPLIANCE' | 'QUALITY' | 'LINEAGE' | 'STEWARDSHIP' | 'VIOLATIONS'
      );

      res.json(report);
    } catch (error) {
      logger.error('Failed to generate governance report', { error });
      res.status(500).json({ error: 'Failed to generate governance report' });
    }
  }

  /**
   * Get governance analytics
   */
  async getGovernanceAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      const rules = await prisma.dataGovernanceRule.findMany({
        where: { organizationId },
      });

      const masterDataRecords = await prisma.masterDataRecord.findMany({
        where: { organizationId },
      });

      const analytics = {
        totalRules: rules.length,
        activeRules: rules.filter(r => r.isActive).length,
        rulesByType: rules.reduce((acc, rule) => {
          acc[rule.ruleType] = (acc[rule.ruleType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        rulesBySeverity: rules.reduce((acc, rule) => {
          acc[rule.severity] = (acc[rule.severity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        totalMasterRecords: masterDataRecords.length,
        recordsByType: masterDataRecords.reduce((acc, record) => {
          acc[record.entityType] = (acc[record.entityType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        recordsByQuality: masterDataRecords.reduce((acc, record) => {
          acc[record.qualityStatus] = (acc[record.qualityStatus] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        averageQualityScore: masterDataRecords.length > 0
          ? masterDataRecords.reduce((sum, record) => sum + record.qualityScore, 0) / masterDataRecords.length
          : 0,
        governanceMaturity: {
          level: 'INTERMEDIATE',
          score: 78.5,
          recommendations: [
            'Implement automated data quality monitoring',
            'Expand data stewardship program',
            'Add more granular access controls',
          ],
        },
      };

      res.json(analytics);
    } catch (error) {
      logger.error('Failed to get governance analytics', { error });
      res.status(500).json({ error: 'Failed to get governance analytics' });
    }
  }

  /**
   * Get data stewards
   */
  async getDataStewards(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      // Mock data stewards (would be stored in database)
      const stewards = [
        {
          id: 'steward_1',
          userId: 'user_123',
          name: 'Alice Johnson',
          email: 'alice.johnson@company.com',
          department: 'Data Management',
          responsibilities: ['Data Quality', 'Master Data'],
          domains: ['Customer Data', 'Product Data'],
          assignedAt: new Date('2024-01-15'),
        },
        {
          id: 'steward_2',
          userId: 'user_456',
          name: 'Bob Smith',
          email: 'bob.smith@company.com',
          department: 'IT Operations',
          responsibilities: ['Data Lineage', 'Privacy Compliance'],
          domains: ['Financial Data', 'Employee Data'],
          assignedAt: new Date('2024-02-01'),
        },
      ];

      res.json(stewards);
    } catch (error) {
      logger.error('Failed to get data stewards', { error });
      res.status(500).json({ error: 'Failed to get data stewards' });
    }
  }

  /**
   * Get data catalog
   */
  async getDataCatalog(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { search, category, page = 1, limit = 20 } = req.query;

      // Mock data catalog
      const catalog = [
        {
          id: 'dataset_1',
          name: 'Customer Master Data',
          description: 'Consolidated customer information from multiple sources',
          category: 'Master Data',
          owner: 'Alice Johnson',
          dataSource: 'Customer Data Warehouse',
          schema: {
            fields: [
              { name: 'customer_id', type: 'string', description: 'Unique customer identifier' },
              { name: 'name', type: 'string', description: 'Customer full name' },
              { name: 'email', type: 'string', description: 'Customer email address' },
              { name: 'created_at', type: 'datetime', description: 'Record creation timestamp' },
            ],
          },
          qualityScore: 92.5,
          lastUpdated: new Date('2024-01-15'),
          tags: ['customer', 'master-data', 'pii'],
        },
        {
          id: 'dataset_2',
          name: 'Property Utilization Metrics',
          description: 'Space utilization and occupancy data',
          category: 'Analytics',
          owner: 'Bob Smith',
          dataSource: 'IoT Sensors',
          schema: {
            fields: [
              { name: 'property_id', type: 'string', description: 'Property identifier' },
              { name: 'utilization_rate', type: 'number', description: 'Utilization percentage' },
              { name: 'occupancy_count', type: 'integer', description: 'Number of occupants' },
              { name: 'timestamp', type: 'datetime', description: 'Measurement timestamp' },
            ],
          },
          qualityScore: 88.3,
          lastUpdated: new Date('2024-01-20'),
          tags: ['property', 'utilization', 'iot'],
        },
      ];

      let filteredCatalog = catalog;

      if (search) {
        filteredCatalog = catalog.filter(item =>
          item.name.toLowerCase().includes((search as string).toLowerCase()) ||
          item.description.toLowerCase().includes((search as string).toLowerCase())
        );
      }

      if (category) {
        filteredCatalog = filteredCatalog.filter(item =>
          item.category === category
        );
      }

      const startIndex = (Number(page) - 1) * Number(limit);
      const endIndex = startIndex + Number(limit);
      const paginatedResults = filteredCatalog.slice(startIndex, endIndex);

      res.json({
        datasets: paginatedResults,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: filteredCatalog.length,
          pages: Math.ceil(filteredCatalog.length / Number(limit)),
        },
      });
    } catch (error) {
      logger.error('Failed to get data catalog', { error });
      res.status(500).json({ error: 'Failed to get data catalog' });
    }
  }

  /**
   * Get privacy compliance report
   */
  async getPrivacyComplianceReport(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      // Mock privacy compliance report
      const report = {
        organizationId,
        generatedAt: new Date(),
        complianceFrameworks: ['GDPR', 'CCPA', 'HIPAA'],
        overallScore: 87.2,
        dataInventory: {
          totalDatasets: 156,
          piiDatasets: 42,
          classifiedDatasets: 138,
          unclassifiedDatasets: 18,
        },
        accessControls: {
          totalUsers: 245,
          privilegedUsers: 28,
          accessReviewsCompleted: 92,
          pendingAccessReviews: 8,
        },
        dataRetention: {
          policiesInPlace: 78,
          expiredData: 12,
          retentionViolations: 3,
        },
        breachReadiness: {
          incidentResponsePlan: true,
          dataBreachProcedures: true,
          notificationProcesses: true,
          lastDrillDate: new Date('2024-01-10'),
        },
        recommendations: [
          'Complete classification of remaining 18 datasets',
          'Implement automated retention policy enforcement',
          'Conduct quarterly privacy impact assessments',
          'Update incident response procedures',
        ],
      };

      res.json(report);
    } catch (error) {
      logger.error('Failed to get privacy compliance report', { error });
      res.status(500).json({ error: 'Failed to get privacy compliance report' });
    }
  }
}