import { prisma } from '@/config/database';
import { logger } from '@/config/logger';

interface CreateMoveRequestData {
  organizationId: string;
  requestedById: string;
  moveType: string;
  requestedDate: Date;
  urgency?: string;
  reason?: string;
  description?: string;
  estimatedCost?: number;
  currency?: string;
  moveDetails: CreateMoveDetailData[];
}

interface CreateMoveDetailData {
  itemType: string;
  itemDescription: string;
  quantity?: number;
  fromSpaceId?: string;
  fromLocation?: string;
  toSpaceId?: string;
  toLocation?: string;
  specialInstructions?: string;
  assetId?: string;
  userId?: string;
}

interface MoveVendorData {
  vendorName: string;
  contactInfo: any;
  serviceType: string;
  quotedCost?: number;
  currency?: string;
  notes?: string;
}

interface MoveCostData {
  category: string;
  description: string;
  estimatedCost?: number;
  actualCost?: number;
  currency?: string;
  invoiceNumber?: string;
  paidAt?: Date;
}

interface MoveSearchQuery {
  organizationId: string;
  status?: string;
  moveType?: string;
  requestedById?: string;
  startDate?: Date;
  endDate?: Date;
  buildingIds?: string[];
  departmentIds?: string[];
}

interface MoveExecutionPlan {
  moveRequestId: string;
  phases: Array<{
    phaseNumber: number;
    phaseName: string;
    description: string;
    startDate: Date;
    endDate: Date;
    dependencies?: string[];
    resources: Array<{
      resourceType: 'PERSONNEL' | 'EQUIPMENT' | 'VENDOR';
      resourceId?: string;
      quantity: number;
      duration: number; // hours
    }>;
    tasks: Array<{
      taskName: string;
      description: string;
      assignedTo?: string;
      estimatedDuration: number;
      status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
    }>;
  }>;
  totalDuration: number;
  totalCost: number;
  riskAssessment: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    identifiedRisks: string[];
    mitigationStrategies: string[];
  };
}

/**
 * Move Management Operations Service - Comprehensive move planning and execution
 * 
 * This service manages:
 * - Move request creation and approval workflows
 * - Move planning and scheduling
 * - Vendor management and coordination
 * - Move execution tracking and monitoring
 * - Cost management and billing
 * - Post-move analytics and reporting
 */
export class MoveManagementOperationsService {
  /**
   * Create move request
   */
  async createMoveRequest(data: CreateMoveRequestData): Promise<any> {
    try {
      logger.info('Creating move request', { 
        organizationId: data.organizationId, 
        moveType: data.moveType,
        requestedBy: data.requestedById,
        itemCount: data.moveDetails.length
      });

      // Validate spaces exist
      const allSpaceIds = [
        ...data.moveDetails.map(d => d.fromSpaceId),
        ...data.moveDetails.map(d => d.toSpaceId)
      ].filter(id => id);

      if (allSpaceIds.length > 0) {
        const existingSpaces = await prisma.space.findMany({
          where: { id: { in: allSpaceIds } }
        });
        const existingSpaceIds = new Set(existingSpaces.map(s => s.id));
        
        const invalidSpaceIds = allSpaceIds.filter(id => !existingSpaceIds.has(id));
        if (invalidSpaceIds.length > 0) {
          throw new Error(`Invalid space IDs: ${invalidSpaceIds.join(', ')}`);
        }
      }

      const moveRequest = await prisma.moveRequest.create({
        data: {
          organizationId: data.organizationId,
          requestedById: data.requestedById,
          moveType: data.moveType,
          requestedDate: data.requestedDate,
          urgency: data.urgency || 'MEDIUM',
          reason: data.reason,
          description: data.description,
          estimatedCost: data.estimatedCost,
          currency: data.currency || 'USD',
          status: 'PENDING_APPROVAL',
          createdAt: new Date(),
          moveDetails: {
            create: data.moveDetails.map((detail, index) => ({
              sequenceNumber: index + 1,
              itemType: detail.itemType,
              itemDescription: detail.itemDescription,
              quantity: detail.quantity || 1,
              fromSpaceId: detail.fromSpaceId,
              fromLocation: detail.fromLocation,
              toSpaceId: detail.toSpaceId,
              toLocation: detail.toLocation,
              specialInstructions: detail.specialInstructions,
              assetId: detail.assetId,
              userId: detail.userId,
              status: 'PENDING'
            }))
          }
        },
        include: {
          moveDetails: true,
          requestedBy: true
        }
      });

      // Generate move reference number
      const moveReference = `MV-${moveRequest.createdAt.getFullYear()}-${String(moveRequest.createdAt.getMonth() + 1).padStart(2, '0')}-${String(moveRequest.id).padStart(6, '0')}`;
      
      await prisma.moveRequest.update({
        where: { id: moveRequest.id },
        data: { moveReference }
      });

      logger.info('Move request created successfully', { 
        moveRequestId: moveRequest.id,
        moveReference,
        moveDetails: moveRequest.moveDetails.length
      });

      return { ...moveRequest, moveReference };
    } catch (error: unknown) {
      logger.error('Failed to create move request', error);
      throw error;
    }
  }

