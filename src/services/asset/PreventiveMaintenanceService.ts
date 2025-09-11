import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import { workOrderService } from './WorkOrderService';

const prisma = new PrismaClient();

export interface PreventiveMaintenanceData {
  pmNumber?: string;
  title: string;
  description?: string;
  assetId: string;
  frequency: string;
  frequencyValue: number;
  frequencyUnit: string;
  startDate: Date;
  endDate?: Date;
  usageInterval?: number;
  usageUnit?: string;
  assignedTo?: string;
  assignedTeam?: string;
  skillsRequired: string[];
  estimatedHours?: number;
  estimatedCost?: number;
  instructions?: string;
  safetyProcedures?: string;
  toolsRequired: string[];
  partsRequired: string[];
  priority: string;
  criticality: string;
  resourceOptimization?: boolean;
  autoSchedule?: boolean;
  generateWorkOrder?: boolean;
  leadTimeHours?: number;
  organizationId: string;
  createdBy: string;
}

export interface PMScheduleFilters {
  assetId?: string;
  category?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  overdueOnly?: boolean;
  organizationId: string;
}

export interface PMMetrics {
  totalPMTasks: number;
  activePMTasks: number;
  completedThisMonth: number;
  overdueCount: number;
  upcomingCount: number;
  complianceRate: number;
  avgCostPerPM: number;
  preventiveVsCorrectiveRatio: number;
  pmsByFrequency: { [frequency: string]: number };
  pmsByPriority: { [priority: string]: number };
  pmsByCriticality: { [criticality: string]: number };
  assetCoverage: number;
  resourceUtilization: Array<{
    resourceId: string;
    resourceName: string;
    utilization: number;
    scheduledHours: number;
    availableHours: number;
  }>;
}

export interface ResourceOptimizationResult {
  optimizedSchedule: Array<{
    pmId: string;
    pmTitle: string;
    originalDate: Date;
    optimizedDate: Date;
    assignedResource: string;
    estimatedHours: number;
    conflictResolved: boolean;
  }>;
  totalSavings: {
    timesSaved: number; // hours
    costSavings: number; // currency
    resourceEfficiency: number; // percentage improvement
  };
  recommendations: string[];
}

/**
 * PreventiveMaintenanceService - Comprehensive PM scheduling and optimization
 * Handles preventive maintenance scheduling with advanced resource optimization
 * Supports calendar-based, usage-based, and condition-based scheduling
 */
export class PreventiveMaintenanceService {

  /**
   * Create a new preventive maintenance task
   */
  async createPreventiveMaintenance(pmData: PreventiveMaintenanceData): Promise<any> {
    try {
      // Generate PM number if not provided
      if (!pmData.pmNumber) {
        pmData.pmNumber = await this.generatePMNumber(pmData.organizationId);
      }

      // Calculate next due date
      const nextDue = this.calculateNextDueDate(
        pmData.startDate,
        pmData.frequency,
        pmData.frequencyValue,
        pmData.frequencyUnit
      );

      const pm = await prisma.preventiveMaintenance.create({
        data: {
          pmNumber: pmData.pmNumber,
          title: pmData.title,
          description: pmData.description,
          assetId: pmData.assetId,
          frequency: pmData.frequency as any,
          frequencyValue: pmData.frequencyValue,
          frequencyUnit: pmData.frequencyUnit as any,
          startDate: pmData.startDate,
          endDate: pmData.endDate,
          nextDue,
          usageInterval: pmData.usageInterval,
          usageUnit: pmData.usageUnit as any,
          assignedTo: pmData.assignedTo,
          assignedTeam: pmData.assignedTeam,
          skillsRequired: pmData.skillsRequired,
          estimatedHours: pmData.estimatedHours,
          estimatedCost: pmData.estimatedCost,
          instructions: pmData.instructions,
          safetyProcedures: pmData.safetyProcedures,
          toolsRequired: pmData.toolsRequired,
          partsRequired: pmData.partsRequired,
          status: 'ACTIVE',
          priority: pmData.priority as any,
          criticality: pmData.criticality as any,
          resourceOptimization: pmData.resourceOptimization || false,
          autoSchedule: pmData.autoSchedule !== false, // default true
          generateWorkOrder: pmData.generateWorkOrder !== false, // default true
          leadTimeHours: pmData.leadTimeHours,
          organizationId: pmData.organizationId,
          createdBy: pmData.createdBy,
        },
        include: {
          asset: true,
        },
      });

      // Auto-generate initial work order if enabled
      if (pm.generateWorkOrder && pm.autoSchedule) {
        await this.generateWorkOrderForPM(pm.id);
      }

      logger.info('Preventive maintenance task created', { 
        pmId: pm.id, 
        pmNumber: pm.pmNumber,
        assetId: pm.assetId 
      });

      return pm;
    } catch (error) {
      logger.error('Failed to create preventive maintenance task', error);
      throw error;
    }
  }

