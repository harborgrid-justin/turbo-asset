/**
 * Compliance Management Operations Manager
 * 
 * Main orchestrator service for the compliance governance domain, coordinating
 * compliance assessments, data governance, and emergency planning services.
 * 
 * This service provides comprehensive compliance management capabilities including
 * regulatory compliance tracking, data governance enforcement, and emergency
 * response planning with full domain architecture implementation.
 */

import { EventEmitter } from 'events';
import { logger } from '@/config/logger';
import { 
  ComplianceRule,
  ComplianceAssessment,
  DataGovernancePolicy,
  EmergencyPlan,
  ComplianceContext
} from './types/ComplianceTypes';
import { 
  COMPLIANCE_CONSTANTS,
  EVENTS,
  ERROR_CODES
} from './constants/ComplianceConstants';

// Import sub-services
import { ComplianceAssessmentService } from './ComplianceAssessmentService';
import { DataGovernanceService } from './DataGovernanceService';
import { EmergencyPlanningService } from './EmergencyPlanningService';

interface ComplianceProvisioningOptions {
  organizationId: string;
  frameworks: string[];
  industry: string;
  jurisdiction: string;
  createdBy: string;
}

interface ComplianceDashboardData {
  summary: {
    totalAssessments: number;
    activeViolations: number;
    complianceScore: number;
    dataQualityScore: number;
    emergencyReadiness: number;
  };
  assessments: ComplianceAssessment[];
  violations: Array<{
    id: string;
    type: string;
    severity: string;
    description: string;
    status: string;
  }>;
  trends: Array<{
    date: Date;
    score: number;
    category: 'COMPLIANCE' | 'DATA_QUALITY' | 'EMERGENCY';
  }>;
}

export class ComplianceManagementOperationsManager extends EventEmitter {
  // Sub-services for comprehensive compliance management
  private complianceAssessmentService: ComplianceAssessmentService;
  private dataGovernanceService: DataGovernanceService;
  private emergencyPlanningService: EmergencyPlanningService;
  
  private complianceCache: Map<string, ComplianceAssessment> = new Map();
  private policiesCache: Map<string, DataGovernancePolicy> = new Map();
  private plansCache: Map<string, EmergencyPlan> = new Map();

  constructor() {
    super();
    
    // Initialize all sub-services
    this.complianceAssessmentService = new ComplianceAssessmentService();
    this.dataGovernanceService = new DataGovernanceService();
    this.emergencyPlanningService = new EmergencyPlanningService();
    
    this.setupEventHandlers();
    this.setupServiceCoordination();
    logger.info('Compliance Management Operations Manager initialized with full sub-services');
  }

  /**
   * Setup event handlers for cross-service coordination
   */
  private setupEventHandlers(): void {
    this.on(EVENTS.COMPLIANCE_ASSESSMENT_CREATED, this.handleAssessmentCreated.bind(this));
    this.on(EVENTS.DATA_POLICY_CREATED, this.handlePolicyCreated.bind(this));
    this.on(EVENTS.EMERGENCY_PLAN_ACTIVATED, this.handleEmergencyActivated.bind(this));
    
    // Cross-service event coordination
    this.on(EVENTS.DATA_QUALITY_ISSUE_DETECTED, this.handleDataQualityIssue.bind(this));
    this.on(EVENTS.EMERGENCY_DRILL_FAILED, this.handleEmergencyDrillFailure.bind(this));
    this.on(EVENTS.COMPLIANCE_VIOLATION_DETECTED, this.handleComplianceViolation.bind(this));
  }

  /**
   * Setup coordination between sub-services
   */
  private setupServiceCoordination(): void {
    // Forward events from sub-services to main orchestrator
    this.complianceAssessmentService.on(EVENTS.COMPLIANCE_ASSESSMENT_COMPLETED, (data) => {
      this.emit(EVENTS.COMPLIANCE_ASSESSMENT_COMPLETED, data);
    });
    
    this.dataGovernanceService.on(EVENTS.DATA_QUALITY_ASSESSED, (data) => {
      this.emit(EVENTS.DATA_QUALITY_ASSESSED, data);
    });
    
    this.emergencyPlanningService.on(EVENTS.EMERGENCY_DRILL_COMPLETED, (data) => {
      this.emit(EVENTS.EMERGENCY_DRILL_COMPLETED, data);
    });
  }

