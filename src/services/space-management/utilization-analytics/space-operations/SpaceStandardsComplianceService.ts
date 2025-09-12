import { prisma } from '@/config/database';
import { logger } from '@/config/logger';

interface SpaceStandardData {
  organizationId: string;
  name: string;
  description?: string;
  category: 'AREA' | 'DENSITY' | 'ENVIRONMENTAL' | 'ACCESSIBILITY' | 'SAFETY' | 'TECHNOLOGY';
  spaceType: string;
  standardType: 'MINIMUM' | 'MAXIMUM' | 'TARGET' | 'RANGE';
  value?: number;
  minValue?: number;
  maxValue?: number;
  unit: string;
  applicability: {
    buildingTypes?: string[];
    departments?: string[];
    regions?: string[];
    exceptionsAllowed: boolean;
  };
  complianceLevel: 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';
  effectiveDate: Date;
  expiryDate?: Date;
  source?: string;
  references?: string[];
}

interface ComplianceAssessmentData {
  spaceId: string;
  standardId: string;
  assessmentDate: Date;
  assessedBy: string;
  actualValue?: number;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NOT_APPLICABLE';
  deviationAmount?: number;
  deviationPercentage?: number;
  findings: string;
  recommendations?: string[];
  correctiveActions?: Array<{
    action: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    estimatedCost?: number;
    targetDate?: Date;
    assignedTo?: string;
  }>;
  nextAssessmentDate?: Date;
}

interface ComplianceReport {
  organizationId: string;
  reportPeriod: string;
  summary: {
    totalSpaces: number;
    totalStandards: number;
    totalAssessments: number;
    overallComplianceRate: number;
    complianceByCategory: { [key: string]: number };
    complianceByLevel: { [key: string]: number };
  };
  findings: Array<{
    standardId: string;
    standardName: string;
    category: string;
    complianceRate: number;
    nonCompliantSpaces: number;
    averageDeviation: number;
    riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  recommendations: Array<{
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    description: string;
    affectedSpaces: number;
    estimatedCost: number;
    expectedImpact: string;
  }>;
}

interface BenchmarkingData {
  organizationId: string;
  spaceType: string;
  benchmarkType: 'INDUSTRY' | 'PEER' | 'INTERNAL' | 'REGULATORY';
  metrics: Array<{
    metricName: string;
    organizationValue: number;
    benchmarkValue: number;
    unit: string;
    variance: number;
    variancePercentage: number;
    performanceLevel: 'ABOVE' | 'AT' | 'BELOW';
  }>;
  dataSource: string;
  benchmarkDate: Date;
}

/**
 * Space Standards Compliance Service - Comprehensive space standards management and compliance
 * 
 * This service manages:
 * - Space standards creation and maintenance
 * - Compliance assessments and monitoring
 * - Standards benchmarking and analysis
 * - Compliance reporting and analytics
 * - Corrective action tracking
 * - Regulatory compliance management
 */
export class SpaceStandardsComplianceService {
  /**
   * Create space standard
   */
  async createSpaceStandard(data: SpaceStandardData): Promise<any> {
    try {
      logger.info('Creating space standard', { 
        organizationId: data.organizationId, 
        name: data.name,
        category: data.category,
        spaceType: data.spaceType
      });

      const standard = await prisma.spaceStandard.create({
        data: {
          organizationId: data.organizationId,
          name: data.name,
          description: data.description,
          category: data.category,
          spaceType: data.spaceType,
          standardType: data.standardType,
          value: data.value,
          minValue: data.minValue,
          maxValue: data.maxValue,
          unit: data.unit,
          applicability: data.applicability,
          complianceLevel: data.complianceLevel,
          effectiveDate: data.effectiveDate,
          expiryDate: data.expiryDate,
          source: data.source,
          references: data.references,
          status: 'ACTIVE',
          version: 1,
          createdAt: new Date()
        }
      });

      logger.info('Space standard created successfully', { standardId: standard.id });
      return standard;
    } catch (error: unknown) {
      logger.error('Failed to create space standard', error);
      throw error;
    }
  }