  /**
   * Create move execution plan
   */
  async createExecutionPlan(
    moveRequestId: string,
    planData: Omit<MoveExecutionPlan, 'moveRequestId'>
  ): Promise<any> {
    try {
      logger.info('Creating move execution plan', { moveRequestId });

      const moveRequest = await prisma.moveRequest.findUnique({
        where: { id: moveRequestId },
        include: { moveDetails: true }
      });

      if (!moveRequest) {
        throw new Error('Move request not found');
      }

      const executionPlan = await prisma.moveExecutionPlan.create({
        data: {
          moveRequestId,
          phases: planData.phases,
          totalDuration: planData.totalDuration,
          totalCost: planData.totalCost,
          riskAssessment: planData.riskAssessment,
          status: 'DRAFT',
          createdAt: new Date()
        }
      });

      // Update move request status
      await prisma.moveRequest.update({
        where: { id: moveRequestId },
        data: { 
          status: 'PLANNED',
          estimatedCost: planData.totalCost
        }
      });

      logger.info('Move execution plan created successfully', { 
        planId: executionPlan.id,
        phases: planData.phases.length,
        totalDuration: planData.totalDuration
      });

      return executionPlan;
    } catch (error: unknown) {
      logger.error('Failed to create execution plan', error);
      throw error;
    }
  }

  /**
   * Add vendor to move request
   */
  async addMoveVendor(
    moveRequestId: string, 
    vendorData: MoveVendorData
  ): Promise<any> {
    try {
      logger.info('Adding vendor to move request', { moveRequestId, vendorName: vendorData.vendorName });

      const moveVendor = await prisma.moveVendor.create({
        data: {
          moveRequestId,
          vendorName: vendorData.vendorName,
          contactInfo: vendorData.contactInfo,
          serviceType: vendorData.serviceType,
          quotedCost: vendorData.quotedCost,
          currency: vendorData.currency || 'USD',
          notes: vendorData.notes,
          status: 'QUOTED',
          createdAt: new Date()
        }
      });

      logger.info('Vendor added to move request successfully', { vendorId: moveVendor.id });
      return moveVendor;
    } catch (error: unknown) {
      logger.error('Failed to add vendor to move request', error);
      throw error;
    }
  }

  /**
   * Execute move phase
   */
  async executeMovePhase(
    moveRequestId: string,
    phaseNumber: number,
    executionData: {
      startedAt: Date;
      executedBy: string;
      actualResources?: any[];
      notes?: string;
    }
  ): Promise<any> {
    try {
      logger.info('Executing move phase', { moveRequestId, phaseNumber });

      // Get execution plan
      const executionPlan = await prisma.moveExecutionPlan.findFirst({
        where: { moveRequestId }
      });

      if (!executionPlan) {
        throw new Error('Execution plan not found');
      }

      // Update phase status
      const updatedPhases = (executionPlan.phases as any[]).map(phase => {
        if (phase.phaseNumber === phaseNumber) {
          return {
            ...phase,
            status: 'IN_PROGRESS',
            startedAt: executionData.startedAt,
            executedBy: executionData.executedBy,
            actualResources: executionData.actualResources || phase.resources,
            notes: executionData.notes
          };
        }
        return phase;
      });

      await prisma.moveExecutionPlan.update({
        where: { id: executionPlan.id },
        data: { phases: updatedPhases }
      });

      // Update move request status if this is the first phase
      if (phaseNumber === 1) {
        await prisma.moveRequest.update({
          where: { id: moveRequestId },
          data: { 
            status: 'IN_PROGRESS',
            startedAt: executionData.startedAt
          }
        });
      }

      logger.info('Move phase execution started', { phaseNumber });
      return { success: true, phaseNumber, status: 'IN_PROGRESS' };
    } catch (error: unknown) {
      logger.error('Failed to execute move phase', error);
      throw error;
    }
  }

