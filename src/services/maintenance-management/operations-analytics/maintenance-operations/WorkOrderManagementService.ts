import { prisma } from '@/config/database';
import { logger } from '@/config/logger';

interface WorkOrderData {
  workOrderNumber?: string;
  title: string;
  description?: string;
  priority: string;
  type: string;
  category?: string;
  assetId?: string;
  location: string;
  building?: string;
  floor?: string;
  room?: string;
  requestedDate: Date;
  scheduledDate?: Date;
  dueDate?: Date;
  assignedTo?: string;
  assignedTechnician?: string;
  assignedTeam?: string;
  estimatedHours?: number;
  estimatedCost?: number;
  requiresApproval?: boolean;
  preventiveMaintenanceId?: string;
  parentWorkOrderId?: string;
  organizationId: string;
  createdBy: string;
}

interface WorkOrderExecutionData {
  workOrderId: string;
  executedBy: string;
  startedAt: Date;
  completedAt?: Date;
  actualHours?: number;
  actualCost?: number;
  materialsUsed?: Array<{
    materialId: string;
    quantity: number;
    cost: number;
  }>;
  laborRecords?: Array<{
    technicianId: string;
    hours: number;
    rate: number;
  }>;
  completionNotes?: string;
  qualityCheck?: {
    performedBy: string;
    checkDate: Date;
    rating: number;
    issues: string[];
    approved: boolean;
  };
}

interface MaintenanceScheduleData {
  assetId: string;
  scheduleType: 'PREVENTIVE' | 'PREDICTIVE' | 'CONDITION_BASED';
  frequency: number; // in days
  frequencyUnit: 'DAYS' | 'HOURS' | 'CYCLES';
  lastPerformed?: Date;
  nextDue: Date;
  tasks: Array<{
    taskName: string;
    description: string;
    estimatedHours: number;
    skillsRequired: string[];
    toolsRequired: string[];
    materialsRequired: Array<{
      materialId: string;
      quantity: number;
    }>;
  }>;
  instructions?: string;
  safetyRequirements?: string[];
  organizationId: string;
}

interface MaintenanceAnalytics {
  organizationId: string;
  period: { startDate: Date; endDate: Date };
  summary: {
    totalWorkOrders: number;
    completedWorkOrders: number;
    averageCompletionTime: number;
    onTimeCompletion: number;
    totalMaintenanceCost: number;
    averageCostPerWorkOrder: number;
  };
  efficiency: {
    plannedVsActualHours: number;
    plannedVsActualCost: number;
    firstTimeFixRate: number;
    backlogSize: number;
  };
  assetMetrics: {
    assetUptime: number;
    mtbf: number; // Mean Time Between Failures
    mttr: number; // Mean Time To Repair
    maintenanceCostByAsset: { [assetId: string]: number };
  };
  trends: {
    monthlyWorkOrders: Array<{ month: string; count: number; cost: number }>;
    priorityDistribution: { [priority: string]: number };
    categoryDistribution: { [category: string]: number };
  };
}

/**
 * Work Order Management Service - Comprehensive work order operations and execution
 * 
 * This service manages:
 * - Work order creation, scheduling, and assignment
 * - Work order execution and tracking
 * - Material and labor management
 * - Quality control and approval workflows
 * - Performance analytics and reporting
 */
