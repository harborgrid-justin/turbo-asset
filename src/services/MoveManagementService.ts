import { prisma } from '../config/database';
import { logger } from '../config/logger';

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
  limit?: number;
  offset?: number;
}

export class MoveManagementService {
  /**
   * Create a new move request
   */
  async createMoveRequest(data: CreateMoveRequestData): Promise<any> {
    try {
      // Validate organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: data.organizationId },
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Validate user exists
      const user = await prisma.user.findFirst({
        where: {
          id: data.requestedById,
          organizationId: data.organizationId,
          isActive: true,
        },
      });

      if (!user) {
        throw new Error('User not found or does not belong to organization');
      }

      // Generate request number
      const requestNumber = await this.generateRequestNumber(data.organizationId);

      // Create move request
      const moveRequest = await prisma.moveRequest.create({
        data: {
          requestNumber,
          moveType: data.moveType,
          requestedById: data.requestedById,
          requestedDate: data.requestedDate,
          urgency: data.urgency || 'NORMAL',
          reason: data.reason,
          description: data.description,
          estimatedCost: data.estimatedCost,
          currency: data.currency || organization.defaultCurrency,
          status: 'PENDING',
        },
        include: {
          requestedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Create move details
      if (data.moveDetails && data.moveDetails.length > 0) {
        await Promise.all(
          data.moveDetails.map(async (detail) => {
            // Validate spaces if provided
            const fromSpace = detail.fromSpaceId
              ? await prisma.space.findFirst({
                  where: {
                    id: detail.fromSpaceId,
                    floor: {
                      building: {
                        property: {
                          organizationId: data.organizationId,
                        },
                      },
                    },
                    isActive: true,
                  },
                })
              : null;

            const toSpace = detail.toSpaceId
              ? await prisma.space.findFirst({
                  where: {
                    id: detail.toSpaceId,
                    floor: {
                      building: {
                        property: {
                          organizationId: data.organizationId,
                        },
                      },
                    },
                    isActive: true,
                  },
                })
              : null;

            // Validate asset if provided
            const asset = detail.assetId
              ? await prisma.asset.findFirst({
                  where: {
                    id: detail.assetId,
                    building: {
                      property: {
                        organizationId: data.organizationId,
                      },
                    },
                    isActive: true,
                  },
                })
              : null;

            return prisma.moveDetail.create({
              data: {
                moveRequestId: moveRequest.id,
                itemType: detail.itemType,
                itemDescription: detail.itemDescription,
                quantity: detail.quantity || 1,
                fromSpaceId: fromSpace?.id,
                fromLocation: detail.fromLocation,
                toSpaceId: toSpace?.id,
                toLocation: detail.toLocation,
                specialInstructions: detail.specialInstructions,
                assetId: asset?.id,
                userId: detail.userId,
              },
            });
          })
        );
      }

      logger.info('Move request created', {
        moveRequestId: moveRequest.id,
        requestNumber: moveRequest.requestNumber,
        organizationId: data.organizationId,
      });

      return this.getMoveRequest(moveRequest.id, data.organizationId);
    } catch (error) {
      logger.error('Failed to create move request', error);
      throw error;
    }
  }

  /**
   * Get move request by ID
   */
  async getMoveRequest(id: string, organizationId: string): Promise<any> {
    try {
      const moveRequest = await prisma.moveRequest.findFirst({
        where: {
          id,
          requestedBy: {
            organizationId,
          },
          isActive: true,
        },
        include: {
          requestedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          moveDetails: {
            include: {
              fromSpace: {
                include: {
                  floor: {
                    include: {
                      building: true,
                    },
                  },
                },
              },
              toSpace: {
                include: {
                  floor: {
                    include: {
                      building: true,
                    },
                  },
                },
              },
              asset: {
                select: {
                  id: true,
                  name: true,
                  assetTag: true,
                },
              },
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          vendors: true,
          costs: true,
        },
      });

      if (!moveRequest) {
        throw new Error('Move request not found');
      }

      return moveRequest;
    } catch (error) {
      logger.error('Failed to get move request', error);
      throw error;
    }
  }

  /**
   * Search move requests
   */
  async searchMoveRequests(query: MoveSearchQuery): Promise<any[]> {
    try {
      const whereClause: any = {
        requestedBy: {
          organizationId: query.organizationId,
        },
        isActive: true,
      };

      if (query.status) {
        whereClause.status = query.status;
      }

      if (query.moveType) {
        whereClause.moveType = query.moveType;
      }

      if (query.requestedById) {
        whereClause.requestedById = query.requestedById;
      }

      if (query.startDate || query.endDate) {
        whereClause.createdAt = {};
        if (query.startDate) {
          whereClause.createdAt.gte = query.startDate;
        }
        if (query.endDate) {
          whereClause.createdAt.lte = query.endDate;
        }
      }

      const moveRequests = await prisma.moveRequest.findMany({
        where: whereClause,
        include: {
          requestedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          moveDetails: {
            include: {
              fromSpace: {
                select: {
                  id: true,
                  name: true,
                },
              },
              toSpace: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              vendors: true,
              costs: true,
            },
          },
        },
        take: query.limit || 50,
        skip: query.offset || 0,
        orderBy: {
          createdAt: 'desc',
        },
      });

      return moveRequests;
    } catch (error) {
      logger.error('Failed to search move requests', error);
      throw error;
    }
  }

  /**
   * Approve or reject move request
   */
  async processMoveRequest(
    id: string,
    organizationId: string,
    approvedById: string,
    action: 'APPROVE' | 'REJECT',
    rejectionReason?: string,
    scheduledDate?: Date
  ): Promise<any> {
    try {
      // Validate move request exists
      const moveRequest = await this.getMoveRequest(id, organizationId);

      if (moveRequest.status !== 'PENDING') {
        throw new Error('Move request is not in pending status');
      }

      // Validate approver
      const approver = await prisma.user.findFirst({
        where: {
          id: approvedById,
          organizationId,
          isActive: true,
          role: {
            in: ['ADMIN', 'MANAGER', 'SUPER_ADMIN'],
          },
        },
      });

      if (!approver) {
        throw new Error('User not authorized to approve move requests');
      }

      const updateData: any = {
        approvedById,
        updatedAt: new Date(),
      };

      if (action === 'APPROVE') {
        updateData.status = 'APPROVED';
        updateData.approvedAt = new Date();
        if (scheduledDate) {
          updateData.scheduledDate = scheduledDate;
        }
      } else {
        updateData.status = 'REJECTED';
        updateData.rejectedAt = new Date();
        updateData.rejectionReason = rejectionReason;
      }

      const updatedMoveRequest = await prisma.moveRequest.update({
        where: { id },
        data: updateData,
      });

      logger.info('Move request processed', {
        moveRequestId: id,
        action,
        approvedById,
        organizationId,
      });

      return this.getMoveRequest(id, organizationId);
    } catch (error) {
      logger.error('Failed to process move request', error);
      throw error;
    }
  }

  /**
   * Add vendor to move request
   */
  async addVendor(
    moveRequestId: string,
    organizationId: string,
    vendorData: MoveVendorData
  ): Promise<any> {
    try {
      // Validate move request exists and belongs to organization
      const moveRequest = await this.getMoveRequest(moveRequestId, organizationId);

      const vendor = await prisma.moveVendor.create({
        data: {
          moveRequestId,
          vendorName: vendorData.vendorName,
          contactInfo: vendorData.contactInfo,
          serviceType: vendorData.serviceType,
          quotedCost: vendorData.quotedCost,
          currency: vendorData.currency || moveRequest.currency,
          notes: vendorData.notes,
        },
      });

      logger.info('Vendor added to move request', {
        moveRequestId,
        vendorId: vendor.id,
        vendorName: vendor.vendorName,
      });

      return vendor;
    } catch (error) {
      logger.error('Failed to add vendor to move request', error);
      throw error;
    }
  }

  /**
   * Select vendor for move request
   */
  async selectVendor(
    moveRequestId: string,
    vendorId: string,
    organizationId: string,
    performanceRating?: number
  ): Promise<any> {
    try {
      // Validate move request exists
      await this.getMoveRequest(moveRequestId, organizationId);

      // Deselect all other vendors for this move request
      await prisma.moveVendor.updateMany({
        where: {
          moveRequestId,
          isSelected: true,
        },
        data: {
          isSelected: false,
        },
      });

      // Select the specified vendor
      const selectedVendor = await prisma.moveVendor.update({
        where: {
          id: vendorId,
          moveRequestId,
        },
        data: {
          isSelected: true,
          performanceRating,
        },
      });

      logger.info('Vendor selected for move request', {
        moveRequestId,
        vendorId,
        vendorName: selectedVendor.vendorName,
      });

      return selectedVendor;
    } catch (error) {
      logger.error('Failed to select vendor', error);
      throw error;
    }
  }

  /**
   * Add cost to move request
   */
  async addCost(
    moveRequestId: string,
    organizationId: string,
    costData: MoveCostData
  ): Promise<any> {
    try {
      // Validate move request exists
      const moveRequest = await this.getMoveRequest(moveRequestId, organizationId);

      const cost = await prisma.moveCost.create({
        data: {
          moveRequestId,
          category: costData.category,
          description: costData.description,
          estimatedCost: costData.estimatedCost,
          actualCost: costData.actualCost,
          currency: costData.currency || moveRequest.currency,
          invoiceNumber: costData.invoiceNumber,
          paidAt: costData.paidAt,
        },
      });

      // Update move request actual cost
      const totalActualCost = await prisma.moveCost.aggregate({
        where: {
          moveRequestId,
          actualCost: { not: null },
        },
        _sum: {
          actualCost: true,
        },
      });

      if (totalActualCost._sum.actualCost) {
        await prisma.moveRequest.update({
          where: { id: moveRequestId },
          data: { actualCost: totalActualCost._sum.actualCost },
        });
      }

      logger.info('Cost added to move request', {
        moveRequestId,
        costId: cost.id,
        category: cost.category,
      });

      return cost;
    } catch (error) {
      logger.error('Failed to add cost to move request', error);
      throw error;
    }
  }

  /**
   * Update move request status
   */
  async updateMoveStatus(
    id: string,
    organizationId: string,
    status: string,
    completedDate?: Date
  ): Promise<any> {
    try {
      // Validate status
      const validStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
      }

      // Validate move request exists
      await this.getMoveRequest(id, organizationId);

      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'COMPLETED' && completedDate) {
        updateData.completedDate = completedDate;
      }

      const updatedMoveRequest = await prisma.moveRequest.update({
        where: { id },
        data: updateData,
      });

      logger.info('Move request status updated', {
        moveRequestId: id,
        newStatus: status,
        organizationId,
      });

      return this.getMoveRequest(id, organizationId);
    } catch (error) {
      logger.error('Failed to update move status', error);
      throw error;
    }
  }

  /**
   * Get move cost analytics
   */
  async getMoveAnalytics(organizationId: string, period?: { start: Date; end: Date }): Promise<any> {
    try {
      const whereClause: any = {
        requestedBy: {
          organizationId,
        },
        isActive: true,
      };

      if (period) {
        whereClause.createdAt = {
          gte: period.start,
          lte: period.end,
        };
      }

      // Get move request statistics
      const moves = await prisma.moveRequest.findMany({
        where: whereClause,
        include: {
          costs: true,
          vendors: {
            where: { isSelected: true },
          },
        },
      });

      const totalMoves = moves.length;
      const completedMoves = moves.filter(m => m.status === 'COMPLETED').length;
      const pendingMoves = moves.filter(m => m.status === 'PENDING').length;
      const inProgressMoves = moves.filter(m => m.status === 'IN_PROGRESS').length;

      // Cost analytics
      const totalEstimatedCost = moves.reduce((sum, m) => sum + (m.estimatedCost || 0), 0);
      const totalActualCost = moves.reduce((sum, m) => sum + (m.actualCost || 0), 0);

      // Cost by category
      const costsByCategory = new Map<string, number>();
      moves.forEach(move => {
        move.costs.forEach(cost => {
          const category = cost.category;
          costsByCategory.set(category, (costsByCategory.get(category) || 0) + (cost.actualCost || 0));
        });
      });

      // Move types distribution
      const moveTypeDistribution = new Map<string, number>();
      moves.forEach(move => {
        moveTypeDistribution.set(
          move.moveType,
          (moveTypeDistribution.get(move.moveType) || 0) + 1
        );
      });

      // Vendor performance
      const vendorPerformance = new Map<string, { count: number; avgRating: number; totalCost: number }>();
      moves.forEach(move => {
        move.vendors.forEach(vendor => {
          if (!vendorPerformance.has(vendor.vendorName)) {
            vendorPerformance.set(vendor.vendorName, { count: 0, avgRating: 0, totalCost: 0 });
          }
          const performance = vendorPerformance.get(vendor.vendorName)!;
          performance.count += 1;
          performance.totalCost += vendor.actualCost || 0;
          if (vendor.performanceRating) {
            performance.avgRating = 
              (performance.avgRating * (performance.count - 1) + vendor.performanceRating) / performance.count;
          }
        });
      });

      return {
        summary: {
          totalMoves,
          completedMoves,
          pendingMoves,
          inProgressMoves,
          completionRate: totalMoves > 0 ? (completedMoves / totalMoves) * 100 : 0,
          totalEstimatedCost,
          totalActualCost,
          costVariance: totalActualCost - totalEstimatedCost,
        },
        costsByCategory: Array.from(costsByCategory.entries()).map(([category, cost]) => ({
          category,
          cost,
        })),
        moveTypeDistribution: Array.from(moveTypeDistribution.entries()).map(([type, count]) => ({
          moveType: type,
          count,
        })),
        vendorPerformance: Array.from(vendorPerformance.entries()).map(([name, data]) => ({
          vendorName: name,
          moveCount: data.count,
          averageRating: Math.round(data.avgRating * 10) / 10,
          totalCost: data.totalCost,
        })),
      };
    } catch (error) {
      logger.error('Failed to get move analytics', error);
      throw error;
    }
  }

  /**
   * Generate unique request number
   */
  private async generateRequestNumber(organizationId: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const datePrefix = `MV${year}${month}${day}`;

    // Count existing requests for today
    const count = await prisma.moveRequest.count({
      where: {
        requestNumber: {
          startsWith: datePrefix,
        },
        requestedBy: {
          organizationId,
        },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${datePrefix}-${sequence}`;
  }
}