  /**
   * Complete move phase
   */
  async completeMovePhase(
    moveRequestId: string,
    phaseNumber: number,
    completionData: {
      completedAt: Date;
      actualDuration?: number;
      actualCost?: number;
      issues?: string[];
      notes?: string;
    }
  ): Promise<any> {
    try {
      logger.info('Completing move phase', { moveRequestId, phaseNumber });

      const executionPlan = await prisma.moveExecutionPlan.findFirst({
        where: { moveRequestId }
      });

      if (!executionPlan) {
        throw new Error('Execution plan not found');
      }

      // Update phase status
      const updatedPhases = (executionPlan.phases as any[]).map(phase => {
        if (phase.phaseNumber === phaseNumber) {
          return {
            ...phase,
            status: 'COMPLETED',
            completedAt: completionData.completedAt,
            actualDuration: completionData.actualDuration,
            actualCost: completionData.actualCost,
            issues: completionData.issues || [],
            completionNotes: completionData.notes
          };
        }
        return phase;
      });

      await prisma.moveExecutionPlan.update({
        where: { id: executionPlan.id },
        data: { phases: updatedPhases }
      });

      // Check if all phases are completed
      const allCompleted = updatedPhases.every(phase => phase.status === 'COMPLETED');
      
      if (allCompleted) {
        await prisma.moveRequest.update({
          where: { id: moveRequestId },
          data: { 
            status: 'COMPLETED',
            completedAt: completionData.completedAt
          }
        });

        // Update move details status
        await prisma.moveDetail.updateMany({
          where: { moveRequestId },
          data: { status: 'COMPLETED' }
        });

        logger.info('Move request completed successfully', { moveRequestId });
      }

      logger.info('Move phase completed', { phaseNumber });
      return { success: true, phaseNumber, status: 'COMPLETED', moveCompleted: allCompleted };
    } catch (error: unknown) {
      logger.error('Failed to complete move phase', error);
      throw error;
    }
  }

  /**
   * Track move costs
   */
  async trackMoveCosts(
    moveRequestId: string,
    costData: MoveCostData[]
  ): Promise<any> {
    try {
      logger.info('Tracking move costs', { moveRequestId, costEntries: costData.length });

      const moveCosts = await prisma.moveCost.createMany({
        data: costData.map(cost => ({
          moveRequestId,
          category: cost.category,
          description: cost.description,
          estimatedCost: cost.estimatedCost,
          actualCost: cost.actualCost,
          currency: cost.currency || 'USD',
          invoiceNumber: cost.invoiceNumber,
          paidAt: cost.paidAt,
          createdAt: new Date()
        }))
      });

      // Update total cost on move request
      const totalActualCost = costData
        .filter(c => c.actualCost)
        .reduce((sum, c) => sum + (c.actualCost || 0), 0);
      
      if (totalActualCost > 0) {
        await prisma.moveRequest.update({
          where: { id: moveRequestId },
          data: { actualCost: totalActualCost }
        });
      }

      logger.info('Move costs tracked successfully', { costsCreated: moveCosts.count });
      return { success: true, costsTracked: moveCosts.count, totalActualCost };
    } catch (error: unknown) {
      logger.error('Failed to track move costs', error);
      throw error;
    }
  }

  /**
   * Search move requests
   */
  async searchMoveRequests(query: MoveSearchQuery): Promise<any[]> {
    try {
      logger.info('Searching move requests', query);

      const whereClause: any = { organizationId: query.organizationId };

      if (query.status) {
        whereClause.status = query.status;
      }
      
      if (query.moveType) {
        whereClause.moveType = query.moveType;
      }
      
      if (query.requestedById) {
        whereClause.requestedById = query.requestedById;
      }

      if (query.startDate && query.endDate) {
        whereClause.requestedDate = {
          gte: query.startDate,
          lte: query.endDate
        };
      }

      // Filter by building IDs if provided
      if (query.buildingIds && query.buildingIds.length > 0) {
        whereClause.moveDetails = {
          some: {
            OR: [
              { fromSpace: { buildingId: { in: query.buildingIds } } },
              { toSpace: { buildingId: { in: query.buildingIds } } }
            ]
          }
        };
      }

      const moveRequests = await prisma.moveRequest.findMany({
        where: whereClause,
        include: {
          moveDetails: {
            include: {
              fromSpace: { include: { building: true } },
              toSpace: { include: { building: true } }
            }
          },
          requestedBy: true,
          vendors: true,
          costs: true,
          executionPlan: true
        },
        orderBy: { createdAt: 'desc' }
      });

      logger.info('Move requests search completed', { 
        resultsFound: moveRequests.length,
        query: JSON.stringify(query)
      });

      return moveRequests;
    } catch (error: unknown) {
      logger.error('Failed to search move requests', error);
      throw error;
    }
  }

