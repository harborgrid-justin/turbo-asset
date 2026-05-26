import { prisma } from '@/config/database';
import { logger } from '@/config/logger';

interface EmergencyPlanData {
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

interface EvacuationRoute {
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

interface AssemblyPoint {
  pointId: string;
  pointName: string;
  location: string;
  coordinates: { lat: number; lng: number };
  capacity: number;
  weatherProtection: boolean;
  accessibleParking: boolean;
  emergencyServices: string[];
}

interface EmergencyContact {
  contactType: 'FIRE_DEPARTMENT' | 'POLICE' | 'MEDICAL' | 'BUILDING_MANAGEMENT' | 'SECURITY';
  contactName: string;
  phoneNumber: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  priority: number;
}

interface FloorWarden {
  wardenId: string;
  employeeId: string;
  floorId: string;
  isPrimary: boolean;
  phoneNumber: string;
  responsibilities: string[];
  trainingDate?: Date;
  certificationExpiry?: Date;
}

interface SpecialNeedsAssistance {
  employeeId: string;
  assistanceType: 'MOBILITY' | 'VISUAL' | 'HEARING' | 'MEDICAL' | 'COGNITIVE';
  description: string;
  assistantId?: string;
  equipmentRequired?: string[];
  evacuationProcedure: string;
}

interface ComplianceRequirement {
  regulationType: 'OSHA' | 'NFPA' | 'LOCAL' | 'STATE' | 'ADA' | 'INTERNATIONAL';
  regulationCode: string;
  description: string;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING_REVIEW';
  lastReviewed?: Date;
  nextReviewDate?: Date;
  correctionActions?: string[];
}

interface DrillRecord {
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

interface DrillIssue {
  issueType: 'ROUTE_BLOCKED' | 'SLOW_EVACUATION' | 'EQUIPMENT_FAILURE' | 'COMMUNICATION_FAILURE' | 'PARTICIPANT_ISSUE';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location?: string;
  correctionAction: string;
  responsible: string;
  deadline?: Date;
}

export class EmergencyPlanningService {
  /**
   * Create or update emergency plan
   */
  async createEmergencyPlan(planData: EmergencyPlanData): Promise<any> {
    try {
      // Validate building exists
      const building = await prisma.building.findUnique({
        where: { id: planData.buildingId },
        include: {
          property: true,
          floors: true,
        },
      });

      if (!building) {
        throw new Error('Building not found');
      }

      // Check if plan already exists
      const existingPlan = await prisma.emergencyPlan.findFirst({
        where: {
          buildingId: planData.buildingId,
          planType: planData.planType,
        },
      });

      let emergencyPlan;

      if (existingPlan) {
        // Update existing plan
        emergencyPlan = await prisma.emergencyPlan.update({
          where: { id: existingPlan.id },
          data: {
            planVersion: planData.planVersion,
            planDocument: planData.planDocument,
            evacuationRoutes: planData.evacuationRoutes,
            assemblyPoints: planData.assemblyPoints,
            emergencyContacts: planData.emergencyContacts,
            floorWardens: planData.floorWardens,
            specialNeeds: planData.specialNeeds,
            complianceRequirements: planData.complianceRequirements,
            lastUpdated: new Date(),
          },
        });
      } else {
        // Create new plan
        emergencyPlan = await prisma.emergencyPlan.create({
          data: {
            buildingId: planData.buildingId,
            planType: planData.planType,
            planVersion: planData.planVersion,
            planDocument: planData.planDocument,
            evacuationRoutes: planData.evacuationRoutes,
            assemblyPoints: planData.assemblyPoints,
            emergencyContacts: planData.emergencyContacts,
            floorWardens: planData.floorWardens,
            specialNeeds: planData.specialNeeds,
            complianceRequirements: planData.complianceRequirements,
            isActive: true,
            createdAt: new Date(),
            lastUpdated: new Date(),
          },
        });
      }

      // Create audit log
      await this.createAuditLog('EMERGENCY_PLAN_CREATED', {
        planId: emergencyPlan.id,
        buildingId: planData.buildingId,
        planType: planData.planType,
        version: planData.planVersion,
      });

      logger.info('Emergency plan created/updated', {
        planId: emergencyPlan.id,
        buildingId: planData.buildingId,
        type: planData.planType,
      });

      return emergencyPlan;
    } catch (error: unknown) {
      logger.error('Failed to create emergency plan', error);
      throw error;
    }
  }