export class WorkOrderManagementService {
  /**
   * Create work order
   */
  async createWorkOrder(data: WorkOrderData): Promise<any> {
    try {
      logger.info('Creating work order', { 
        organizationId: data.organizationId, 
        title: data.title,
        priority: data.priority,
        type: data.type
      });

      // Generate work order number if not provided
      const workOrderNumber = data.workOrderNumber || await this.generateWorkOrderNumber(data.organizationId);

      // Validate asset if provided
      if (data.assetId) {
        const asset = await prisma.asset.findUnique({
          where: { id: data.assetId }
        });
        
        if (!asset) {
          throw new Error('Asset not found');
        }
      }

      const workOrder = await prisma.workOrder.create({
        data: {
          workOrderNumber,
          title: data.title,
          description: data.description,
          priority: data.priority,
          type: data.type,
          category: data.category,
          assetId: data.assetId,
          location: data.location,
          building: data.building,
          floor: data.floor,
          room: data.room,
          requestedDate: data.requestedDate,
          scheduledDate: data.scheduledDate,
          dueDate: data.dueDate,
          assignedTo: data.assignedTo,
          assignedTechnician: data.assignedTechnician,
          assignedTeam: data.assignedTeam,
          estimatedHours: data.estimatedHours,
          estimatedCost: data.estimatedCost,
          requiresApproval: data.requiresApproval || false,
          preventiveMaintenanceId: data.preventiveMaintenanceId,
          parentWorkOrderId: data.parentWorkOrderId,
          organizationId: data.organizationId,
          createdBy: data.createdBy,
          status: data.requiresApproval ? 'PENDING_APPROVAL' : 'OPEN',
          createdAt: new Date()
        },
        include: {
          asset: true,
          assignedTechnicianUser: true,
          parentWorkOrder: true
        }
      });

      // If this is a preventive maintenance work order, update the PM schedule
      if (data.preventiveMaintenanceId) {
        await this.updatePreventiveMaintenanceSchedule(data.preventiveMaintenanceId);
      }

      logger.info('Work order created successfully', { 
        workOrderId: workOrder.id,
        workOrderNumber: workOrder.workOrderNumber
      });

      return workOrder;
    } catch (error: unknown) {
      logger.error('Failed to create work order', error);
      throw error;
    }
  }

  /**
   * Execute work order
   */
  async executeWorkOrder(data: WorkOrderExecutionData): Promise<any> {
    try {
      logger.info('Executing work order', { workOrderId: data.workOrderId, executedBy: data.executedBy });

      const workOrder = await prisma.workOrder.findUnique({
        where: { id: data.workOrderId }
      });

      if (!workOrder) {
        throw new Error('Work order not found');
      }

      // Update work order status to IN_PROGRESS
      const updatedWorkOrder = await prisma.workOrder.update({
        where: { id: data.workOrderId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: data.startedAt,
          startedBy: data.executedBy
        }
      });

      // Create execution record
      const execution = await prisma.workOrderExecution.create({
        data: {
          workOrderId: data.workOrderId,
          executedBy: data.executedBy,
          startedAt: data.startedAt,
          completedAt: data.completedAt,
          actualHours: data.actualHours,
          actualCost: data.actualCost,
          materialsUsed: data.materialsUsed,
          laborRecords: data.laborRecords,
          completionNotes: data.completionNotes,
          qualityCheck: data.qualityCheck,
          createdAt: new Date()
        }
      });

      // If work order is completed, update status
      if (data.completedAt) {
        await prisma.workOrder.update({
          where: { id: data.workOrderId },
          data: {
            status: data.qualityCheck?.approved ? 'COMPLETED' : 'PENDING_REVIEW',
            completedAt: data.completedAt,
            actualHours: data.actualHours,
            actualCost: data.actualCost
          }
        });

        // Update asset maintenance dates if applicable
        if (workOrder.assetId) {
          await prisma.asset.update({
            where: { id: workOrder.assetId },
            data: {
              lastMaintenanceDate: data.completedAt
            }
          });
        }
      }

      logger.info('Work order execution recorded', { 
        executionId: execution.id,
        status: data.completedAt ? 'COMPLETED' : 'IN_PROGRESS'
      });

      return { workOrder: updatedWorkOrder, execution };
    } catch (error: unknown) {
      logger.error('Failed to execute work order', error);
      throw error;
    }
  }

