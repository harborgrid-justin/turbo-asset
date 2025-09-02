/**
 * Emergency Planning Service - Emergency response planning and management
 * 
 * This service handles emergency plan creation, drill management, compliance
 * tracking, evacuation procedures, and crisis response coordination. Migrated
 * from legacy EmergencyPlanningService with enhanced domain architecture.
 */

import { EventEmitter } from 'events';
import { prisma } from '../../../../../config/database';
import { logger } from '../../../../../config/logger';
import { 
  EmergencyPlan,
  EmergencyResponse,
  ComplianceContext
} from './types/ComplianceTypes';
import { 
  COMPLIANCE_CONSTANTS,
  EVENTS,
  ERROR_CODES
} from './constants/ComplianceConstants';

export interface EmergencyPlanData {
  buildingId: string;
  planType: 'EVACUATION' | 'FIRE' | 'EARTHQUAKE' | 'LOCKDOWN' | 'MEDICAL' | 'SEVERE_WEATHER';
  planVersion: string;
  planDocument: string;
  evacuationRoutes: EvacuationRoute[];
  assemblyPoints: AssemblyPoint[];
  emergencyContacts: EmergencyContact[];
  floorWardens: FloorWarden[];
  specialNeeds: SpecialNeedsAssistance[];
  complianceRequirements: ComplianceRequirement[];
}

export interface EvacuationRoute {
  routeId: string;
  routeName: string;
  fromFloorId: string;
  primaryPath: string;
  alternativePaths: string[];
  capacity: number;
  estimatedTime: number; // in minutes
  accessibility: 'ACCESSIBLE' | 'STAIRS_ONLY' | 'ELEVATOR_REQUIRED';
  instructions: string;
}

export interface AssemblyPoint {
  pointId: string;
  pointName: string;
  location: string;
  coordinates: { lat: number; lng: number };
  capacity: number;
  weatherProtection: boolean;
  accessibleParking: boolean;
  emergencyServices: string[];
}

export interface EmergencyContact {
  contactType: 'FIRE_DEPARTMENT' | 'POLICE' | 'MEDICAL' | 'BUILDING_MANAGEMENT' | 'SECURITY';
  contactName: string;
  phoneNumber: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  priority: number;
}

export interface FloorWarden {
  wardenId: string;
  employeeId: string;
  floorId: string;
  isPrimary: boolean;
  phoneNumber: string;
  responsibilities: string[];
  trainingDate?: Date;
  certificationExpiry?: Date;
}

export interface SpecialNeedsAssistance {
  employeeId: string;
  assistanceType: 'MOBILITY' | 'VISUAL' | 'HEARING' | 'MEDICAL' | 'COGNITIVE';
  description: string;
  assistantId?: string;
  equipmentRequired?: string[];
  evacuationProcedure: string;
}

export interface ComplianceRequirement {
  regulationType: 'OSHA' | 'NFPA' | 'LOCAL' | 'STATE' | 'ADA' | 'INTERNATIONAL';
  regulationCode: string;
  description: string;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING_REVIEW';
  lastReviewed?: Date;
  nextReviewDate?: Date;
  correctionActions?: string[];
}

export interface DrillRecord {
  drillId: string;
  buildingId: string;
  drillType: string;
  scheduledDate: Date;
  actualDate?: Date;
  duration?: number;
  participantCount?: number;
  completionRate?: number;
  issues: DrillIssue[];
  score?: number;
  recommendations: string[];
  conductedBy: string;
  weather?: string;
}

export interface DrillIssue {
  issueType: 'ROUTE_BLOCKED' | 'SLOW_EVACUATION' | 'EQUIPMENT_FAILURE' | 'COMMUNICATION_FAILURE' | 'PARTICIPANT_ISSUE';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location?: string;
  actionRequired: string;
  assignedTo?: string;
}

export interface EmergencyAlert {
  alertId: string;
  buildingId: string;
  alertType: 'FIRE' | 'EARTHQUAKE' | 'LOCKDOWN' | 'MEDICAL' | 'SEVERE_WEATHER' | 'SECURITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  location: string;
  activatedBy: string;
  activatedAt: Date;
  acknowledgedBy?: string[];
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  resolution?: string;
  resolvedAt?: Date;
}

export interface IncidentReport {
  incidentId: string;
  buildingId: string;
  incidentType: string;
  severity: string;
  description: string;
  location: string;
  reportedBy: string;
  reportedAt: Date;
  responseActions: Array<{
    action: string;
    takenBy: string;
    timestamp: Date;
    outcome: string;
  }>;
  injuries?: Array<{
    personId: string;
    injuryType: string;
    severity: string;
    treatment: string;
  }>;
  damages?: Array<{
    assetId: string;
    damageType: string;
    estimatedCost: number;
  }>;
  lessonsLearned: string[];
  followUpActions: string[];
}