  /**
   * Assess space compliance
   */
  async assessSpaceCompliance(data: ComplianceAssessmentData): Promise<any> {
    try {
      logger.info('Assessing space compliance', { 
        spaceId: data.spaceId, 
        standardId: data.standardId,
        assessedBy: data.assessedBy
      });

      // Validate space and standard exist
      const [space, standard] = await Promise.all([
        prisma.space.findUnique({ where: { id: data.spaceId } }),
        prisma.spaceStandard.findUnique({ where: { id: data.standardId } })
      ]);

      if (!space) {
        throw new Error('Space not found');
      }

      if (!standard) {
        throw new Error('Space standard not found');
      }

      // Check if standard is applicable to this space
      const isApplicable = this.isStandardApplicable(space, standard);
      
      if (!isApplicable) {
        data.complianceStatus = 'NOT_APPLICABLE';
        data.findings = 'Standard is not applicable to this space type or configuration';
      }

      const assessment = await prisma.complianceAssessment.create({
        data: {
          spaceId: data.spaceId,
          standardId: data.standardId,
          assessmentDate: data.assessmentDate,
          assessedBy: data.assessedBy,
          actualValue: data.actualValue,
          complianceStatus: data.complianceStatus,
          deviationAmount: data.deviationAmount,
          deviationPercentage: data.deviationPercentage,
          findings: data.findings,
          recommendations: data.recommendations,
          correctiveActions: data.correctiveActions,
          nextAssessmentDate: data.nextAssessmentDate || this.calculateNextAssessmentDate(standard),
          createdAt: new Date()
        }
      });

      // Update space compliance status
      await this.updateSpaceComplianceStatus(data.spaceId);

      logger.info('Space compliance assessed successfully', { 
        assessmentId: assessment.id,
        complianceStatus: data.complianceStatus
      });

      return assessment;
    } catch (error: unknown) {
      logger.error('Failed to assess space compliance', error);
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    organizationId: string,
    reportPeriod: string,
    options: {
      includeCategories?: string[];
      includeBuildingIds?: string[];
      complianceLevels?: string[];
    } = {}
  ): Promise<ComplianceReport> {
    try {
      logger.info('Generating compliance report', { 
        organizationId, 
        reportPeriod,
        options
      });

      // Build filters
      const spaceFilter: any = { organizationId };
      if (options.includeBuildingIds && options.includeBuildingIds.length > 0) {
        spaceFilter.buildingId = { in: options.includeBuildingIds };
      }

      const standardFilter: any = { organizationId, status: 'ACTIVE' };
      if (options.includeCategories && options.includeCategories.length > 0) {
        standardFilter.category = { in: options.includeCategories };
      }
      if (options.complianceLevels && options.complianceLevels.length > 0) {
        standardFilter.complianceLevel = { in: options.complianceLevels };
      }

      // Get data
      const [spaces, standards, assessments] = await Promise.all([
        prisma.space.findMany({ where: spaceFilter }),
        prisma.spaceStandard.findMany({ where: standardFilter }),
        prisma.complianceAssessment.findMany({
          where: {
            space: spaceFilter,
            standard: standardFilter,
            assessmentDate: {
              gte: new Date(`${reportPeriod}-01`),
              lt: new Date(new Date(`${reportPeriod}-01`).getFullYear(), new Date(`${reportPeriod}-01`).getMonth() + 1, 1)
            }
          },
          include: {
            space: true,
            standard: true
          }
        })
      ]);

      // Calculate summary metrics
      const totalCompliantAssessments = assessments.filter(a => a.complianceStatus === 'COMPLIANT').length;
      const overallComplianceRate = assessments.length > 0 ? (totalCompliantAssessments / assessments.length) * 100 : 0;

      const complianceByCategory = standards.reduce((acc, standard) => {
        const categoryAssessments = assessments.filter(a => a.standard.category === standard.category);
        const categoryCompliant = categoryAssessments.filter(a => a.complianceStatus === 'COMPLIANT').length;
        acc[standard.category] = categoryAssessments.length > 0 ? (categoryCompliant / categoryAssessments.length) * 100 : 0;
        return acc;
      }, {} as { [key: string]: number });

      const complianceByLevel = standards.reduce((acc, standard) => {
        const levelAssessments = assessments.filter(a => a.standard.complianceLevel === standard.complianceLevel);
        const levelCompliant = levelAssessments.filter(a => a.complianceStatus === 'COMPLIANT').length;
        acc[standard.complianceLevel] = levelAssessments.length > 0 ? (levelCompliant / levelAssessments.length) * 100 : 0;
        return acc;
      }, {} as { [key: string]: number });

      // Generate findings
      const findings = standards.map(standard => {
        const standardAssessments = assessments.filter(a => a.standardId === standard.id);
        const compliantAssessments = standardAssessments.filter(a => a.complianceStatus === 'COMPLIANT');
        const nonCompliantSpaces = standardAssessments.filter(a => a.complianceStatus === 'NON_COMPLIANT').length;
        
        const complianceRate = standardAssessments.length > 0 ? (compliantAssessments.length / standardAssessments.length) * 100 : 0;
        
        const deviations = standardAssessments
          .filter(a => a.deviationPercentage !== null)
          .map(a => Math.abs(a.deviationPercentage || 0));
        const averageDeviation = deviations.length > 0 ? deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length : 0;
        
        const riskLevel = this.calculateRiskLevel(complianceRate, averageDeviation, standard.complianceLevel);

        return {
          standardId: standard.id,
          standardName: standard.name,
          category: standard.category,
          complianceRate,
          nonCompliantSpaces,
          averageDeviation,
          riskLevel
        };
      });

      // Generate recommendations
      const recommendations = this.generateComplianceRecommendations(assessments, standards);

      const report: ComplianceReport = {
        organizationId,
        reportPeriod,
        summary: {
          totalSpaces: spaces.length,
          totalStandards: standards.length,
          totalAssessments: assessments.length,
          overallComplianceRate,
          complianceByCategory,
          complianceByLevel
        },
        findings: findings.sort((a, b) => a.complianceRate - b.complianceRate), // Lowest compliance first
        recommendations: recommendations.sort((a, b) => {
          const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        })
      };

      logger.info('Compliance report generated successfully', { 
        totalAssessments: assessments.length,
        overallComplianceRate: overallComplianceRate.toFixed(2),
        recommendations: recommendations.length
      });

      return report;
    } catch (error: unknown) {
      logger.error('Failed to generate compliance report', error);
      throw error;
    }
  }

  /**
   * Perform benchmarking analysis
   */
  async performBenchmarking(
    organizationId: string,
    benchmarkData: Omit<BenchmarkingData, 'organizationId'>
  ): Promise<{
    benchmarking: BenchmarkingData;
    insights: Array<{
      metric: string;
      performance: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL';
      gap: number;
      recommendation: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
    }>;
  }> {
    try {
      logger.info('Performing benchmarking analysis', { 
        organizationId, 
        spaceType: benchmarkData.spaceType,
        benchmarkType: benchmarkData.benchmarkType
      });

      const fullBenchmarkData: BenchmarkingData = {
        ...benchmarkData,
        organizationId
      };

      // Save benchmarking data
      const benchmark = await prisma.spaceBenchmark.create({
        data: {
          organizationId,
          spaceType: benchmarkData.spaceType,
          benchmarkType: benchmarkData.benchmarkType,
          metrics: benchmarkData.metrics,
          dataSource: benchmarkData.dataSource,
          benchmarkDate: benchmarkData.benchmarkDate,
          createdAt: new Date()
        }
      });

      // Generate insights
      const insights = benchmarkData.metrics.map(metric => {
        const gap = Math.abs(metric.variance);
        const gapPercentage = Math.abs(metric.variancePercentage);
        
        let performance: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL';
        let priority: 'HIGH' | 'MEDIUM' | 'LOW';
        let recommendation: string;

        if (gapPercentage <= 5) {
          performance = 'EXCELLENT';
          priority = 'LOW';
          recommendation = `${metric.metricName} is performing excellently, maintain current practices.`;
        } else if (gapPercentage <= 15) {
          performance = 'GOOD';
          priority = 'LOW';
          recommendation = `${metric.metricName} is performing well with minor room for improvement.`;
        } else if (gapPercentage <= 30) {
          performance = 'NEEDS_IMPROVEMENT';
          priority = 'MEDIUM';
          recommendation = `${metric.metricName} shows significant deviation from benchmark. Consider implementing improvement initiatives.`;
        } else {
          performance = 'CRITICAL';
          priority = 'HIGH';
          recommendation = `${metric.metricName} is critically below benchmark. Immediate action required to address the gap.`;
        }

        return {
          metric: metric.metricName,
          performance,
          gap,
          recommendation,
          priority
        };
      });

      logger.info('Benchmarking analysis completed', { 
        benchmarkId: benchmark.id,
        insights: insights.length,
        criticalInsights: insights.filter(i => i.performance === 'CRITICAL').length
      });

      return {
        benchmarking: fullBenchmarkData,
        insights
      };
    } catch (error: unknown) {
      logger.error('Failed to perform benchmarking analysis', error);
      throw error;
    }
  }

  /**
   * Get space compliance status
   */
  async getSpaceComplianceStatus(spaceId: string): Promise<{
    spaceId: string;
    overallStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'PENDING_ASSESSMENT';
    complianceScore: number;
    assessments: Array<{
      standardId: string;
      standardName: string;
      category: string;
      status: string;
      assessmentDate: Date;
      nextAssessmentDate?: Date;
    }>;
    upcomingAssessments: Array<{
      standardId: string;
      standardName: string;
      dueDate: Date;
      overdue: boolean;
    }>;
  }> {
    try {
      logger.info('Getting space compliance status', { spaceId });

      const space = await prisma.space.findUnique({
        where: { id: spaceId },
        include: {
          complianceAssessments: {
            include: { standard: true },
            orderBy: { assessmentDate: 'desc' }
          }
        }
      });

      if (!space) {
        throw new Error('Space not found');
      }

      // Get applicable standards
      const applicableStandards = await prisma.spaceStandard.findMany({
        where: {
          organizationId: space.organizationId,
          status: 'ACTIVE',
          spaceType: space.spaceType
        }
      });

      // Get latest assessments for each standard
      const latestAssessments = new Map();
      space.complianceAssessments.forEach(assessment => {
        if (!latestAssessments.has(assessment.standardId)) {
          latestAssessments.set(assessment.standardId, assessment);
        }
      });

      const assessments = Array.from(latestAssessments.values()).map(assessment => ({
        standardId: assessment.standardId,
        standardName: assessment.standard.name,
        category: assessment.standard.category,
        status: assessment.complianceStatus,
        assessmentDate: assessment.assessmentDate,
        nextAssessmentDate: assessment.nextAssessmentDate
      }));

      // Calculate overall status and score
      const compliantCount = assessments.filter(a => a.status === 'COMPLIANT').length;
      const nonCompliantCount = assessments.filter(a => a.status === 'NON_COMPLIANT').length;
      const totalAssessments = assessments.length;

      let overallStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'PENDING_ASSESSMENT';
      if (totalAssessments === 0) {
        overallStatus = 'PENDING_ASSESSMENT';
      } else if (compliantCount === totalAssessments) {
        overallStatus = 'COMPLIANT';
      } else if (nonCompliantCount > 0) {
        overallStatus = compliantCount > 0 ? 'PARTIALLY_COMPLIANT' : 'NON_COMPLIANT';
      } else {
        overallStatus = 'PARTIALLY_COMPLIANT';
      }

      const complianceScore = totalAssessments > 0 ? (compliantCount / totalAssessments) * 100 : 0;

      // Find upcoming assessments
      const today = new Date();
      const upcomingAssessments = applicableStandards
        .map(standard => {
          const latestAssessment = latestAssessments.get(standard.id);
          const dueDate = latestAssessment?.nextAssessmentDate || this.calculateNextAssessmentDate(standard);
          
          return {
            standardId: standard.id,
            standardName: standard.name,
            dueDate,
            overdue: dueDate < today
          };
        })
        .filter(ua => ua.dueDate <= new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000))); // Next 30 days

      return {
        spaceId,
        overallStatus,
        complianceScore,
        assessments,
        upcomingAssessments
      };
    } catch (error: unknown) {
      logger.error('Failed to get space compliance status', error);
      throw error;
    }
  }