  /**
   * Get emergency plans for building
   */
  async getEmergencyPlans(buildingId: string): Promise<any[]> {
    try {
      const plans = await prisma.emergencyPlan.findMany({
        where: {
          buildingId,
          isActive: true,
        },
        include: {
          building: {
            include: {
              property: true,
            },
          },
        },
        orderBy: { planType: 'asc' },
      });

      return plans;
    } catch (error: unknown) {
      logger.error('Failed to get emergency plans', error);
      throw error;
    }
  }

  /**
   * Schedule and conduct emergency drill
   */
  async scheduleEmergencyDrill(drillData: {
    buildingId: string;
    drillType: string;
    scheduledDate: Date;
    conductedBy: string;
    participants?: string[];
    notes?: string;
  }): Promise<any> {
    try {
      // Generate unique drill ID
      const drillId = `DRILL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const drill = await prisma.emergencyDrill.create({
        data: {
          drillId,
          buildingId: drillData.buildingId,
          drillType: drillData.drillType,
          scheduledDate: drillData.scheduledDate,
          status: 'SCHEDULED',
          conductedBy: drillData.conductedBy,
          participants: drillData.participants || [],
          notes: drillData.notes,
          createdAt: new Date(),
        },
      });

      // Send notifications to floor wardens and building management
      await this.sendDrillNotifications(drill);

      logger.info('Emergency drill scheduled', {
        drillId: drill.drillId,
        buildingId: drillData.buildingId,
        scheduledDate: drillData.scheduledDate,
      });

      return drill;
    } catch (error: unknown) {
      logger.error('Failed to schedule emergency drill', error);
      throw error;
    }
  }

  /**
   * Record drill results
   */
  async recordDrillResults(drillRecord: DrillRecord): Promise<any> {
    try {
      const drill = await prisma.emergencyDrill.findFirst({
        where: { drillId: drillRecord.drillId },
      });

      if (!drill) {
        throw new Error('Emergency drill not found');
      }

      const updatedDrill = await prisma.emergencyDrill.update({
        where: { id: drill.id },
        data: {
          actualDate: drillRecord.actualDate,
          duration: drillRecord.duration,
          participantCount: drillRecord.participantCount,
          completionRate: drillRecord.completionRate,
          issues: drillRecord.issues,
          score: drillRecord.score,
          recommendations: drillRecord.recommendations,
          weather: drillRecord.weather,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Create follow-up actions for issues
      await this.createFollowUpActions(drillRecord.issues, drill.buildingId);

      // Update compliance scores
      await this.updateComplianceScores(drill.buildingId, drillRecord.score || 0);

      return updatedDrill;
    } catch (error: unknown) {
      logger.error('Failed to record drill results', error);
      throw error;
    }
  }

  /**
   * Get compliance dashboard
   */
  async getComplianceDashboard(organizationId: string): Promise<{
    overallScore: number;
    complianceByBuilding: any[];
    upcomingRequirements: any[];
    nonComplianceIssues: any[];
    drillSchedule: any[];
    certificationStatus: any[];
  }> {
    try {
      // Get buildings for organization
      const buildings = await prisma.building.findMany({
        where: {
          property: {
            organizationId,
          },
        },
        include: {
          property: true,
          emergencyPlans: true,
        },
      });

      const buildingIds = buildings.map(b => b.id);

      // Calculate compliance scores
      const complianceByBuilding = await Promise.all(
        buildings.map(async (building) => {
          const score = await this.calculateBuildingComplianceScore(building.id);
          const lastDrill = await this.getLastDrillDate(building.id);
          const nextDrill = await this.getNextScheduledDrill(building.id);

          return {
            buildingId: building.id,
            buildingName: building.name,
            propertyName: building.property.name,
            complianceScore: score,
            lastDrillDate: lastDrill,
            nextDrillDate: nextDrill,
            planCount: building.emergencyPlans.length,
          };
        })
      );

      // Calculate overall score
      const overallScore = complianceByBuilding.length > 0
        ? complianceByBuilding.reduce((sum, b) => sum + b.complianceScore, 0) / complianceByBuilding.length
        : 0;

      // Get upcoming requirements
      const upcomingRequirements = await this.getUpcomingComplianceRequirements(buildingIds);

      // Get non-compliance issues
      const nonComplianceIssues = await this.getNonComplianceIssues(buildingIds);

      // Get drill schedule
      const drillSchedule = await this.getDrillSchedule(buildingIds);

      // Get certification status
      const certificationStatus = await this.getCertificationStatus(buildingIds);

      return {
        overallScore: Math.round(overallScore * 10) / 10,
        complianceByBuilding,
        upcomingRequirements,
        nonComplianceIssues,
        drillSchedule,
        certificationStatus,
      };
    } catch (error: unknown) {
      logger.error('Failed to get compliance dashboard', error);
      throw error;
    }
  }

  /**
   * Generate emergency evacuation report
   */
  async generateEvacuationReport(buildingId: string): Promise<{
    buildingInfo: any;
    occupancyInfo: any;
    evacuationRoutes: any[];
    capacityAnalysis: any;
    recommendations: string[];
    complianceChecks: any[];
  }> {
    try {
      // Get building information
      const building = await prisma.building.findUnique({
        where: { id: buildingId },
        include: {
          property: true,
          floors: {
            include: {
              spaces: {
                include: {
                  department: true,
                },
              },
            },
          },
          emergencyPlans: {
            where: { planType: 'EVACUATION' },
          },
        },
      });

      if (!building) {
        throw new Error('Building not found');
      }

      // Calculate current occupancy
      const occupancyInfo = await this.calculateCurrentOccupancy(buildingId);

      // Analyze evacuation routes
      const evacuationRoutes = building.emergencyPlans.length > 0
        ? building.emergencyPlans[0].evacuationRoutes as any[]
        : [];

      // Perform capacity analysis
      const capacityAnalysis = await this.analyzeEvacuationCapacity(buildingId, evacuationRoutes, occupancyInfo);

      // Generate recommendations
      const recommendations = this.generateEvacuationRecommendations(capacityAnalysis, occupancyInfo);

      // Perform compliance checks
      const complianceChecks = await this.performComplianceChecks(buildingId);

      return {
        buildingInfo: {
          name: building.name,
          address: building.address,
          floors: building.floors.length,
          totalSpaces: building.floors.reduce((sum, floor) => sum + floor.spaces.length, 0),
          totalArea: building.totalArea,
        },
        occupancyInfo,
        evacuationRoutes: evacuationRoutes.map(route => ({
          ...route,
          currentLoad: capacityAnalysis.routeLoads[route.routeId] || 0,
          utilizationRate: (capacityAnalysis.routeLoads[route.routeId] || 0) / route.capacity * 100,
        })),
        capacityAnalysis,
        recommendations,
        complianceChecks,
      };
    } catch (error: unknown) {
      logger.error('Failed to generate evacuation report', error);
      throw error;
    }
  }

  /**
   * Get emergency response procedures
   */
  async getEmergencyResponseProcedures(
    organizationId: string,
    emergencyType?: string
  ): Promise<{
    procedures: any[];
    contacts: any[];
    resources: any[];
    checklists: any[];
  }> {
    try {
      // Get emergency response procedures
      const procedures = await prisma.emergencyProcedure.findMany({
        where: {
          organizationId,
          ...(emergencyType && { emergencyType }),
          isActive: true,
        },
        orderBy: { priority: 'asc' },
      });

      // Get emergency contacts
      const contacts = await prisma.emergencyContact.findMany({
        where: {
          organizationId,
          isActive: true,
        },
        orderBy: { priority: 'asc' },
      });

      // Get emergency resources
      const resources = await prisma.emergencyResource.findMany({
        where: {
          organizationId,
          isActive: true,
        },
      });

      // Get emergency checklists
      const checklists = await prisma.emergencyChecklist.findMany({
        where: {
          organizationId,
          ...(emergencyType && { emergencyType }),
          isActive: true,
        },
      });

      return {
        procedures,
        contacts,
        resources,
        checklists,
      };
    } catch (error: unknown) {
      logger.error('Failed to get emergency response procedures', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private async sendDrillNotifications(drill: any): Promise<void> {
    // Implementation would send notifications to relevant personnel
    logger.info('Drill notifications sent', { drillId: drill.drillId });
  }

  private async createFollowUpActions(issues: DrillIssue[], buildingId: string): Promise<void> {
    for (const issue of issues) {
      if (issue.severity === 'HIGH' || issue.severity === 'CRITICAL') {
        await prisma.emergencyAction.create({
          data: {
            buildingId,
            actionType: 'CORRECTIVE_ACTION',
            description: issue.correctionAction,
            priority: issue.severity,
            responsible: issue.responsible,
            deadline: issue.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
            status: 'OPEN',
            createdAt: new Date(),
          },
        });
      }
    }
  }

  private async updateComplianceScores(buildingId: string, drillScore: number): Promise<void> {
    // Update building compliance score based on drill performance
    await prisma.buildingCompliance.upsert({
      where: { buildingId },
      create: {
        buildingId,
        overallScore: drillScore,
        drillScore,
        lastUpdated: new Date(),
      },
      update: {
        drillScore,
        lastUpdated: new Date(),
      },
    });
  }

  private async calculateBuildingComplianceScore(buildingId: string): Promise<number> {
    // Implementation would calculate compliance score based on various factors
    return 85.5; // Placeholder
  }

  private async getLastDrillDate(buildingId: string): Promise<Date | null> {
    const lastDrill = await prisma.emergencyDrill.findFirst({
      where: {
        buildingId,
        status: 'COMPLETED',
      },
      orderBy: { actualDate: 'desc' },
    });

    return lastDrill?.actualDate || null;
  }

  private async getNextScheduledDrill(buildingId: string): Promise<Date | null> {
    const nextDrill = await prisma.emergencyDrill.findFirst({
      where: {
        buildingId,
        status: 'SCHEDULED',
        scheduledDate: {
          gte: new Date(),
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    return nextDrill?.scheduledDate || null;
  }

  private async getUpcomingComplianceRequirements(buildingIds: string[]): Promise<any[]> {
    // Implementation would get upcoming compliance requirements
    return [];
  }

  private async getNonComplianceIssues(buildingIds: string[]): Promise<any[]> {
    // Implementation would get non-compliance issues
    return [];
  }

  private async getDrillSchedule(buildingIds: string[]): Promise<any[]> {
    return await prisma.emergencyDrill.findMany({
      where: {
        buildingId: { in: buildingIds },
        scheduledDate: {
          gte: new Date(),
        },
      },
      include: {
        building: {
          include: {
            property: true,
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  private async getCertificationStatus(buildingIds: string[]): Promise<any[]> {
    // Implementation would get certification status
    return [];
  }

  private async calculateCurrentOccupancy(buildingId: string): Promise<any> {
    // Implementation would calculate current building occupancy
    return {
      totalCapacity: 1000,
      currentOccupancy: 750,
      occupancyRate: 75,
      peakOccupancy: 950,
      specialNeedsCount: 25,
    };
  }

  private async analyzeEvacuationCapacity(
    buildingId: string,
    evacuationRoutes: any[],
    occupancyInfo: any
  ): Promise<any> {
    // Implementation would analyze evacuation capacity
    const routeLoads: { [key: string]: number } = {};
    
    evacuationRoutes.forEach(route => {
      // Simulate route load calculation
      routeLoads[route.routeId] = Math.floor(occupancyInfo.currentOccupancy / evacuationRoutes.length);
    });

    return {
      routeLoads,
      totalCapacity: evacuationRoutes.reduce((sum, route) => sum + route.capacity, 0),
      currentLoad: occupancyInfo.currentOccupancy,
      utilizationRate: occupancyInfo.currentOccupancy / evacuationRoutes.reduce((sum, route) => sum + route.capacity, 0) * 100,
    };
  }

  private generateEvacuationRecommendations(capacityAnalysis: any, occupancyInfo: any): string[] {
    const recommendations: string[] = [];

    if (capacityAnalysis.utilizationRate > 80) {
      recommendations.push('Consider additional evacuation routes - current capacity utilization is above 80%');
    }

    if (occupancyInfo.specialNeedsCount > 0) {
      recommendations.push(`Ensure adequate assistance for ${occupancyInfo.specialNeedsCount} individuals with special needs`);
    }

    recommendations.push('Conduct regular evacuation drills to maintain preparedness');
    recommendations.push('Verify emergency lighting and signage are functional');

    return recommendations;
  }

  private async performComplianceChecks(buildingId: string): Promise<any[]> {
    // Implementation would perform various compliance checks
    return [
      {
        requirement: 'OSHA Emergency Action Plan',
        status: 'COMPLIANT',
        lastChecked: new Date(),
        nextReview: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
      {
        requirement: 'NFPA 101 Life Safety Code',
        status: 'COMPLIANT',
        lastChecked: new Date(),
        nextReview: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    ];
  }

  private async createAuditLog(action: string, details: any): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action,
        details,
        createdAt: new Date(),
      },
    });
  }
}