export class EmergencyPlanningService extends EventEmitter {
  private emergencyPlansCache: Map<string, EmergencyPlanData> = new Map();
  private drillRecordsCache: Map<string, DrillRecord[]> = new Map();
  private activeAlertsCache: Map<string, EmergencyAlert[]> = new Map();
  private incidentReportsCache: Map<string, IncidentReport> = new Map();

  constructor(private context?: ComplianceContext) {
    super();
    this.setupCacheManagement();
    this.setupEmergencyMonitoring();
    logger.info('Emergency Planning Service initialized', {
      organizationId: context?.organizationId
    });
  }

  /**
   * Setup cache management with appropriate TTLs
   */
  private setupCacheManagement(): void {
    // Emergency plans cache - longer TTL (4 hours)
    setInterval(() => {
      this.emergencyPlansCache.clear();
      logger.debug('Emergency plans cache cleared');
    }, 4 * 60 * 60 * 1000);

    // Active alerts cache - shorter TTL (5 minutes)
    setInterval(() => {
      this.activeAlertsCache.clear();
      logger.debug('Emergency alerts cache cleared');
    }, 5 * 60 * 1000);
  }

  /**
   * Setup emergency monitoring and automated checks
   */
  private setupEmergencyMonitoring(): void {
    // Check for expired certifications daily
    const DAILY_CHECK = 24 * 60 * 60 * 1000;
    
    setInterval(async () => {
      try {
        await this.checkExpiringCertifications();
        await this.checkComplianceStatus();
      } catch (error) {
        logger.error('Emergency monitoring failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, DAILY_CHECK);
  }

  /**
   * Create comprehensive emergency plan
   */
  async createEmergencyPlan(
    buildingId: string,
    planData: Omit<EmergencyPlanData, 'buildingId'>
  ): Promise<EmergencyPlanData> {
    try {
      logger.info('Creating emergency plan', {
        buildingId,
        planType: planData.planType,
        organizationId: this.context?.organizationId
      });

      const emergencyPlan: EmergencyPlanData = {
        buildingId,
        ...planData
      };

      // Validate emergency plan
      await this.validateEmergencyPlan(emergencyPlan);

      // Generate compliance checklist
      emergencyPlan.complianceRequirements = await this.generateComplianceRequirements(
        planData.planType,
        buildingId
      );

      // Optimize evacuation routes
      emergencyPlan.evacuationRoutes = await this.optimizeEvacuationRoutes(
        emergencyPlan.evacuationRoutes,
        buildingId
      );

      // Cache the plan
      this.emergencyPlansCache.set(buildingId, emergencyPlan);

      // Store in database
      await this.saveEmergencyPlan(emergencyPlan);

      // Emit plan creation event
      this.emit(EVENTS.EMERGENCY_PLAN_CREATED, {
        buildingId,
        planType: planData.planType,
        organizationId: this.context?.organizationId
      });

      // Schedule compliance reviews
      await this.scheduleComplianceReviews(emergencyPlan);

      return emergencyPlan;
    } catch (error) {
      logger.error('Emergency plan creation failed', {
        buildingId,
        planType: planData.planType,
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: this.context?.organizationId
      });
      throw error;
    }
  }

  /**
   * Conduct emergency drill
   */
  async conductEmergencyDrill(
    buildingId: string,
    drillType: string,
    plannedDate: Date,
    conductorId: string
  ): Promise<DrillRecord> {
    try {
      logger.info('Conducting emergency drill', {
        buildingId,
        drillType,
        plannedDate,
        conductorId,
        organizationId: this.context?.organizationId
      });

      const drillId = `drill-${buildingId}-${Date.now()}`;
      
      const drill: DrillRecord = {
        drillId,
        buildingId,
        drillType,
        scheduledDate: plannedDate,
        actualDate: new Date(),
        issues: [],
        recommendations: [],
        conductedBy: conductorId
      };

      // Execute drill procedures
      const results = await this.executeDrillProcedures(drill);
      
      // Update drill with results
      Object.assign(drill, results);

      // Analyze drill performance
      drill.score = await this.calculateDrillScore(drill);
      drill.recommendations = await this.generateDrillRecommendations(drill);

      // Cache drill record
      const buildingDrills = this.drillRecordsCache.get(buildingId) || [];
      buildingDrills.push(drill);
      this.drillRecordsCache.set(buildingId, buildingDrills);

      // Store in database
      await this.saveDrillRecord(drill);

      // Emit drill completion event
      this.emit(EVENTS.EMERGENCY_DRILL_COMPLETED, {
        drillId,
        buildingId,
        score: drill.score,
        organizationId: this.context?.organizationId
      });

      // Check if remedial actions are needed
      if (drill.score && drill.score < COMPLIANCE_CONSTANTS.EMERGENCY.MINIMUM_DRILL_SCORE) {
        this.emit(EVENTS.EMERGENCY_DRILL_FAILED, {
          drillId,
          buildingId,
          score: drill.score,
          issues: drill.issues
        });
      }

      return drill;
    } catch (error) {
      logger.error('Emergency drill execution failed', {
        buildingId,
        drillType,
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: this.context?.organizationId
      });
      throw error;
    }
  }

  /**
   * Activate emergency alert system
   */
  async activateEmergencyAlert(
    buildingId: string,
    alertType: EmergencyAlert['alertType'],
    severity: EmergencyAlert['severity'],
    message: string,
    location: string,
    activatorId: string
  ): Promise<EmergencyAlert> {
    try {
      logger.info('Activating emergency alert', {
        buildingId,
        alertType,
        severity,
        location,
        organizationId: this.context?.organizationId
      });

      const alert: EmergencyAlert = {
        alertId: `alert-${buildingId}-${Date.now()}`,
        buildingId,
        alertType,
        severity,
        message,
        location,
        activatedBy: activatorId,
        activatedAt: new Date(),
        status: 'ACTIVE'
      };

      // Get building occupants for notification
      const occupants = await this.getBuildingOccupants(buildingId);

      // Send emergency notifications
      await this.sendEmergencyNotifications(alert, occupants);

      // Notify emergency services if critical
      if (severity === 'CRITICAL' || severity === 'HIGH') {
        await this.notifyEmergencyServices(alert);
      }

      // Cache active alert
      const buildingAlerts = this.activeAlertsCache.get(buildingId) || [];
      buildingAlerts.push(alert);
      this.activeAlertsCache.set(buildingId, buildingAlerts);

      // Store in database
      await this.saveEmergencyAlert(alert);

      // Emit alert activation event
      this.emit(EVENTS.EMERGENCY_ALERT_ACTIVATED, {
        alertId: alert.alertId,
        buildingId,
        alertType,
        severity,
        organizationId: this.context?.organizationId
      });

      // Auto-activate emergency procedures
      await this.activateEmergencyProcedures(alert);

      return alert;
    } catch (error) {
      logger.error('Emergency alert activation failed', {
        buildingId,
        alertType,
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: this.context?.organizationId
      });
      throw error;
    }
  }

  /**
   * Generate emergency compliance report
   */
  async generateEmergencyComplianceReport(
    organizationId: string,
    reportingPeriod: string
  ): Promise<{
    summary: {
      totalBuildings: number;
      compliantBuildings: number;
      complianceRate: number;
      drillsConducted: number;
      averageDrillScore: number;
      openViolations: number;
    };
    buildingCompliance: Array<{
      buildingId: string;
      buildingName: string;
      complianceStatus: string;
      lastDrillDate: Date | null;
      lastDrillScore: number | null;
      violations: ComplianceRequirement[];
    }>;
    drillStatistics: {
      totalDrills: number;
      averageScore: number;
      scoreDistribution: Array<{ range: string; count: number }>;
      commonIssues: Array<{ issue: string; frequency: number }>;
    };
  }> {
    try {
      logger.info('Generating emergency compliance report', {
        organizationId,
        reportingPeriod
      });

      // Get all buildings for organization
      const buildings = await this.getOrganizationBuildings(organizationId);

      // Analyze building compliance
      const buildingCompliance = await Promise.all(
        buildings.map(async building => {
          const plan = await this.getEmergencyPlan(building.id);
          const drills = await this.getBuildingDrills(building.id, reportingPeriod);
          const violations = plan?.complianceRequirements.filter(
            req => req.complianceStatus === 'NON_COMPLIANT'
          ) || [];

          const lastDrill = drills.length > 0 
            ? drills.sort((a, b) => b.actualDate!.getTime() - a.actualDate!.getTime())[0]
            : null;

          return {
            buildingId: building.id,
            buildingName: building.name,
            complianceStatus: violations.length === 0 ? 'COMPLIANT' : 'NON_COMPLIANT',
            lastDrillDate: lastDrill?.actualDate || null,
            lastDrillScore: lastDrill?.score || null,
            violations
          };
        })
      );

      // Calculate summary statistics
      const compliantBuildings = buildingCompliance.filter(b => b.complianceStatus === 'COMPLIANT').length;
      const allDrills = await this.getAllDrills(organizationId, reportingPeriod);
      const averageDrillScore = allDrills.length > 0 
        ? allDrills.reduce((sum, drill) => sum + (drill.score || 0), 0) / allDrills.length
        : 0;

      // Analyze drill statistics
      const drillStatistics = this.analyzeDrillStatistics(allDrills);

      const report = {
        summary: {
          totalBuildings: buildings.length,
          compliantBuildings,
          complianceRate: buildings.length > 0 ? (compliantBuildings / buildings.length) * 100 : 0,
          drillsConducted: allDrills.length,
          averageDrillScore,
          openViolations: buildingCompliance.reduce((sum, b) => sum + b.violations.length, 0)
        },
        buildingCompliance,
        drillStatistics
      };

      // Store report
      await this.saveComplianceReport(organizationId, reportingPeriod, report);

      // Emit report generation event
      this.emit(EVENTS.EMERGENCY_COMPLIANCE_REPORT_GENERATED, {
        organizationId,
        reportingPeriod,
        complianceRate: report.summary.complianceRate
      });

      return report;
    } catch (error) {
      logger.error('Emergency compliance report generation failed', {
        organizationId,
        reportingPeriod,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Process emergency incident
   */
  async processIncident(
    buildingId: string,
    incidentData: Omit<IncidentReport, 'incidentId' | 'reportedAt'>
  ): Promise<IncidentReport> {
    try {
      logger.info('Processing emergency incident', {
        buildingId,
        incidentType: incidentData.incidentType,
        severity: incidentData.severity,
        organizationId: this.context?.organizationId
      });

      const incident: IncidentReport = {
        incidentId: `incident-${buildingId}-${Date.now()}`,
        reportedAt: new Date(),
        ...incidentData
      };

      // Analyze incident severity and trigger appropriate responses
      if (incident.severity === 'CRITICAL' || incident.severity === 'HIGH') {
        await this.triggerEmergencyResponse(incident);
      }

      // Generate lessons learned
      incident.lessonsLearned = await this.generateLessonsLearned(incident);

      // Generate follow-up actions
      incident.followUpActions = await this.generateFollowUpActions(incident);

      // Cache incident report
      this.incidentReportsCache.set(incident.incidentId, incident);

      // Store in database
      await this.saveIncidentReport(incident);

      // Emit incident processing event
      this.emit(EVENTS.EMERGENCY_INCIDENT_PROCESSED, {
        incidentId: incident.incidentId,
        buildingId,
        incidentType: incident.incidentType,
        severity: incident.severity,
        organizationId: this.context?.organizationId
      });

      // Update emergency plan if needed
      await this.updateEmergencyPlanFromIncident(incident);

      return incident;
    } catch (error) {
      logger.error('Emergency incident processing failed', {
        buildingId,
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: this.context?.organizationId
      });
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async validateEmergencyPlan(plan: EmergencyPlanData): Promise<void> {
    // Validate evacuation routes
    if (plan.evacuationRoutes.length === 0) {
      throw new Error('Emergency plan must include at least one evacuation route');
    }

    // Validate assembly points
    if (plan.assemblyPoints.length === 0) {
      throw new Error('Emergency plan must include at least one assembly point');
    }

    // Validate emergency contacts
    const requiredContactTypes = ['FIRE_DEPARTMENT', 'POLICE', 'MEDICAL'];
    const existingTypes = plan.emergencyContacts.map(c => c.contactType);
    const missingTypes = requiredContactTypes.filter(type => !existingTypes.includes(type as any));
    
    if (missingTypes.length > 0) {
      throw new Error(`Emergency plan missing required contacts: ${missingTypes.join(', ')}`);
    }

    // Validate floor wardens
    const floors = await this.getBuildingFloors(plan.buildingId);
    const wardenFloors = plan.floorWardens.map(w => w.floorId);
    const uncoveredFloors = floors.filter(floor => !wardenFloors.includes(floor.id));
    
    if (uncoveredFloors.length > 0) {
      logger.warn('Some floors lack floor wardens', {
        buildingId: plan.buildingId,
        uncoveredFloors: uncoveredFloors.map(f => f.id)
      });
    }
  }

  private async generateComplianceRequirements(
    planType: EmergencyPlanData['planType'],
    buildingId: string
  ): Promise<ComplianceRequirement[]> {
    const requirements: ComplianceRequirement[] = [];

    // Base OSHA requirements
    requirements.push({
      regulationType: 'OSHA',
      regulationCode: '29 CFR 1910.38',
      description: 'Emergency action plans',
      complianceStatus: 'PENDING_REVIEW',
      nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    });

    // NFPA requirements for fire safety
    if (planType === 'FIRE' || planType === 'EVACUATION') {
      requirements.push({
        regulationType: 'NFPA',
        regulationCode: 'NFPA 101',
        description: 'Life Safety Code',
        complianceStatus: 'PENDING_REVIEW',
        nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      });
    }

    // ADA requirements
    requirements.push({
      regulationType: 'ADA',
      regulationCode: 'ADA Title III',
      description: 'Accessibility requirements for emergency procedures',
      complianceStatus: 'PENDING_REVIEW',
      nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    });

    return requirements;
  }

  private async optimizeEvacuationRoutes(
    routes: EvacuationRoute[],
    buildingId: string
  ): Promise<EvacuationRoute[]> {
    // Get building layout and occupancy data
    const buildingData = await this.getBuildingData(buildingId);
    
    return routes.map(route => {
      // Calculate more accurate capacity based on route width and safety factors
      const optimizedCapacity = this.calculateRouteCapacity(route, buildingData);
      
      // Estimate evacuation time based on route characteristics
      const optimizedTime = this.estimateEvacuationTime(route, buildingData);
      
      return {
        ...route,
        capacity: optimizedCapacity,
        estimatedTime: optimizedTime
      };
    });
  }

  private calculateRouteCapacity(route: EvacuationRoute, buildingData: any): number {
    // Simplified capacity calculation - would use actual building metrics
    const baseCapacity = route.capacity;
    const accessibilityFactor = route.accessibility === 'ACCESSIBLE' ? 1.0 : 0.8;
    return Math.floor(baseCapacity * accessibilityFactor);
  }

  private estimateEvacuationTime(route: EvacuationRoute, buildingData: any): number {
    // Simplified time estimation - would use actual distances and occupancy
    const baseTime = route.estimatedTime;
    const accessibilityFactor = route.accessibility === 'STAIRS_ONLY' ? 1.5 : 1.0;
    return Math.ceil(baseTime * accessibilityFactor);
  }

  private async executeDrillProcedures(drill: DrillRecord): Promise<Partial<DrillRecord>> {
    // Simulate drill execution with random results
    const startTime = Date.now();
    
    // Simulate drill duration (5-15 minutes)
    const duration = 5 + Math.random() * 10;
    
    // Simulate participation rate
    const expectedParticipants = await this.getBuildingOccupancyCount(drill.buildingId);
    const actualParticipants = Math.floor(expectedParticipants * (0.85 + Math.random() * 0.15));
    const completionRate = (actualParticipants / expectedParticipants) * 100;
    
    // Generate issues (some drills may have issues)
    const issues: DrillIssue[] = [];
    if (Math.random() < 0.3) { // 30% chance of issues
      issues.push({
        issueType: 'SLOW_EVACUATION',
        description: 'Evacuation took longer than expected on Floor 3',
        severity: 'MEDIUM',
        location: 'Floor 3',
        actionRequired: 'Review evacuation procedures and provide additional training'
      });
    }
    
    return {
      duration,
      participantCount: actualParticipants,
      completionRate,
      issues
    };
  }

  private async calculateDrillScore(drill: DrillRecord): Promise<number> {
    let score = 100;
    
    // Deduct points for poor completion rate
    if (drill.completionRate && drill.completionRate < 95) {
      score -= (95 - drill.completionRate);
    }
    
    // Deduct points for issues
    for (const issue of drill.issues) {
      switch (issue.severity) {
        case 'CRITICAL':
          score -= 20;
          break;
        case 'HIGH':
          score -= 15;
          break;
        case 'MEDIUM':
          score -= 10;
          break;
        case 'LOW':
          score -= 5;
          break;
      }
    }
    
    // Deduct points for excessive duration
    const expectedDuration = 8; // 8 minutes expected
    if (drill.duration && drill.duration > expectedDuration) {
      score -= Math.min(20, (drill.duration - expectedDuration) * 2);
    }
    
    return Math.max(0, score);
  }

  private async generateDrillRecommendations(drill: DrillRecord): Promise<string[]> {
    const recommendations: string[] = [];
    
    if (drill.completionRate && drill.completionRate < 95) {
      recommendations.push('Improve communication systems to ensure all occupants receive drill notifications');
    }
    
    if (drill.duration && drill.duration > 10) {
      recommendations.push('Review evacuation routes and consider additional exits or route optimization');
    }
    
    if (drill.issues.some(issue => issue.issueType === 'EQUIPMENT_FAILURE')) {
      recommendations.push('Conduct regular maintenance and testing of emergency equipment');
    }
    
    if (drill.issues.some(issue => issue.severity === 'HIGH' || issue.severity === 'CRITICAL')) {
      recommendations.push('Conduct immediate remedial training and follow-up drill within 30 days');
    }
    
    return recommendations;
  }

  private async getBuildingOccupants(buildingId: string): Promise<Array<{ id: string; email: string; phone: string }>> {
    // Simplified - would fetch actual occupant data
    return [
      { id: 'user1', email: 'user1@company.com', phone: '+1-555-0101' },
      { id: 'user2', email: 'user2@company.com', phone: '+1-555-0102' }
    ];
  }

  private async sendEmergencyNotifications(alert: EmergencyAlert, occupants: Array<{ id: string; email: string; phone: string }>): Promise<void> {
    try {
      // Send email notifications
      for (const occupant of occupants) {
        // Would integrate with notification service
        logger.info('Emergency notification sent', {
          alertId: alert.alertId,
          recipientId: occupant.id,
          method: 'email'
        });
      }
      
      // Send SMS notifications for high severity
      if (alert.severity === 'HIGH' || alert.severity === 'CRITICAL') {
        for (const occupant of occupants) {
          // Would integrate with SMS service
          logger.info('Emergency SMS sent', {
            alertId: alert.alertId,
            recipientId: occupant.id,
            method: 'sms'
          });
        }
      }
    } catch (error) {
      logger.error('Failed to send emergency notifications', {
        alertId: alert.alertId,
        error
      });
    }
  }

  private async notifyEmergencyServices(alert: EmergencyAlert): Promise<void> {
    try {
      // Get emergency contacts for building
      const plan = await this.getEmergencyPlan(alert.buildingId);
      if (!plan) return;
      
      const relevantContacts = plan.emergencyContacts.filter(contact => {
        switch (alert.alertType) {
          case 'FIRE':
            return contact.contactType === 'FIRE_DEPARTMENT';
          case 'MEDICAL':
            return contact.contactType === 'MEDICAL';
          case 'SECURITY':
          case 'LOCKDOWN':
            return contact.contactType === 'POLICE';
          default:
            return contact.priority <= 2;
        }
      });
      
      for (const contact of relevantContacts) {
        // Would integrate with automated calling system
        logger.info('Emergency services notified', {
          alertId: alert.alertId,
          contactType: contact.contactType,
          phoneNumber: contact.phoneNumber
        });
      }
    } catch (error) {
      logger.error('Failed to notify emergency services', {
        alertId: alert.alertId,
        error
      });
    }
  }

  private async activateEmergencyProcedures(alert: EmergencyAlert): Promise<void> {
    try {
      const plan = await this.getEmergencyPlan(alert.buildingId);
      if (!plan) return;
      
      // Activate building systems based on alert type
      switch (alert.alertType) {
        case 'FIRE':
          await this.activateFireSafetySystems(alert.buildingId);
          break;
        case 'LOCKDOWN':
          await this.activateLockdownProcedures(alert.buildingId);
          break;
        case 'EARTHQUAKE':
          await this.activateSeismicSafetyProcedures(alert.buildingId);
          break;
      }
      
      logger.info('Emergency procedures activated', {
        alertId: alert.alertId,
        buildingId: alert.buildingId,
        alertType: alert.alertType
      });
    } catch (error) {
      logger.error('Failed to activate emergency procedures', {
        alertId: alert.alertId,
        error
      });
    }
  }

  private async activateFireSafetySystems(buildingId: string): Promise<void> {
    // Would integrate with building automation systems
    logger.info('Fire safety systems activated', { buildingId });
  }

  private async activateLockdownProcedures(buildingId: string): Promise<void> {
    // Would integrate with security systems
    logger.info('Lockdown procedures activated', { buildingId });
  }

  private async activateSeismicSafetyProcedures(buildingId: string): Promise<void> {
    // Would integrate with seismic safety systems
    logger.info('Seismic safety procedures activated', { buildingId });
  }

  // Database and cache helper methods
  private async saveEmergencyPlan(plan: EmergencyPlanData): Promise<void> {
    try {
      await prisma.emergencyPlan.upsert({
        where: { buildingId: plan.buildingId },
        update: {
          planData: JSON.stringify(plan),
          planType: plan.planType,
          planVersion: plan.planVersion,
          updatedAt: new Date()
        },
        create: {
          buildingId: plan.buildingId,
          planType: plan.planType,
          planVersion: plan.planVersion,
          planData: JSON.stringify(plan),
          organizationId: this.context?.organizationId || 'unknown'
        }
      });
    } catch (error) {
      logger.error('Failed to save emergency plan', {
        buildingId: plan.buildingId,
        error
      });
    }
  }

  private async saveDrillRecord(drill: DrillRecord): Promise<void> {
    try {
      await prisma.emergencyDrill.create({
        data: {
          drillId: drill.drillId,
          buildingId: drill.buildingId,
          drillType: drill.drillType,
          scheduledDate: drill.scheduledDate,
          actualDate: drill.actualDate,
          drillData: JSON.stringify(drill),
          score: drill.score,
          organizationId: this.context?.organizationId || 'unknown'
        }
      });
    } catch (error) {
      logger.error('Failed to save drill record', {
        drillId: drill.drillId,
        error
      });
    }
  }

  private async saveEmergencyAlert(alert: EmergencyAlert): Promise<void> {
    try {
      await prisma.emergencyAlert.create({
        data: {
          alertId: alert.alertId,
          buildingId: alert.buildingId,
          alertType: alert.alertType,
          severity: alert.severity,
          message: alert.message,
          location: alert.location,
          activatedBy: alert.activatedBy,
          activatedAt: alert.activatedAt,
          status: alert.status,
          organizationId: this.context?.organizationId || 'unknown'
        }
      });
    } catch (error) {
      logger.error('Failed to save emergency alert', {
        alertId: alert.alertId,
        error
      });
    }
  }

  private async saveIncidentReport(incident: IncidentReport): Promise<void> {
    try {
      await prisma.emergencyIncident.create({
        data: {
          incidentId: incident.incidentId,
          buildingId: incident.buildingId,
          incidentType: incident.incidentType,
          severity: incident.severity,
          description: incident.description,
          location: incident.location,
          reportedBy: incident.reportedBy,
          reportedAt: incident.reportedAt,
          incidentData: JSON.stringify(incident),
          organizationId: this.context?.organizationId || 'unknown'
        }
      });
    } catch (error) {
      logger.error('Failed to save incident report', {
        incidentId: incident.incidentId,
        error
      });
    }
  }

  // Additional helper methods for compliance reporting and monitoring
  private async checkExpiringCertifications(): Promise<void> {
    if (!this.context?.organizationId) return;

    // Check for expiring floor warden certifications
    // Would implement actual database queries
    logger.info('Checking expiring certifications', {
      organizationId: this.context.organizationId
    });
  }

  private async checkComplianceStatus(): Promise<void> {
    if (!this.context?.organizationId) return;

    // Check compliance requirements status
    logger.info('Checking compliance status', {
      organizationId: this.context.organizationId
    });
  }

  private async scheduleComplianceReviews(plan: EmergencyPlanData): Promise<void> {
    // Schedule reviews based on compliance requirements
    for (const requirement of plan.complianceRequirements) {
      if (requirement.nextReviewDate) {
        // Would integrate with scheduling system
        logger.info('Compliance review scheduled', {
          buildingId: plan.buildingId,
          regulationType: requirement.regulationType,
          reviewDate: requirement.nextReviewDate
        });
      }
    }
  }

  private async getEmergencyPlan(buildingId: string): Promise<EmergencyPlanData | null> {
    const cached = this.emergencyPlansCache.get(buildingId);
    if (cached) return cached;

    try {
      const plan = await prisma.emergencyPlan.findUnique({
        where: { buildingId }
      });

      if (plan) {
        const parsed = JSON.parse(plan.planData as string) as EmergencyPlanData;
        this.emergencyPlansCache.set(buildingId, parsed);
        return parsed;
      }
    } catch (error) {
      logger.error('Failed to get emergency plan', { buildingId, error });
    }

    return null;
  }

  private async getBuildingFloors(buildingId: string): Promise<Array<{ id: string; name: string }>> {
    // Simplified - would fetch actual floor data
    return [
      { id: 'floor-1', name: 'Ground Floor' },
      { id: 'floor-2', name: 'Second Floor' },
      { id: 'floor-3', name: 'Third Floor' }
    ];
  }

  private async getBuildingData(buildingId: string): Promise<any> {
    // Simplified building data
    return {
      id: buildingId,
      totalFloors: 3,
      totalOccupancy: 200,
      accessibilityFeatures: ['ELEVATORS', 'RAMPS', 'ACCESSIBLE_EXITS']
    };
  }

  private async getBuildingOccupancyCount(buildingId: string): Promise<number> {
    // Simplified occupancy count
    return 150;
  }

  private async getOrganizationBuildings(organizationId: string): Promise<Array<{ id: string; name: string }>> {
    // Simplified buildings list
    return [
      { id: 'building-1', name: 'Main Office' },
      { id: 'building-2', name: 'Warehouse' }
    ];
  }

  private async getBuildingDrills(buildingId: string, period: string): Promise<DrillRecord[]> {
    return this.drillRecordsCache.get(buildingId) || [];
  }

  private async getAllDrills(organizationId: string, period: string): Promise<DrillRecord[]> {
    const allDrills: DrillRecord[] = [];
    for (const drills of this.drillRecordsCache.values()) {
      allDrills.push(...drills);
    }
    return allDrills;
  }

  private analyzeDrillStatistics(drills: DrillRecord[]): {
    totalDrills: number;
    averageScore: number;
    scoreDistribution: Array<{ range: string; count: number }>;
    commonIssues: Array<{ issue: string; frequency: number }>;
  } {
    const scoreDistribution = [
      { range: '90-100', count: 0 },
      { range: '80-89', count: 0 },
      { range: '70-79', count: 0 },
      { range: '60-69', count: 0 },
      { range: 'Below 60', count: 0 }
    ];

    const issueFrequency: Record<string, number> = {};

    for (const drill of drills) {
      // Score distribution
      if (drill.score) {
        if (drill.score >= 90) scoreDistribution[0].count++;
        else if (drill.score >= 80) scoreDistribution[1].count++;
        else if (drill.score >= 70) scoreDistribution[2].count++;
        else if (drill.score >= 60) scoreDistribution[3].count++;
        else scoreDistribution[4].count++;
      }

      // Issue frequency
      for (const issue of drill.issues) {
        issueFrequency[issue.issueType] = (issueFrequency[issue.issueType] || 0) + 1;
      }
    }

    const commonIssues = Object.entries(issueFrequency)
      .map(([issue, frequency]) => ({ issue, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    const averageScore = drills.length > 0 
      ? drills.reduce((sum, drill) => sum + (drill.score || 0), 0) / drills.length
      : 0;

    return {
      totalDrills: drills.length,
      averageScore,
      scoreDistribution,
      commonIssues
    };
  }

  private async saveComplianceReport(organizationId: string, period: string, report: any): Promise<void> {
    try {
      await prisma.emergencyComplianceReport.create({
        data: {
          organizationId,
          reportingPeriod: period,
          reportData: JSON.stringify(report),
          complianceRate: report.summary.complianceRate
        }
      });
    } catch (error) {
      logger.error('Failed to save compliance report', {
        organizationId,
        period,
        error
      });
    }
  }

  private async triggerEmergencyResponse(incident: IncidentReport): Promise<void> {
    // Would trigger appropriate emergency response procedures
    logger.info('Emergency response triggered', {
      incidentId: incident.incidentId,
      severity: incident.severity
    });
  }

  private async generateLessonsLearned(incident: IncidentReport): Promise<string[]> {
    const lessons = [];
    
    if (incident.responseActions.length === 0) {
      lessons.push('Improve initial response procedures and training');
    }
    
    if (incident.injuries && incident.injuries.length > 0) {
      lessons.push('Review safety protocols to prevent similar injuries');
    }
    
    if (incident.damages && incident.damages.length > 0) {
      lessons.push('Consider preventive measures to reduce property damage');
    }
    
    return lessons;
  }

  private async generateFollowUpActions(incident: IncidentReport): Promise<string[]> {
    const actions = [];
    
    actions.push('Conduct incident debrief meeting within 48 hours');
    actions.push('Update emergency procedures based on lessons learned');
    actions.push('Schedule additional training if needed');
    
    if (incident.severity === 'CRITICAL') {
      actions.push('Conduct external safety audit');
    }
    
    return actions;
  }

  private async updateEmergencyPlanFromIncident(incident: IncidentReport): Promise<void> {
    try {
      const plan = await this.getEmergencyPlan(incident.buildingId);
      if (!plan) return;

      // Update plan based on incident learnings
      // This would implement actual plan updates
      
      logger.info('Emergency plan updated based on incident', {
        incidentId: incident.incidentId,
        buildingId: incident.buildingId
      });
    } catch (error) {
      logger.error('Failed to update emergency plan from incident', {
        incidentId: incident.incidentId,
        error
      });
    }
  }

  /**
   * Public API methods
   */
  async getEmergencyPlanForBuilding(buildingId: string): Promise<EmergencyPlanData | null> {
    return this.getEmergencyPlan(buildingId);
  }

  async getActiveAlertsForBuilding(buildingId: string): Promise<EmergencyAlert[]> {
    return this.activeAlertsCache.get(buildingId) || [];
  }

  async getDrillHistoryForBuilding(buildingId: string): Promise<DrillRecord[]> {
    return this.drillRecordsCache.get(buildingId) || [];
  }

  clearCaches(): void {
    this.emergencyPlansCache.clear();
    this.drillRecordsCache.clear();
    this.activeAlertsCache.clear();
    this.incidentReportsCache.clear();
    logger.info('Emergency planning caches cleared');
  }
}