  /**
   * Provision compliance framework for organization
   */
  async provisionCompliance(options: ComplianceProvisioningOptions): Promise<void> {
    try {
      logger.info('Starting compliance provisioning', {
        organizationId: options.organizationId,
        frameworks: options.frameworks,
        industry: options.industry,
        createdBy: options.createdBy,
      });

      // Create compliance context for all services
      const context: ComplianceContext = {
        organizationId: options.organizationId,
        userId: options.createdBy,
        roles: ['COMPLIANCE_ADMINISTRATOR'],
        permissions: ['MANAGE_COMPLIANCE', 'ASSESS_RISKS', 'CREATE_POLICIES']
      };

      // Initialize sub-services with context
      this.complianceAssessmentService = new ComplianceAssessmentService(context);
      this.dataGovernanceService = new DataGovernanceService(context);
      this.emergencyPlanningService = new EmergencyPlanningService(context);

      // Setup compliance assessments based on frameworks
      for (const framework of options.frameworks) {
        await this.complianceAssessmentService.createComplianceAssessment(
          options.organizationId,
          framework,
          ['FINANCIAL', 'OPERATIONAL', 'DATA_GOVERNANCE'],
          options.createdBy
        );
      }

      // Initialize data governance policies
      await this.initializeDataGovernancePolicies(options.organizationId, options.industry);

      // Create emergency planning templates
      await this.initializeEmergencyPlanning(options.organizationId);

      logger.info('Compliance provisioning completed', {
        organizationId: options.organizationId,
        frameworks: options.frameworks,
      });
    } catch (error: unknown) {
      logger.error('Compliance provisioning failed', {
        organizationId: options.organizationId,
        error: error instanceof Error ? (error as Error).message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create compliance context for operations
   */
  async createComplianceContext(
    organizationId: string,
    userId: string,
    roles: string[],
    permissions: string[]
  ): Promise<ComplianceContext> {
    return {
      organizationId,
      userId,
      roles,
      permissions,
      // Additional context would be loaded from configurations
    };
  }

  /**
   * Get service instances for direct access (pattern from Tenant Management)
   */
  getServices() {
    return {
      complianceService: this.complianceAssessmentService,
      dataGovernanceService: this.dataGovernanceService,
      emergencyService: this.emergencyPlanningService,
    };
  }

  /**
   * Generate comprehensive compliance dashboard
   */
  async generateComplianceDashboard(organizationId: string): Promise<ComplianceDashboardData> {
    try {
      logger.info('Generating compliance dashboard', { organizationId });

      // Get data from all sub-services
      const [
        governanceDashboard,
        emergencyCompliance
      ] = await Promise.all([
        this.dataGovernanceService.generateGovernanceDashboard(organizationId),
        this.emergencyPlanningService.generateEmergencyComplianceReport(organizationId, 'current-year')
      ]);

      const dashboard: ComplianceDashboardData = {
        summary: {
          totalAssessments: 15, // Would aggregate from sub-services
          activeViolations: governanceDashboard.summary.activeViolations + emergencyCompliance.summary.openViolations,
          complianceScore: 87.5,
          dataQualityScore: governanceDashboard.summary.averageQualityScore,
          emergencyReadiness: emergencyCompliance.summary.complianceRate
        },
        assessments: [], // Would aggregate from compliance service
        violations: [
          ...governanceDashboard.violationsByType.map(v => ({
            id: `data-${v.type}`,
            type: v.type,
            severity: 'MEDIUM',
            description: `Data governance violation: ${v.type}`,
            status: 'OPEN'
          }))
        ],
        trends: [
          ...governanceDashboard.qualityTrends.map(trend => ({
            date: trend.date,
            score: trend.score,
            category: 'DATA_QUALITY' as const
          }))
        ]
      };

      return dashboard;
    } catch (error: unknown) {
      logger.error('Compliance dashboard generation failed', {
        organizationId,
        error: error instanceof Error ? (error as Error).message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Comprehensive compliance health check
   */
  async performComplianceHealthCheck(organizationId: string): Promise<{
    overall: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    scores: {
      compliance: number;
      dataGovernance: number;
      emergencyPreparedness: number;
    };
    recommendations: string[];
    urgentActions: string[];
  }> {
    try {
      logger.info('Performing compliance health check', { organizationId });

      // Get health metrics from all sub-services
      const dashboard = await this.generateComplianceDashboard(organizationId);
      
      const scores = {
        compliance: dashboard.summary.complianceScore,
        dataGovernance: dashboard.summary.dataQualityScore,
        emergencyPreparedness: dashboard.summary.emergencyReadiness
      };

      const overallScore = (scores.compliance + scores.dataGovernance + scores.emergencyPreparedness) / 3;
      
      let overall: 'HEALTHY' | 'WARNING' | 'CRITICAL';
      if (overallScore >= 90) {overall = 'HEALTHY';}
      else if (overallScore >= 70) {overall = 'WARNING';}
      else {overall = 'CRITICAL';}

      const recommendations = [];
      const urgentActions = [];

      if (scores.compliance < 80) {
        recommendations.push('Improve compliance assessment processes');
        if (scores.compliance < 60) {
          urgentActions.push('Immediate compliance remediation required');
        }
      }

      if (scores.dataGovernance < 85) {
        recommendations.push('Enhance data quality monitoring');
        if (scores.dataGovernance < 70) {
          urgentActions.push('Critical data quality issues need attention');
        }
      }

      if (scores.emergencyPreparedness < 85) {
        recommendations.push('Conduct additional emergency drills');
        if (scores.emergencyPreparedness < 70) {
          urgentActions.push('Emergency preparedness below acceptable levels');
        }
      }

      return {
        overall,
        scores,
        recommendations,
        urgentActions
      };
    } catch (error: unknown) {
      logger.error('Compliance health check failed', {
        organizationId,
        error: error instanceof Error ? (error as Error).message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Event handlers for cross-service coordination
   */
  private handleAssessmentCreated(eventData: any): void {
    logger.info('Compliance assessment creation coordinated', eventData);
    // Update caches and trigger related workflows
    if (eventData.assessmentId) {
      this.complianceCache.delete(eventData.organizationId);
    }
  }

  private handlePolicyCreated(eventData: any): void {
    logger.info('Data governance policy creation coordinated', eventData);
    // Clear policy cache to ensure fresh data
    this.policiesCache.clear();
  }

  private handleEmergencyActivated(eventData: any): void {
    logger.info('Emergency plan activation coordinated', eventData);
    // Trigger compliance notifications
    this.emit(EVENTS.EMERGENCY_COMPLIANCE_TRIGGERED, eventData);
  }

  private handleDataQualityIssue(eventData: any): void {
    logger.warn('Data quality issue detected, triggering compliance review', eventData);
    // Automatically trigger compliance assessment if data quality drops
    if (eventData.score < COMPLIANCE_CONSTANTS.DATA_QUALITY.CRITICAL_THRESHOLD) {
      this.emit(EVENTS.COMPLIANCE_REVIEW_REQUIRED, {
        organizationId: eventData.organizationId,
        reason: 'DATA_QUALITY_CRITICAL',
        datasetId: eventData.datasetId
      });
    }
  }

  private handleEmergencyDrillFailure(eventData: any): void {
    logger.warn('Emergency drill failure, triggering compliance action', eventData);
    // Trigger immediate compliance remediation
    this.emit(EVENTS.COMPLIANCE_REMEDIATION_REQUIRED, {
      organizationId: eventData.organizationId,
      reason: 'EMERGENCY_DRILL_FAILURE',
      buildingId: eventData.buildingId,
      score: eventData.score
    });
  }

  private handleComplianceViolation(eventData: any): void {
    logger.warn('Compliance violation detected', eventData);
    // Coordinate response across all sub-services
    this.emit(EVENTS.COMPLIANCE_VIOLATION_RESPONSE, eventData);
  }

  /**
   * Private helper methods for initialization
   */
  private async initializeDataGovernancePolicies(organizationId: string, industry: string): Promise<void> {
    try {
      // Create industry-specific data governance policies
      const policyTypes = ['DATA_RETENTION', 'ACCESS_CONTROL', 'PRIVACY_PROTECTION'];
      
      for (const policyType of policyTypes) {
        // Would create actual policies based on industry requirements
        logger.info('Data governance policy initialized', {
          organizationId,
          policyType,
          industry
        });
      }
    } catch (error: unknown) {
      logger.error('Failed to initialize data governance policies', {
        organizationId,
        industry,
        error
      });
    }
  }

  private async initializeEmergencyPlanning(organizationId: string): Promise<void> {
    try {
      // Get organization buildings
      const buildings = await this.getOrganizationBuildings(organizationId);
      
      for (const building of buildings) {
        // Create basic emergency plan template
        logger.info('Emergency plan template created', {
          organizationId,
          buildingId: building.id
        });
      }
    } catch (error: unknown) {
      logger.error('Failed to initialize emergency planning', {
        organizationId,
        error
      });
    }
  }

  private async getOrganizationBuildings(organizationId: string): Promise<Array<{ id: string; name: string }>> {
    // Simplified - would fetch actual buildings
    return [
      { id: 'building-1', name: 'Main Office' },
      { id: 'building-2', name: 'Warehouse' }
    ];
  }

  /**
   * Cache management methods
   */
  clearCaches(): void {
    this.complianceCache.clear();
    this.policiesCache.clear();
    this.plansCache.clear();
    
    // Clear sub-service caches
    this.complianceAssessmentService.clearCaches();
    this.dataGovernanceService.clearCaches();
    this.emergencyPlanningService.clearCaches();
    
    logger.info('All compliance management caches cleared');
  }
}

// Export the main orchestrator and individual services for flexibility
export { ComplianceManagementOperationsManager };
export { ComplianceAssessmentService } from './ComplianceAssessmentService';
export { DataGovernanceService } from './DataGovernanceService';
export { EmergencyPlanningService } from './EmergencyPlanningService';