  /**
   * Generate maintenance analytics
   */
  async generateMaintenanceAnalytics(
    organizationId: string,
    period: { startDate: Date; endDate: Date }
  ): Promise<MaintenanceAnalytics> {
    try {
      logger.info('Generating maintenance analytics', { organizationId, period });

      // Get work orders for the period
      const workOrders = await prisma.workOrder.findMany({
        where: {
          organizationId,
          createdAt: {
            gte: period.startDate,
            lte: period.endDate
          }
        },
        include: {
          asset: true,
          execution: true
        }
      });

      // Calculate summary metrics
      const totalWorkOrders = workOrders.length;
      const completedWorkOrders = workOrders.filter(wo => wo.status === 'COMPLETED').length;
      
      const completedWorkOrdersWithTimes = workOrders.filter(wo => 
        wo.status === 'COMPLETED' && wo.startedAt && wo.completedAt
      );
      
      const averageCompletionTime = completedWorkOrdersWithTimes.length > 0
        ? completedWorkOrdersWithTimes.reduce((sum, wo) => {
            const duration = wo.completedAt!.getTime() - wo.startedAt!.getTime();
            return sum + (duration / (1000 * 60 * 60)); // Convert to hours
          }, 0) / completedWorkOrdersWithTimes.length
        : 0;

      const onTimeWorkOrders = workOrders.filter(wo => 
        wo.status === 'COMPLETED' && wo.dueDate && wo.completedAt && wo.completedAt <= wo.dueDate
      ).length;
      
      const onTimeCompletion = completedWorkOrders > 0 ? (onTimeWorkOrders / completedWorkOrders) * 100 : 0;
      
      const totalMaintenanceCost = workOrders.reduce((sum, wo) => sum + (wo.actualCost || wo.estimatedCost || 0), 0);
      const averageCostPerWorkOrder = totalWorkOrders > 0 ? totalMaintenanceCost / totalWorkOrders : 0;

      // Calculate efficiency metrics
      const workOrdersWithEstimates = workOrders.filter(wo => wo.estimatedHours && wo.actualHours);
      const plannedVsActualHours = workOrdersWithEstimates.length > 0
        ? (workOrdersWithEstimates.reduce((sum, wo) => sum + (wo.estimatedHours! / wo.actualHours!), 0) / workOrdersWithEstimates.length) * 100
        : 100;

      const workOrdersWithCostEstimates = workOrders.filter(wo => wo.estimatedCost && wo.actualCost);
      const plannedVsActualCost = workOrdersWithCostEstimates.length > 0
        ? (workOrdersWithCostEstimates.reduce((sum, wo) => sum + (wo.estimatedCost! / wo.actualCost!), 0) / workOrdersWithCostEstimates.length) * 100
        : 100;

      const firstTimeFixRate = this.calculateFirstTimeFixRate(workOrders);
      const backlogSize = workOrders.filter(wo => ['OPEN', 'IN_PROGRESS', 'PENDING_APPROVAL'].includes(wo.status)).length;

      // Calculate asset metrics
      const assetMetrics = await this.calculateAssetMetrics(organizationId, period);

      // Calculate trends
      const monthlyWorkOrders = this.calculateMonthlyTrends(workOrders, period);
      
      const priorityDistribution = workOrders.reduce((acc, wo) => {
        acc[wo.priority] = (acc[wo.priority] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      const categoryDistribution = workOrders.reduce((acc, wo) => {
        const category = wo.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      const analytics: MaintenanceAnalytics = {
        organizationId,
        period,
        summary: {
          totalWorkOrders,
          completedWorkOrders,
          averageCompletionTime,
          onTimeCompletion,
          totalMaintenanceCost,
          averageCostPerWorkOrder
        },
        efficiency: {
          plannedVsActualHours,
          plannedVsActualCost,
          firstTimeFixRate,
          backlogSize
        },
        assetMetrics,
        trends: {
          monthlyWorkOrders,
          priorityDistribution,
          categoryDistribution
        }
      };

      logger.info('Maintenance analytics generated successfully', {
        totalWorkOrders,
        completedWorkOrders,
        onTimeCompletion: onTimeCompletion.toFixed(2)
      });

      return analytics;
    } catch (error: unknown) {
      logger.error('Failed to generate maintenance analytics', error);
      throw error;
    }
  }

  /**
   * Create maintenance schedule
   */
  async createMaintenanceSchedule(data: MaintenanceScheduleData): Promise<any> {
    try {
      logger.info('Creating maintenance schedule', { 
        assetId: data.assetId,
        scheduleType: data.scheduleType,
        frequency: data.frequency
      });

      const schedule = await prisma.maintenanceSchedule.create({
        data: {
          assetId: data.assetId,
          scheduleType: data.scheduleType,
          frequency: data.frequency,
          frequencyUnit: data.frequencyUnit,
          lastPerformed: data.lastPerformed,
          nextDue: data.nextDue,
          tasks: data.tasks,
          instructions: data.instructions,
          safetyRequirements: data.safetyRequirements,
          organizationId: data.organizationId,
          status: 'ACTIVE',
          createdAt: new Date()
        }
      });

      // Update asset next maintenance date
      await prisma.asset.update({
        where: { id: data.assetId },
        data: {
          nextMaintenanceDate: data.nextDue,
          maintenanceInterval: data.frequency
        }
      });

      logger.info('Maintenance schedule created successfully', { scheduleId: schedule.id });
      return schedule;
    } catch (error: unknown) {
      logger.error('Failed to create maintenance schedule', error);
      throw error;
    }
  }

  /**
   * Generate work order number
   */
  private async generateWorkOrderNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    const lastWorkOrder = await prisma.workOrder.findFirst({
      where: {
        organizationId,
        workOrderNumber: {
          startsWith: `WO-${year}${month}`
        }
      },
      orderBy: { workOrderNumber: 'desc' }
    });

    let sequence = 1;
    if (lastWorkOrder) {
      const lastSequence = parseInt(lastWorkOrder.workOrderNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `WO-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Update preventive maintenance schedule
   */
  private async updatePreventiveMaintenanceSchedule(scheduleId: string): Promise<void> {
    const schedule = await prisma.maintenanceSchedule.findUnique({
      where: { id: scheduleId }
    });

    if (schedule) {
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + schedule.frequency);

      await prisma.maintenanceSchedule.update({
        where: { id: scheduleId },
        data: {
          lastPerformed: new Date(),
          nextDue
        }
      });
    }
  }

  /**
   * Calculate first time fix rate
   */
  private calculateFirstTimeFixRate(workOrders: any[]): number {
    const completedWorkOrders = workOrders.filter(wo => wo.status === 'COMPLETED');
    
    if (completedWorkOrders.length === 0) {return 100;}

    // Count work orders without child work orders (indicating rework)
    const firstTimeFixes = completedWorkOrders.filter(wo => {
      // Check if there are any related work orders that indicate rework
      const hasRework = workOrders.some(relatedWo => 
        relatedWo.parentWorkOrderId === wo.id || 
        (relatedWo.assetId === wo.assetId && relatedWo.createdAt > wo.completedAt)
      );
      return !hasRework;
    });

    return (firstTimeFixes.length / completedWorkOrders.length) * 100;
  }

  /**
   * Calculate asset metrics
   */
  private async calculateAssetMetrics(
    organizationId: string,
    period: { startDate: Date; endDate: Date }
  ): Promise<any> {
    // This would calculate MTBF, MTTR, uptime, etc.
    // Simplified implementation for demo purposes
    return {
      assetUptime: 95.5,
      mtbf: 720, // hours
      mttr: 4.2, // hours
      maintenanceCostByAsset: {}
    };
  }

  /**
   * Calculate monthly trends
   */
  private calculateMonthlyTrends(
    workOrders: any[], 
    period: { startDate: Date; endDate: Date }
  ): Array<{ month: string; count: number; cost: number }> {
    const monthlyData: { [key: string]: { count: number; cost: number } } = {};

    workOrders.forEach(wo => {
      const monthKey = `${wo.createdAt.getFullYear()}-${String(wo.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { count: 0, cost: 0 };
      }
      monthlyData[monthKey].count += 1;
      monthlyData[monthKey].cost += wo.actualCost || wo.estimatedCost || 0;
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      count: data.count,
      cost: data.cost
    }));
  }
}