  /**
   * Helper method to check if standard is applicable
   */
  private isStandardApplicable(space: any, standard: any): boolean {
    // Check space type
    if (standard.spaceType !== space.spaceType) {
      return false;
    }

    // Check building type if specified
    if (standard.applicability.buildingTypes && standard.applicability.buildingTypes.length > 0) {
      if (!space.building || !standard.applicability.buildingTypes.includes(space.building.buildingType)) {
        return false;
      }
    }

    // Check department if specified
    if (standard.applicability.departments && standard.applicability.departments.length > 0) {
      if (!space.departmentId || !standard.applicability.departments.includes(space.departmentId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate next assessment date based on standard requirements
   */
  private calculateNextAssessmentDate(standard: any): Date {
    const today = new Date();
    
    // Different assessment frequencies based on compliance level
    let monthsToAdd = 12; // Default annual
    
    switch (standard.complianceLevel) {
      case 'REQUIRED':
        monthsToAdd = 6; // Semi-annual
        break;
      case 'RECOMMENDED':
        monthsToAdd = 12; // Annual
        break;
      case 'OPTIONAL':
        monthsToAdd = 24; // Bi-annual
        break;
    }

    const nextDate = new Date(today);
    nextDate.setMonth(nextDate.getMonth() + monthsToAdd);
    return nextDate;
  }

  /**
   * Update space compliance status
   */
  private async updateSpaceComplianceStatus(spaceId: string): Promise<void> {
    // This would update an overall compliance status on the space record
    // Implementation would depend on the specific requirements
  }

  /**
   * Calculate risk level based on compliance metrics
   */
  private calculateRiskLevel(
    complianceRate: number, 
    averageDeviation: number, 
    complianceLevel: string
  ): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (complianceLevel === 'REQUIRED' && complianceRate < 90) {
      return 'HIGH';
    }
    
    if (complianceRate < 70 || averageDeviation > 25) {
      return 'HIGH';
    }
    
    if (complianceRate < 85 || averageDeviation > 15) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  /**
   * Generate compliance recommendations
   */
  private generateComplianceRecommendations(
    assessments: any[], 
    standards: any[]
  ): Array<{
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    description: string;
    affectedSpaces: number;
    estimatedCost: number;
    expectedImpact: string;
  }> {
    const recommendations = [];

    // Group non-compliant assessments by category
    const nonCompliantByCategory = assessments
      .filter(a => a.complianceStatus === 'NON_COMPLIANT')
      .reduce((acc, assessment) => {
        const category = assessment.standard.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(assessment);
        return acc;
      }, {} as { [key: string]: any[] });

    // Generate recommendations for each category with issues
    Object.entries(nonCompliantByCategory).forEach(([category, categoryAssessments]) => {
      const affectedSpaces = new Set(categoryAssessments.map(a => a.spaceId)).size;
      const hasRequiredStandards = categoryAssessments.some(a => a.standard.complianceLevel === 'REQUIRED');
      
      let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
      let estimatedCost = affectedSpaces * 5000; // Base estimate
      
      if (hasRequiredStandards || affectedSpaces > 10) {
        priority = 'HIGH';
        estimatedCost = affectedSpaces * 7500;
      } else if (affectedSpaces < 3) {
        priority = 'LOW';
        estimatedCost = affectedSpaces * 2500;
      }

      recommendations.push({
        priority,
        category,
        description: `Address ${category.toLowerCase()} compliance issues affecting ${affectedSpaces} spaces`,
        affectedSpaces,
        estimatedCost,
        expectedImpact: `Improve compliance rate by ${Math.min(90, 50 + affectedSpaces * 5)}%`
      });
    });

    return recommendations;
  }
}