  /**
   * Generate move analytics report
   */
  async generateMoveAnalytics(
    organizationId: string,
    period: { startDate: Date; endDate: Date }
  ): Promise<{
    summary: {
      totalMoves: number;
      completedMoves: number;
      averageDuration: number;
      totalCost: number;
      averageCostPerMove: number;
    };
    byType: { [key: string]: { count: number; averageCost: number; averageDuration: number } };
    byStatus: { [key: string]: number };
    trends: {
      monthlyVolume: { month: string; count: number; cost: number }[];
      costTrends: { category: string; trend: 'INCREASING' | 'DECREASING' | 'STABLE' }[];
    };
    performance: {
      onTimeCompletion: number;
      budgetAdherence: number;
      customerSatisfaction?: number;
    };
  }> {
    try {
      logger.info('Generating move analytics report', { organizationId, period });

      const moveRequests = await prisma.moveRequest.findMany({
        where: {
          organizationId,
          createdAt: {
            gte: period.startDate,
            lte: period.endDate
          }
        },
        include: {
          costs: true,
          executionPlan: true
        }
      });

      // Summary calculations
      const totalMoves = moveRequests.length;
      const completedMoves = moveRequests.filter(m => m.status === 'COMPLETED').length;
      const completedMovesWithDuration = moveRequests.filter(m => 
        m.status === 'COMPLETED' && m.startedAt && m.completedAt
      );
      
      const averageDuration = completedMovesWithDuration.length > 0
        ? completedMovesWithDuration.reduce((sum, m) => {
            const duration = m.completedAt!.getTime() - m.startedAt!.getTime();
            return sum + (duration / (1000 * 60 * 60 * 24)); // Convert to days
          }, 0) / completedMovesWithDuration.length
        : 0;

      const totalCost = moveRequests.reduce((sum, m) => sum + (m.actualCost || m.estimatedCost || 0), 0);
      const averageCostPerMove = totalMoves > 0 ? totalCost / totalMoves : 0;

      // By type analysis
      const byType = moveRequests.reduce((acc, move) => {
        if (!acc[move.moveType]) {
          acc[move.moveType] = { moves: [], costs: [] };
        }
        acc[move.moveType].moves.push(move);
        if (move.actualCost || move.estimatedCost) {
          acc[move.moveType].costs.push(move.actualCost || move.estimatedCost || 0);
        }
        return acc;
      }, {} as any);

      const byTypeFormatted = Object.entries(byType).reduce((acc, [type, data]: [string, any]) => {
        acc[type] = {
          count: data.moves.length,
          averageCost: data.costs.length > 0 ? data.costs.reduce((sum: number, cost: number) => sum + cost, 0) / data.costs.length : 0,
          averageDuration: 0 // Would calculate based on actual durations
        };
        return acc;
      }, {} as any);

      // By status analysis
      const byStatus = moveRequests.reduce((acc, move) => {
        acc[move.status] = (acc[move.status] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      // Monthly trends (simplified)
      const monthlyVolume = this.calculateMonthlyVolume(moveRequests, period);
      
      // Performance metrics
      const onTimeCompletion = this.calculateOnTimeCompletion(moveRequests);
      const budgetAdherence = this.calculateBudgetAdherence(moveRequests);

      const analytics = {
        summary: {
          totalMoves,
          completedMoves,
          averageDuration,
          totalCost,
          averageCostPerMove
        },
        byType: byTypeFormatted,
        byStatus,
        trends: {
          monthlyVolume,
          costTrends: [] // Would be calculated based on historical data
        },
        performance: {
          onTimeCompletion,
          budgetAdherence
        }
      };

      logger.info('Move analytics report generated', { 
        totalMoves,
        completedMoves,
        totalCost: totalCost.toFixed(2)
      });

      return analytics;
    } catch (error: unknown) {
      logger.error('Failed to generate move analytics report', error);
      throw error;
    }
  }

  /**
   * Helper method to calculate monthly volume
   */
  private calculateMonthlyVolume(
    moves: any[], 
    period: { startDate: Date; endDate: Date }
  ): { month: string; count: number; cost: number }[] {
    const monthlyData: { [key: string]: { count: number; cost: number } } = {};

    moves.forEach(move => {
      const monthKey = `${move.createdAt.getFullYear()}-${String(move.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { count: 0, cost: 0 };
      }
      monthlyData[monthKey].count += 1;
      monthlyData[monthKey].cost += move.actualCost || move.estimatedCost || 0;
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      count: data.count,
      cost: data.cost
    }));
  }

  /**
   * Calculate on-time completion percentage
   */
  private calculateOnTimeCompletion(moves: any[]): number {
    const completedMoves = moves.filter(m => 
      m.status === 'COMPLETED' && m.requestedDate && m.completedAt
    );

    if (completedMoves.length === 0) {return 100;}

    const onTime = completedMoves.filter(m => 
      m.completedAt <= m.requestedDate
    ).length;

    return (onTime / completedMoves.length) * 100;
  }

  /**
   * Calculate budget adherence percentage
   */
  private calculateBudgetAdherence(moves: any[]): number {
    const movesWithBudget = moves.filter(m => 
      m.estimatedCost && m.actualCost
    );

    if (movesWithBudget.length === 0) {return 100;}

    const withinBudget = movesWithBudget.filter(m => 
      m.actualCost <= m.estimatedCost * 1.1 // Allow 10% variance
    ).length;

    return (withinBudget / movesWithBudget.length) * 100;
  }
}