  /**
   * Get preventive maintenance task by ID
   */
  async getPreventiveMaintenance(pmId: string): Promise<any> {
    try {
      const pm = await prisma.preventiveMaintenance.findUnique({
        where: { id: pmId },
        include: {
          asset: true,
          workOrders: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!pm) {
        throw new Error('Preventive maintenance task not found');
      }

      return pm;
    } catch (error) {
      logger.error('Failed to get preventive maintenance task', { pmId, error });
      throw error;
    }
  }

  /**
   * Search preventive maintenance tasks with filtering
   */
  async searchPMTasks(
    filters: PMScheduleFilters,
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'nextDue',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<{
    pmTasks: any[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const where: any = {
        organizationId: filters.organizationId,
      };

      // Apply filters
      if (filters.assetId) {
        where.assetId = filters.assetId;
      }
      if (filters.category) {
        where.asset = {
          category: filters.category,
        };
      }
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.priority) {
        where.priority = filters.priority;
      }
      if (filters.assignedTo) {
        where.OR = [
          { assignedTo: filters.assignedTo },
          { assignedTeam: filters.assignedTo },
        ];
      }
      if (filters.dueDateFrom && filters.dueDateTo) {
        where.nextDue = {
          gte: filters.dueDateFrom,
          lte: filters.dueDateTo,
        };
      }
      if (filters.overdueOnly) {
        where.nextDue = { lt: new Date() };
        where.status = 'ACTIVE';
      }

      // Get total count
      const totalCount = await prisma.preventiveMaintenance.count({ where });

      // Get PM tasks
      const pmTasks = await prisma.preventiveMaintenance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          asset: {
            select: {
              id: true,
              assetName: true,
              assetTag: true,
              category: true,
              location: true,
            },
          },
          workOrders: {
            where: { status: { in: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] } },
            select: {
              id: true,
              status: true,
              completionDate: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      const totalPages = Math.ceil(totalCount / limit);

      return {
        pmTasks,
        totalCount,
        totalPages,
        currentPage: page,
      };
    } catch (error) {
      logger.error('Failed to search PM tasks', { filters, error });
      throw error;
    }
  }

  /**
   * Generate work order for PM task
   */
  async generateWorkOrderForPM(pmId: string): Promise<any> {
    try {
      const pm = await prisma.preventiveMaintenance.findUnique({
        where: { id: pmId },
        include: { asset: true },
      });

      if (!pm) {
        throw new Error('Preventive maintenance task not found');
      }

      // Calculate scheduled date with lead time
      const scheduledDate = new Date();
      if (pm.leadTimeHours) {
        scheduledDate.setTime(pm.nextDue.getTime() - (pm.leadTimeHours * 60 * 60 * 1000));
      } else {
        scheduledDate.setTime(pm.nextDue.getTime());
      }

      // Create work order
      const workOrder = await workOrderService.createWorkOrder({
        title: `PM: ${pm.title}`,
        description: pm.description || `Preventive maintenance for ${pm.asset?.assetName}`,
        priority: pm.priority,
        type: 'PREVENTIVE',
        category: 'PREVENTIVE_MAINTENANCE',
        assetId: pm.assetId,
        location: pm.asset?.location || 'Unknown',
        building: pm.asset?.building,
        floor: pm.asset?.floor,
        room: pm.asset?.room,
        requestedDate: new Date(),
        scheduledDate,
        dueDate: pm.nextDue,
        assignedTo: pm.assignedTo,
        assignedTeam: pm.assignedTeam,
        estimatedHours: pm.estimatedHours,
        estimatedCost: pm.estimatedCost,
        preventiveMaintenanceId: pmId,
        requiresApproval: false,
        organizationId: pm.organizationId,
        createdBy: 'system',
      });

      // Add tasks if instructions are provided
      if (pm.instructions) {
        const instructions = pm.instructions.split('\n').filter(line => line.trim());
        for (let i = 0; i < instructions.length; i++) {
          await workOrderService.addWorkOrderTask({
            workOrderId: workOrder.id,
            taskNumber: i + 1,
            title: instructions[i],
            priority: 'MEDIUM',
            estimatedHours: pm.estimatedHours ? pm.estimatedHours / instructions.length : undefined,
            skillsRequired: pm.skillsRequired,
            toolsRequired: pm.toolsRequired,
            instructions: instructions[i],
            safetyNotes: pm.safetyProcedures,
          });
        }
      }

      logger.info('Work order generated for PM task', { 
        pmId, 
        workOrderId: workOrder.id,
        scheduledDate 
      });

      return workOrder;
    } catch (error) {
      logger.error('Failed to generate work order for PM task', { pmId, error });
      throw error;
    }
  }

  /**
   * Update PM task after completion
   */
  async completePMTask(pmId: string, completedBy: string, actualCost?: number): Promise<any> {
    try {
      const pm = await prisma.preventiveMaintenance.findUnique({
        where: { id: pmId },
      });

      if (!pm) {
        throw new Error('Preventive maintenance task not found');
      }

      // Calculate next due date
      const nextDue = this.calculateNextDueDate(
        pm.lastPerformed || pm.startDate,
        pm.frequency,
        pm.frequencyValue,
        pm.frequencyUnit
      );

      // Update PM task
      const updatedPM = await prisma.preventiveMaintenance.update({
        where: { id: pmId },
        data: {
          lastPerformed: new Date(),
          nextDue,
          averageCost: actualCost ? this.calculateAverageCost(pm.averageCost, actualCost) : pm.averageCost,
          updatedAt: new Date(),
        },
      });

      // Generate next work order if auto-schedule is enabled
      if (pm.autoSchedule && pm.generateWorkOrder) {
        // Schedule the next work order with appropriate lead time
        setTimeout(async () => {
          try {
            await this.generateWorkOrderForPM(pmId);
          } catch (error) {
            logger.error('Failed to auto-generate next PM work order', { pmId, error });
          }
        }, 1000); // Small delay to ensure transaction completes
      }

      logger.info('PM task completed and next scheduled', { 
        pmId, 
        nextDue,
        actualCost 
      });

      return updatedPM;
    } catch (error) {
      logger.error('Failed to complete PM task', { pmId, error });
      throw error;
    }
  }

  /**
   * Optimize PM scheduling with resource constraints
   */
  async optimizeScheduling(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    resourceConstraints?: {
      maxHoursPerDay?: number;
      availableResources?: string[];
      blackoutDates?: Date[];
    }
  ): Promise<ResourceOptimizationResult> {
    try {
      // Get all active PM tasks due in the period
      const pmTasks = await prisma.preventiveMaintenance.findMany({
        where: {
          organizationId,
          status: 'ACTIVE',
          nextDue: {
            gte: startDate,
            lte: endDate,
          },
          resourceOptimization: true,
        },
        include: {
          asset: {
            select: {
              assetName: true,
              criticality: true,
              location: true,
            },
          },
        },
        orderBy: [
          { criticality: 'desc' },
          { nextDue: 'asc' },
        ],
      });

      // Get current resource assignments
      const existingAssignments = await prisma.workOrder.findMany({
        where: {
          organizationId,
          scheduledDate: {
            gte: startDate,
            lte: endDate,
          },
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
        },
        select: {
          assignedTo: true,
          scheduledDate: true,
          estimatedHours: true,
        },
      });

      // Initialize optimization algorithm
      const optimizedSchedule: ResourceOptimizationResult['optimizedSchedule'] = [];
      const resourceSchedule = new Map<string, Map<string, number>>(); // resource -> date -> hours
      
      // Track existing assignments
      existingAssignments.forEach(assignment => {
        if (assignment.assignedTo && assignment.scheduledDate && assignment.estimatedHours) {
          const dateKey = assignment.scheduledDate.toISOString().split('T')[0];
          if (!resourceSchedule.has(assignment.assignedTo)) {
            resourceSchedule.set(assignment.assignedTo, new Map());
          }
          const resourceDays = resourceSchedule.get(assignment.assignedTo)!;
          resourceDays.set(dateKey, (resourceDays.get(dateKey) || 0) + assignment.estimatedHours);
        }
      });

      // Optimize each PM task
      let totalConflictsResolved = 0;
      let totalHoursSaved = 0;

      for (const pm of pmTasks) {
        const originalDate = pm.nextDue;
        let optimizedDate = originalDate;
        let assignedResource = pm.assignedTo || 'unassigned';
        let conflictResolved = false;

        // Try to find optimal date and resource
        const possibleDates = this.generatePossibleDates(
          originalDate, 
          startDate, 
          endDate,
          resourceConstraints?.blackoutDates
        );

        const availableResources = resourceConstraints?.availableResources || [assignedResource];
        const maxHoursPerDay = resourceConstraints?.maxHoursPerDay || 8;

        outerLoop: for (const date of possibleDates) {
          for (const resource of availableResources) {
            const dateKey = date.toISOString().split('T')[0];
            
            if (!resourceSchedule.has(resource)) {
              resourceSchedule.set(resource, new Map());
            }
            
            const resourceDays = resourceSchedule.get(resource)!;
            const currentHours = resourceDays.get(dateKey) || 0;
            const requiredHours = pm.estimatedHours || 4;

            if (currentHours + requiredHours <= maxHoursPerDay) {
              // Found optimal slot
              optimizedDate = date;
              assignedResource = resource;
              
              // Update resource schedule
              resourceDays.set(dateKey, currentHours + requiredHours);
              
              // Check if this resolved a conflict
              if (date.getTime() !== originalDate.getTime() || resource !== pm.assignedTo) {
                conflictResolved = true;
                totalConflictsResolved++;
                
                // Calculate time savings (if moved earlier)
                if (date.getTime() < originalDate.getTime()) {
                  const daysSaved = Math.ceil((originalDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
                  totalHoursSaved += daysSaved * (requiredHours / 24);
                }
              }
              
              break outerLoop;
            }
          }
        }

        optimizedSchedule.push({
          pmId: pm.id,
          pmTitle: pm.title,
          originalDate,
          optimizedDate,
          assignedResource,
          estimatedHours: pm.estimatedHours || 4,
          conflictResolved,
        });
      }

      // Calculate savings and efficiency
      const totalOriginalCost = pmTasks.reduce((sum, pm) => sum + (pm.estimatedCost || 0), 0);
      const assumedHourlyRate = 50; // configurable
      const costSavings = totalHoursSaved * assumedHourlyRate;
      const resourceEfficiency = totalConflictsResolved / Math.max(pmTasks.length, 1) * 100;

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (totalConflictsResolved > 0) {
        recommendations.push(`Resolved ${totalConflictsResolved} scheduling conflicts through optimization`);
      }
      
      if (totalHoursSaved > 0) {
        recommendations.push(`Saved ${totalHoursSaved.toFixed(1)} hours through better scheduling`);
      }

      const overUtilizedResources = Array.from(resourceSchedule.entries())
        .filter(([_, schedule]) => {
          const maxDailyHours = Math.max(...Array.from(schedule.values()));
          return maxDailyHours > (resourceConstraints?.maxHoursPerDay || 8);
        });

      if (overUtilizedResources.length > 0) {
        recommendations.push(`Consider redistributing work from overloaded resources: ${overUtilizedResources.map(([r]) => r).join(', ')}`);
      }

      const result: ResourceOptimizationResult = {
        optimizedSchedule,
        totalSavings: {
          timesSaved: totalHoursSaved,
          costSavings,
          resourceEfficiency,
        },
        recommendations,
      };

      logger.info('PM scheduling optimization completed', {
        organizationId,
        totalTasks: pmTasks.length,
        conflictsResolved: totalConflictsResolved,
        hoursSaved: totalHoursSaved,
      });

      return result;
    } catch (error) {
      logger.error('Failed to optimize PM scheduling', { organizationId, error });
      throw error;
    }
  }

  /**
   * Get PM metrics and analytics
   */
  async getPMMetrics(organizationId: string): Promise<PMMetrics> {
    try {
      const [
        totalPMTasks,
        activePMTasks,
        completedThisMonth,
        overdueCount,
        upcomingCount,
        pmsByFrequency,
        pmsByPriority,
        pmsByCriticality,
        avgCost,
        preventiveWorkOrders,
        correctiveWorkOrders,
        totalAssets,
        assetsWithPM,
      ] = await Promise.all([
        // Total PM tasks
        prisma.preventiveMaintenance.count({
          where: { organizationId },
        }),

        // Active PM tasks
        prisma.preventiveMaintenance.count({
          where: { organizationId, status: 'ACTIVE' },
        }),

        // Completed this month
        prisma.workOrder.count({
          where: {
            organizationId,
            type: 'PREVENTIVE',
            status: 'COMPLETED',
            completionDate: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),

        // Overdue count
        prisma.preventiveMaintenance.count({
          where: {
            organizationId,
            status: 'ACTIVE',
            nextDue: { lt: new Date() },
          },
        }),

        // Upcoming (next 30 days)
        prisma.preventiveMaintenance.count({
          where: {
            organizationId,
            status: 'ACTIVE',
            nextDue: {
              gte: new Date(),
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),

        // PMs by frequency
        prisma.preventiveMaintenance.groupBy({
          by: ['frequency'],
          where: { organizationId, status: 'ACTIVE' },
          _count: true,
        }),

        // PMs by priority
        prisma.preventiveMaintenance.groupBy({
          by: ['priority'],
          where: { organizationId, status: 'ACTIVE' },
          _count: true,
        }),

        // PMs by criticality
        prisma.preventiveMaintenance.groupBy({
          by: ['criticality'],
          where: { organizationId, status: 'ACTIVE' },
          _count: true,
        }),

        // Average cost per PM
        prisma.preventiveMaintenance.aggregate({
          where: { organizationId, status: 'ACTIVE' },
          _avg: { averageCost: true },
        }),

        // Preventive work orders (last 12 months)
        prisma.workOrder.count({
          where: {
            organizationId,
            type: 'PREVENTIVE',
            createdAt: {
              gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            },
          },
        }),

        // Corrective work orders (last 12 months)
        prisma.workOrder.count({
          where: {
            organizationId,
            type: { in: ['CORRECTIVE', 'EMERGENCY'] },
            createdAt: {
              gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            },
          },
        }),

        // Total assets
        prisma.maintenanceAsset.count({
          where: { organizationId },
        }),

        // Assets with PM
        prisma.maintenanceAsset.count({
          where: {
            organizationId,
            preventiveMaintenance: {
              some: { status: 'ACTIVE' },
            },
          },
        }),
      ]);

      // Process grouped results
      const frequencyBreakdown: { [frequency: string]: number } = {};
      pmsByFrequency.forEach((group) => {
        frequencyBreakdown[group.frequency] = group._count;
      });

      const priorityBreakdown: { [priority: string]: number } = {};
      pmsByPriority.forEach((group) => {
        priorityBreakdown[group.priority] = group._count;
      });

      const criticalityBreakdown: { [criticality: string]: number } = {};
      pmsByCriticality.forEach((group) => {
        criticalityBreakdown[group.criticality] = group._count;
      });

      // Calculate compliance rate
      const complianceRate = activePMTasks > 0 
        ? ((activePMTasks - overdueCount) / activePMTasks) * 100
        : 100;

      // Calculate preventive vs corrective ratio
      const preventiveVsCorrectiveRatio = correctiveWorkOrders > 0 
        ? preventiveWorkOrders / correctiveWorkOrders
        : preventiveWorkOrders;

      // Calculate asset coverage
      const assetCoverage = totalAssets > 0 
        ? (assetsWithPM / totalAssets) * 100
        : 0;

      // Get resource utilization (simplified - would be more complex in real implementation)
      const resourceUtilization = await this.getResourceUtilization(organizationId);

      return {
        totalPMTasks,
        activePMTasks,
        completedThisMonth,
        overdueCount,
        upcomingCount,
        complianceRate,
        avgCostPerPM: avgCost._avg.averageCost || 0,
        preventiveVsCorrectiveRatio,
        pmsByFrequency: frequencyBreakdown,
        pmsByPriority: priorityBreakdown,
        pmsByCriticality: criticalityBreakdown,
        assetCoverage,
        resourceUtilization,
      };
    } catch (error) {
      logger.error('Failed to get PM metrics', { organizationId, error });
      throw error;
    }
  }

  /**
   * Update multiple PM schedules (bulk operation)
   */
  async bulkUpdatePMSchedules(
    pmIds: string[],
    updates: {
      frequency?: string;
      frequencyValue?: number;
      frequencyUnit?: string;
      assignedTo?: string;
      estimatedHours?: number;
      priority?: string;
    },
    organizationId: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      for (const pmId of pmIds) {
        try {
          const updateData: any = { ...updates };
          
          // Recalculate next due date if frequency changed
          if (updates.frequency || updates.frequencyValue || updates.frequencyUnit) {
            const currentPM = await prisma.preventiveMaintenance.findUnique({
              where: { id: pmId },
              select: { lastPerformed: true, startDate: true, frequency: true, frequencyValue: true, frequencyUnit: true },
            });
            
            if (currentPM) {
              updateData.nextDue = this.calculateNextDueDate(
                currentPM.lastPerformed || currentPM.startDate,
                (updates.frequency as any) || currentPM.frequency,
                updates.frequencyValue || currentPM.frequencyValue,
                (updates.frequencyUnit as any) || currentPM.frequencyUnit
              );
            }
          }

          await prisma.preventiveMaintenance.update({
            where: {
              id: pmId,
              organizationId,
            },
            data: updateData,
          });
          
          success++;
        } catch (error) {
          failed++;
          errors.push(`PM ${pmId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      logger.info('Bulk PM update completed', { success, failed, total: pmIds.length });
      return { success, failed, errors };
    } catch (error) {
      logger.error('Failed to perform bulk PM update', { organizationId, error });
      throw error;
    }
  }

  /**
   * Generate PM number
   */
  private async generatePMNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.preventiveMaintenance.count({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });

    return `PM-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * Calculate next due date based on frequency
   */
  private calculateNextDueDate(
    baseDate: Date,
    frequency: string,
    frequencyValue: number,
    frequencyUnit: string
  ): Date {
    const nextDue = new Date(baseDate);

    switch (frequencyUnit) {
      case 'DAYS':
        nextDue.setDate(nextDue.getDate() + frequencyValue);
        break;
      case 'WEEKS':
        nextDue.setDate(nextDue.getDate() + (frequencyValue * 7));
        break;
      case 'MONTHS':
        nextDue.setMonth(nextDue.getMonth() + frequencyValue);
        break;
      case 'QUARTERS':
        nextDue.setMonth(nextDue.getMonth() + (frequencyValue * 3));
        break;
      case 'YEARS':
        nextDue.setFullYear(nextDue.getFullYear() + frequencyValue);
        break;
      default:
        nextDue.setDate(nextDue.getDate() + frequencyValue);
    }

    return nextDue;
  }

  /**
   * Calculate average cost (rolling average)
   */
  private calculateAverageCost(currentAverage: number, newCost: number): number {
    // Simple moving average - in production, you might want to track count of completions
    return (currentAverage * 0.8) + (newCost * 0.2);
  }

  /**
   * Generate possible dates for optimization
   */
  private generatePossibleDates(
    originalDate: Date,
    startDate: Date,
    endDate: Date,
    blackoutDates?: Date[]
  ): Date[] {
    const dates: Date[] = [];
    const blackoutSet = new Set(blackoutDates?.map(d => d.toISOString().split('T')[0]));

    // Generate dates within ±7 days of original date, within bounds
    for (let i = -7; i <= 7; i++) {
      const testDate = new Date(originalDate);
      testDate.setDate(testDate.getDate() + i);
      
      if (testDate >= startDate && testDate <= endDate) {
        const dateKey = testDate.toISOString().split('T')[0];
        if (!blackoutSet.has(dateKey)) {
          dates.push(testDate);
        }
      }
    }

    // Sort by proximity to original date
    dates.sort((a, b) => {
      const aDistance = Math.abs(a.getTime() - originalDate.getTime());
      const bDistance = Math.abs(b.getTime() - originalDate.getTime());
      return aDistance - bDistance;
    });

    return dates;
  }

  /**
   * Get resource utilization data
   */
  private async getResourceUtilization(organizationId: string): Promise<PMMetrics['resourceUtilization']> {
    try {
      const resourceStats = await prisma.preventiveMaintenance.groupBy({
        by: ['assignedTo'],
        where: {
          organizationId,
          status: 'ACTIVE',
          assignedTo: { not: null },
        },
        _sum: { estimatedHours: true },
        _count: true,
      });

      return resourceStats
        .filter(stat => stat.assignedTo)
        .map(stat => {
          const scheduledHours = stat._sum.estimatedHours || 0;
          const availableHours = 40; // Assume 40 hours per week standard
          const utilization = availableHours > 0 ? (scheduledHours / availableHours) * 100 : 0;

          return {
            resourceId: stat.assignedTo!,
            resourceName: stat.assignedTo!, // In real system, lookup actual name
            utilization,
            scheduledHours,
            availableHours,
          };
        });
    } catch (error) {
      logger.error('Failed to get resource utilization', { organizationId, error });
      return [];
    }
  }
}

export const preventiveMaintenanceService = new PreventiveMaintenanceService();