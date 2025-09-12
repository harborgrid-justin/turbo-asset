import { PrismaClient } from '@prisma/client';
import { logger } from '@/config/logger';

const prisma = new PrismaClient();

export interface InventoryItemData {
  itemNumber?: string;
  itemName: string;
  description?: string;
  category: string;
  subcategory?: string;
  manufacturer?: string;
  model?: string;
  partNumber?: string;
  serialized?: boolean;
  location: string;
  bin?: string;
  warehouse?: string;
  quantityOnHand: number;
  reorderPoint: number;
  reorderQuantity: number;
  minimumStock: number;
  maximumStock: number;
  autoReorder?: boolean;
  unitCost: number;
  unitOfMeasure: string;
  alternateUOM?: string;
  conversionFactor?: number;
  preferredVendorId?: string;
  vendorPartNumber?: string;
  leadTimeDays?: number;
  abcClassification?: string;
  organizationId: string;
  createdBy: string;
}

export interface InventoryTransactionData {
  inventoryItemId: string;
  transactionType: string;
  quantity: number;
  unitCost: number;
  reference?: string;
  notes?: string;
  fromLocation?: string;
  toLocation?: string;
  workOrderId?: string;
  purchaseOrderId?: string;
  vendorId?: string;
  processedBy: string;
}

export interface InventoryFilters {
  category?: string;
  location?: string;
  warehouse?: string;
  status?: string;
  abcClassification?: string;
  lowStock?: boolean;
  needsReorder?: boolean;
  organizationId: string;
}

export interface InventoryMetrics {
  totalItems: number;
  totalValue: number;
  averageValue: number;
  itemsByCategory: { [category: string]: number };
  itemsByStatus: { [status: string]: number };
  itemsByABCClass: { [classification: string]: number };
  stockLevels: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
    overStocked: number;
  };
  reorderAlerts: {
    total: number;
    urgent: number;
    acknowledged: number;
  };
  turnoverMetrics: {
    averageTurnover: number;
    slowMovingItems: number;
    fastMovingItems: number;
  };
  valueByLocation: { [location: string]: number };
  monthlyTransactions: Array<{
    month: string;
    receipts: number;
    issues: number;
    adjustments: number;
  }>;
}

export interface ReorderRecommendation {
  inventoryItemId: string;
  itemName: string;
  currentQuantity: number;
  reorderPoint: number;
  recommendedQuantity: number;
  estimatedCost: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  lastUsageDate?: Date;
  averageMonthlyUsage: number;
  leadTimeDays: number;
  preferredVendor?: string;
  justification: string;
}

export interface StockOptimizationResult {
  optimizedItems: Array<{
    itemId: string;
    itemName: string;
    currentReorderPoint: number;
    optimizedReorderPoint: number;
    currentReorderQuantity: number;
    optimizedReorderQuantity: number;
    expectedSavings: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  totalSavings: number;
  recommendations: string[];
}

/**
 * InventoryService - Comprehensive inventory management system
 * Handles inventory tracking, reorder management, and stock optimization
 * Supports automated reorder points and advanced analytics
 */
export class InventoryService {

  /**
   * Create new inventory item
   */
  async createInventoryItem(itemData: InventoryItemData): Promise<any> {
    try {
      // Generate item number if not provided
      if (!itemData.itemNumber) {
        itemData.itemNumber = await this.generateItemNumber(itemData.organizationId);
      }

      // Calculate initial quantities
      const quantityAvailable = itemData.quantityOnHand - 0; // No reservations initially
      const averageCost = itemData.unitCost;
      const lastCost = itemData.unitCost;

      const inventoryItem = await prisma.inventoryItem.create({
        data: {
          itemNumber: itemData.itemNumber,
          itemName: itemData.itemName,
          description: itemData.description,
          category: itemData.category as any,
          subcategory: itemData.subcategory,
          manufacturer: itemData.manufacturer,
          model: itemData.model,
          partNumber: itemData.partNumber,
          serialized: itemData.serialized || false,
          location: itemData.location,
          bin: itemData.bin,
          warehouse: itemData.warehouse,
          quantityOnHand: itemData.quantityOnHand,
          quantityReserved: 0,
          quantityAvailable,
          reorderPoint: itemData.reorderPoint,
          reorderQuantity: itemData.reorderQuantity,
          minimumStock: itemData.minimumStock,
          maximumStock: itemData.maximumStock,
          autoReorder: itemData.autoReorder || false,
          unitCost: itemData.unitCost,
          averageCost,
          lastCost,
          unitOfMeasure: itemData.unitOfMeasure,
          alternateUOM: itemData.alternateUOM,
          conversionFactor: itemData.conversionFactor,
          preferredVendorId: itemData.preferredVendorId,
          vendorPartNumber: itemData.vendorPartNumber,
          leadTimeDays: itemData.leadTimeDays,
          status: 'ACTIVE',
          lastCountDate: new Date(),
          abcClassification: itemData.abcClassification as any,
          organizationId: itemData.organizationId,
          createdBy: itemData.createdBy,
        },
      });

      // Create initial receipt transaction
      if (itemData.quantityOnHand > 0) {
        await this.createTransaction({
          inventoryItemId: inventoryItem.id,
          transactionType: 'RECEIPT',
          quantity: itemData.quantityOnHand,
          unitCost: itemData.unitCost,
          reference: 'INITIAL_STOCK',
          notes: 'Initial inventory setup',
          processedBy: itemData.createdBy,
        });
      }

      logger.info('Inventory item created', { 
        itemId: inventoryItem.id,
        itemNumber: inventoryItem.itemNumber 
      });

      return inventoryItem;
    } catch (error: unknown) {
      logger.error('Failed to create inventory item', error);
      throw error;
    }
  }

  /**
   * Create inventory transaction
   */
  async createTransaction(transactionData: InventoryTransactionData): Promise<any> {
    try {
      // Generate transaction number
      const transactionNumber = await this.generateTransactionNumber();

      // Get current item quantities
      const item = await prisma.inventoryItem.findUnique({
        where: { id: transactionData.inventoryItemId },
        select: { quantityOnHand: true, quantityReserved: true, averageCost: true },
      });

      if (!item) {
        throw new Error('Inventory item not found');
      }

      const quantityBefore = item.quantityOnHand;
      let quantityAfter = quantityBefore;
      const totalCost = transactionData.quantity * transactionData.unitCost;

      // Calculate quantity changes based on transaction type
      switch (transactionData.transactionType) {
        case 'RECEIPT':
          quantityAfter += transactionData.quantity;
          break;
        case 'ISSUE':
          quantityAfter -= transactionData.quantity;
          break;
        case 'TRANSFER':
          // For transfers, quantity stays same but location changes
          break;
        case 'ADJUSTMENT':
          quantityAfter = transactionData.quantity; // Absolute quantity
          break;
        case 'RETURN':
          quantityAfter += transactionData.quantity;
          break;
        case 'CYCLE_COUNT':
          quantityAfter = transactionData.quantity; // Absolute quantity
          break;
        case 'WRITE_OFF':
          quantityAfter -= transactionData.quantity;
          break;
        default:
          throw new Error(`Unsupported transaction type: ${transactionData.transactionType}`);
      }

      // Validate sufficient quantity for outbound transactions
      if (['ISSUE', 'WRITE_OFF'].includes(transactionData.transactionType) && quantityAfter < 0) {
        throw new Error('Insufficient inventory quantity');
      }

      // Create transaction record
      const transaction = await prisma.inventoryTransaction.create({
        data: {
          transactionNumber,
          inventoryItemId: transactionData.inventoryItemId,
          transactionType: transactionData.transactionType as any,
          quantity: transactionData.quantity,
          unitCost: transactionData.unitCost,
          totalCost,
          reference: transactionData.reference,
          notes: transactionData.notes,
          quantityBefore,
          quantityAfter,
          fromLocation: transactionData.fromLocation,
          toLocation: transactionData.toLocation,
          workOrderId: transactionData.workOrderId,
          purchaseOrderId: transactionData.purchaseOrderId,
          vendorId: transactionData.vendorId,
          processedBy: transactionData.processedBy,
        },
      });

      // Update item quantities and average cost
      const newAverageCost = this.calculateWeightedAverageCost(
        item.averageCost,
        quantityBefore,
        transactionData.unitCost,
        transactionData.transactionType === 'RECEIPT' ? transactionData.quantity : 0
      );

      await prisma.inventoryItem.update({
        where: { id: transactionData.inventoryItemId },
        data: {
          quantityOnHand: quantityAfter,
          quantityAvailable: Math.max(0, quantityAfter - item.quantityReserved),
          averageCost: newAverageCost,
          lastCost: transactionData.unitCost,
          lastUsedDate: ['ISSUE', 'TRANSFER'].includes(transactionData.transactionType) 
            ? new Date() 
            : undefined,
        },
      });

      // Check for reorder alerts
      await this.checkReorderAlert(transactionData.inventoryItemId);

      logger.info('Inventory transaction created', {
        transactionId: transaction.id,
        transactionNumber: transaction.transactionNumber,
        type: transactionData.transactionType,
        quantity: transactionData.quantity,
      });

      return transaction;
    } catch (error: unknown) {
      logger.error('Failed to create inventory transaction', error);
      throw error;
    }
  }

  /**
   * Search inventory items with filtering
   */
  async searchInventoryItems(
    filters: InventoryFilters,
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'itemName',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<{
    items: any[];
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
      if (filters.category) {
        where.category = filters.category;
      }
      if (filters.location) {
        where.location = { contains: filters.location, mode: 'insensitive' };
      }
      if (filters.warehouse) {
        where.warehouse = filters.warehouse;
      }
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.abcClassification) {
        where.abcClassification = filters.abcClassification;
      }
      if (filters.lowStock) {
        where.quantityOnHand = { lte: prisma.inventoryItem.fields.reorderPoint };
      }
      if (filters.needsReorder) {
        where.quantityOnHand = { lte: prisma.inventoryItem.fields.reorderPoint };
        where.autoReorder = true;
      }

      // Get total count
      const totalCount = await prisma.inventoryItem.count({ where });

      // Get items
      const items = await prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          transactions: {
            orderBy: { transactionDate: 'desc' },
            take: 5,
          },
          reorderAlerts: {
            where: { status: 'OPEN' },
            take: 1,
          },
          _count: {
            select: {
              transactions: true,
              workOrderMaterials: true,
            },
          },
        },
      });

      const totalPages = Math.ceil(totalCount / limit);

      return {
        items,
        totalCount,
        totalPages,
        currentPage: page,
      };
    } catch (error: unknown) {
      logger.error('Failed to search inventory items', { filters, error });
      throw error;
    }
  }

  /**
   * Get inventory metrics and analytics
   */
  async getInventoryMetrics(organizationId: string): Promise<InventoryMetrics> {
    try {
      const [
        totalItems,
        itemsByCategory,
        itemsByStatus,
        itemsByABCClass,
        totalValue,
        lowStockItems,
        outOfStockItems,
        overStockedItems,
        reorderAlerts,
        transactions,
        valueByLocation,
      ] = await Promise.all([
        // Total items
        prisma.inventoryItem.count({
          where: { organizationId },
        }),

        // Items by category
        prisma.inventoryItem.groupBy({
          by: ['category'],
          where: { organizationId },
          _count: true,
        }),

        // Items by status
        prisma.inventoryItem.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),

        // Items by ABC classification
        prisma.inventoryItem.groupBy({
          by: ['abcClassification'],
          where: { organizationId, abcClassification: { not: null } },
          _count: true,
        }),

        // Total inventory value
        prisma.inventoryItem.aggregate({
          where: { organizationId },
          _sum: {
            // Calculate as quantity * average cost (approximation)
            // In real system, you'd have a calculated field or compute this properly
            averageCost: true,
          },
        }),

        // Low stock items
        prisma.$queryRaw`
          SELECT COUNT(*) as count 
          FROM inventory_items 
          WHERE organization_id = ${organizationId} 
          AND quantity_on_hand <= reorder_point
        `,

        // Out of stock items
        prisma.inventoryItem.count({
          where: { organizationId, quantityOnHand: { lte: 0 } },
        }),

        // Over stocked items
        prisma.$queryRaw`
          SELECT COUNT(*) as count 
          FROM inventory_items 
          WHERE organization_id = ${organizationId} 
          AND quantity_on_hand > maximum_stock
        `,

        // Reorder alerts
        prisma.reorderAlert.groupBy({
          by: ['status'],
          where: {
            inventoryItem: { organizationId },
          },
          _count: true,
        }),

        // Recent transactions for turnover analysis
        prisma.inventoryTransaction.findMany({
          where: {
            inventoryItem: { organizationId },
            transactionDate: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
            },
          },
          include: {
            inventoryItem: {
              select: { id: true, itemName: true },
            },
          },
        }),

        // Value by location
        prisma.inventoryItem.groupBy({
          by: ['location'],
          where: { organizationId },
          _sum: { averageCost: true },
          _count: true,
        }),
      ]);

      // Process grouped results
      const categoryBreakdown: { [category: string]: number } = {};
      itemsByCategory.forEach((group) => {
        categoryBreakdown[group.category] = group._count;
      });

      const statusBreakdown: { [status: string]: number } = {};
      itemsByStatus.forEach((group) => {
        statusBreakdown[group.status] = group._count;
      });

      const abcBreakdown: { [classification: string]: number } = {};
      itemsByABCClass.forEach((group) => {
        if (group.abcClassification) {
          abcBreakdown[group.abcClassification] = group._count;
        }
      });

      const reorderAlertBreakdown: { [status: string]: number } = {};
      reorderAlerts.forEach((group) => {
        reorderAlertBreakdown[group.status] = group._count;
      });

      const locationValueBreakdown: { [location: string]: number } = {};
      valueByLocation.forEach((group) => {
        locationValueBreakdown[group.location] = group._sum.averageCost || 0;
      });

      // Calculate turnover metrics
      const transactionItemCounts = new Map<string, number>();
      transactions.forEach(trans => {
        if (trans.transactionType === 'ISSUE') {
          const count = transactionItemCounts.get(trans.inventoryItemId) || 0;
          transactionItemCounts.set(trans.inventoryItemId, count + 1);
        }
      });

      const turnoverCounts = Array.from(transactionItemCounts.values());
      const averageTurnover = turnoverCounts.length > 0 
        ? turnoverCounts.reduce((sum, count) => sum + count, 0) / turnoverCounts.length
        : 0;

      const slowMovingItems = turnoverCounts.filter(count => count <= 2).length;
      const fastMovingItems = turnoverCounts.filter(count => count >= 10).length;

      // Generate monthly transaction trends (last 6 months)
      const monthlyTransactions: InventoryMetrics['monthlyTransactions'] = [];
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        
        const monthTransactions = transactions.filter(t => 
          t.transactionDate >= monthStart && t.transactionDate <= monthEnd
        );

        monthlyTransactions.push({
          month: monthStart.toISOString().substring(0, 7),
          receipts: monthTransactions.filter(t => t.transactionType === 'RECEIPT').length,
          issues: monthTransactions.filter(t => t.transactionType === 'ISSUE').length,
          adjustments: monthTransactions.filter(t => t.transactionType === 'ADJUSTMENT').length,
        });
      }

      return {
        totalItems,
        totalValue: totalValue._sum.averageCost || 0, // Approximation
        averageValue: totalItems > 0 ? (totalValue._sum.averageCost || 0) / totalItems : 0,
        itemsByCategory: categoryBreakdown,
        itemsByStatus: statusBreakdown,
        itemsByABCClass: abcBreakdown,
        stockLevels: {
          inStock: totalItems - outOfStockItems,
          lowStock: (lowStockItems as any)[0]?.count || 0,
          outOfStock: outOfStockItems,
          overStocked: (overStockedItems as any)[0]?.count || 0,
        },
        reorderAlerts: {
          total: Object.values(reorderAlertBreakdown).reduce((sum, count) => sum + count, 0),
          urgent: reorderAlertBreakdown['BELOW_MINIMUM'] || 0,
          acknowledged: reorderAlertBreakdown['IN_PROGRESS'] || 0,
        },
        turnoverMetrics: {
          averageTurnover,
          slowMovingItems,
          fastMovingItems,
        },
        valueByLocation: locationValueBreakdown,
        monthlyTransactions,
      };
    } catch (error: unknown) {
      logger.error('Failed to get inventory metrics', { organizationId, error });
      throw error;
    }
  }

  /**
   * Generate reorder recommendations
   */
  async generateReorderRecommendations(
    organizationId: string,
    includeAutoReorderOnly: boolean = false
  ): Promise<ReorderRecommendation[]> {
    try {
      const where: any = {
        organizationId,
        status: 'ACTIVE',
      };

      if (includeAutoReorderOnly) {
        where.autoReorder = true;
      }

      // Get items that need reordering or are below reorder point
      const items = await prisma.$queryRaw<any[]>`
        SELECT i.*, 
          CASE 
            WHEN i.quantity_on_hand <= 0 THEN 'HIGH'
            WHEN i.quantity_on_hand <= i.minimum_stock THEN 'HIGH'
            WHEN i.quantity_on_hand <= i.reorder_point THEN 'MEDIUM'
            ELSE 'LOW'
          END as priority
        FROM inventory_items i
        WHERE i.organization_id = ${organizationId}
        AND i.status = 'ACTIVE'
        AND i.quantity_on_hand <= i.reorder_point
        ${includeAutoReorderOnly ? 'AND i.auto_reorder = true' : ''}
        ORDER BY priority, i.quantity_on_hand
      `;

      const recommendations: ReorderRecommendation[] = [];

      for (const item of items) {
        // Calculate average monthly usage (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const usageTransactions = await prisma.inventoryTransaction.findMany({
          where: {
            inventoryItemId: item.id,
            transactionType: 'ISSUE',
            transactionDate: { gte: sixMonthsAgo },
          },
          select: { quantity: true, transactionDate: true },
        });

        const totalUsage = usageTransactions.reduce((sum, trans) => sum + trans.quantity, 0);
        const averageMonthlyUsage = totalUsage / 6;

        // Calculate recommended quantity considering lead time and safety stock
        const leadTimeDays = item.leadTimeDays || 14;
        const safetyStock = Math.ceil(averageMonthlyUsage * 0.25); // 25% safety stock
        const leadTimeDemand = Math.ceil((averageMonthlyUsage / 30) * leadTimeDays);
        
        let recommendedQuantity = Math.max(
          item.reorderQuantity || 0,
          leadTimeDemand + safetyStock
        );

        // Don't exceed maximum stock level
        if (item.maximumStock > 0) {
          recommendedQuantity = Math.min(recommendedQuantity, item.maximumStock - item.quantityOnHand);
        }

        const estimatedCost = recommendedQuantity * item.unitCost;
        
        // Get last usage date
        const lastUsage = usageTransactions.length > 0 
          ? usageTransactions.sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime())[0]
          : null;

        // Generate justification
        let justification = '';
        if (item.quantityOnHand <= 0) {
          justification = 'Item is out of stock - immediate reorder required';
        } else if (item.quantityOnHand <= item.minimumStock) {
          justification = 'Below minimum stock level - high priority reorder';
        } else {
          justification = 'Below reorder point - normal reorder process';
        }

        recommendations.push({
          inventoryItemId: item.id,
          itemName: item.itemName,
          currentQuantity: item.quantityOnHand,
          reorderPoint: item.reorderPoint,
          recommendedQuantity,
          estimatedCost,
          priority: item.priority,
          lastUsageDate: lastUsage?.transactionDate,
          averageMonthlyUsage,
          leadTimeDays,
          preferredVendor: item.preferredVendorId, // Would lookup actual vendor name
          justification,
        });
      }

      logger.info('Reorder recommendations generated', {
        organizationId,
        totalRecommendations: recommendations.length,
        highPriority: recommendations.filter(r => r.priority === 'HIGH').length,
      });

      return recommendations;
    } catch (error: unknown) {
      logger.error('Failed to generate reorder recommendations', { organizationId, error });
      throw error;
    }
  }

  /**
   * Optimize stock levels using usage analytics
   */
  async optimizeStockLevels(
    organizationId: string,
    analysisMonths: number = 12
  ): Promise<StockOptimizationResult> {
    try {
      const analysisStartDate = new Date();
      analysisStartDate.setMonth(analysisStartDate.getMonth() - analysisMonths);

      // Get active inventory items with transaction history
      const items = await prisma.inventoryItem.findMany({
        where: {
          organizationId,
          status: 'ACTIVE',
        },
        include: {
          transactions: {
            where: {
              transactionType: 'ISSUE',
              transactionDate: { gte: analysisStartDate },
            },
            orderBy: { transactionDate: 'desc' },
          },
        },
      });

      const optimizedItems: StockOptimizationResult['optimizedItems'] = [];
      let totalSavings = 0;
      const recommendations: string[] = [];

      for (const item of items) {
        if (item.transactions.length < 3) {continue;} // Need minimum transaction history

        // Calculate usage statistics
        const monthlyUsage = this.calculateMonthlyUsage(item.transactions, analysisMonths);
        const averageMonthlyUsage = monthlyUsage.reduce((sum, usage) => sum + usage, 0) / monthlyUsage.length;
        const usageVariability = this.calculateVariabilityIndex(monthlyUsage);

        // Calculate optimal reorder point using statistical methods
        const leadTimeDays = item.leadTimeDays || 14;
        const leadTimeMonths = leadTimeDays / 30;
        const leadTimeDemand = averageMonthlyUsage * leadTimeMonths;
        
        // Safety stock based on variability
        const serviceLevel = 0.95; // 95% service level
        const zScore = 1.645; // Z-score for 95% service level
        const leadTimeVariance = usageVariability * leadTimeMonths;
        const safetyStock = zScore * Math.sqrt(leadTimeVariance);
        
        const optimizedReorderPoint = Math.ceil(leadTimeDemand + safetyStock);

        // Calculate optimal order quantity using Economic Order Quantity (EOQ) principles
        const annualUsage = averageMonthlyUsage * 12;
        const orderingCost = 50; // Assumed ordering cost
        const carryingCostRate = 0.25; // 25% of item cost per year
        const carryingCost = item.unitCost * carryingCostRate;
        
        const eoq = Math.sqrt((2 * annualUsage * orderingCost) / carryingCost);
        const optimizedReorderQuantity = Math.max(Math.ceil(eoq), item.minimumStock || 0);

        // Calculate potential savings
        const currentCarryingCost = (item.reorderQuantity / 2) * carryingCost;
        const optimizedCarryingCost = (optimizedReorderQuantity / 2) * carryingCost;
        const annualSavings = Math.max(0, currentCarryingCost - optimizedCarryingCost);

        // Assess risk level
        let riskLevel: StockOptimizationResult['optimizedItems'][0]['riskLevel'] = 'LOW';
        if (optimizedReorderPoint < item.reorderPoint * 0.8) {
          riskLevel = 'HIGH';
        } else if (optimizedReorderPoint < item.reorderPoint * 0.9) {
          riskLevel = 'MEDIUM';
        }

        // Only include items with significant changes
        const reorderPointChange = Math.abs(optimizedReorderPoint - item.reorderPoint) / item.reorderPoint;
        const reorderQuantityChange = Math.abs(optimizedReorderQuantity - (item.reorderQuantity || 0)) / (item.reorderQuantity || 1);

        if (reorderPointChange > 0.1 || reorderQuantityChange > 0.1 || annualSavings > 10) {
          optimizedItems.push({
            itemId: item.id,
            itemName: item.itemName,
            currentReorderPoint: item.reorderPoint,
            optimizedReorderPoint,
            currentReorderQuantity: item.reorderQuantity || 0,
            optimizedReorderQuantity,
            expectedSavings: annualSavings,
            riskLevel,
          });

          totalSavings += annualSavings;
        }
      }

      // Generate recommendations
      if (optimizedItems.length > 0) {
        recommendations.push(`Analyzed ${items.length} items, found optimization opportunities for ${optimizedItems.length} items`);
      }

      const highRiskItems = optimizedItems.filter(item => item.riskLevel === 'HIGH').length;
      if (highRiskItems > 0) {
        recommendations.push(`${highRiskItems} items have high-risk optimizations - review carefully before implementing`);
      }

      const totalPotentialSavings = optimizedItems.reduce((sum, item) => sum + item.expectedSavings, 0);
      if (totalPotentialSavings > 1000) {
        recommendations.push(`Implementing all optimizations could save approximately $${totalPotentialSavings.toLocaleString()} annually`);
      }

      const result: StockOptimizationResult = {
        optimizedItems: optimizedItems.sort((a, b) => b.expectedSavings - a.expectedSavings),
        totalSavings,
        recommendations,
      };

      logger.info('Stock level optimization completed', {
        organizationId,
        itemsAnalyzed: items.length,
        optimizationOpportunities: optimizedItems.length,
        potentialSavings: totalSavings,
      });

      return result;
    } catch (error: unknown) {
      logger.error('Failed to optimize stock levels', { organizationId, error });
      throw error;
    }
  }

  /**
   * Process automatic reorders
   */
  async processAutoReorders(organizationId: string): Promise<{
    processed: number;
    created: number;
    errors: string[];
  }> {
    let processed = 0;
    let created = 0;
    const errors: string[] = [];

    try {
      // Get items that need automatic reordering
      const itemsToReorder = await prisma.inventoryItem.findMany({
        where: {
          organizationId,
          autoReorder: true,
          status: 'ACTIVE',
          // Use raw query condition for quantity check
        },
      });

      // Filter items that actually need reordering
      const filtered = itemsToReorder.filter(item => item.quantityOnHand <= item.reorderPoint);

      for (const item of filtered) {
        processed++;

        try {
          // Check if there's already an open reorder alert
          const existingAlert = await prisma.reorderAlert.findFirst({
            where: {
              inventoryItemId: item.id,
              status: 'OPEN',
            },
          });

          if (!existingAlert) {
            // Create reorder alert
            await prisma.reorderAlert.create({
              data: {
                inventoryItemId: item.id,
                alertType: item.quantityOnHand <= 0 ? 'STOCKOUT' : 'AT_REORDER_POINT',
                currentQuantity: item.quantityOnHand,
                reorderPoint: item.reorderPoint,
                reorderQuantity: item.reorderQuantity,
                status: 'OPEN',
              },
            });

            created++;
            
            logger.info('Auto reorder alert created', {
              itemId: item.id,
              itemName: item.itemName,
              currentQuantity: item.quantityOnHand,
              reorderPoint: item.reorderPoint,
            });
          }
        } catch (error: unknown) {
          errors.push(`Item ${item.itemName}: ${error instanceof Error ? (error as Error).message : 'Unknown error'}`);
        }
      }

      logger.info('Auto reorder processing completed', {
        organizationId,
        processed,
        created,
        errors: errors.length,
      });

      return { processed, created, errors };
    } catch (error: unknown) {
      logger.error('Failed to process auto reorders', { organizationId, error });
      throw error;
    }
  }

  // Private helper methods

  private async generateItemNumber(organizationId: string): Promise<string> {
    const count = await prisma.inventoryItem.count({
      where: { organizationId },
    });
    return `ITEM-${String(count + 1).padStart(6, '0')}`;
  }

  private async generateTransactionNumber(): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.inventoryTransaction.count({
      where: {
        transactionNumber: { startsWith: `TXN-${date}` },
      },
    });
    return `TXN-${date}-${String(count + 1).padStart(4, '0')}`;
  }

  private calculateWeightedAverageCost(
    currentAvgCost: number,
    currentQuantity: number,
    newCost: number,
    newQuantity: number
  ): number {
    if (newQuantity === 0) {return currentAvgCost;}
    
    const currentValue = currentAvgCost * currentQuantity;
    const newValue = newCost * newQuantity;
    const totalQuantity = currentQuantity + newQuantity;
    
    return totalQuantity > 0 ? (currentValue + newValue) / totalQuantity : currentAvgCost;
  }

  private async checkReorderAlert(inventoryItemId: string): Promise<void> {
    try {
      const item = await prisma.inventoryItem.findUnique({
        where: { id: inventoryItemId },
        select: {
          quantityOnHand: true,
          reorderPoint: true,
          minimumStock: true,
          autoReorder: true,
          itemName: true,
        },
      });

      if (!item) {return;}

      // Check if we need to create an alert
      let alertType: string | null = null;

      if (item.quantityOnHand <= 0) {
        alertType = 'STOCKOUT';
      } else if (item.quantityOnHand <= item.minimumStock) {
        alertType = 'BELOW_MINIMUM';
      } else if (item.quantityOnHand <= item.reorderPoint) {
        alertType = 'AT_REORDER_POINT';
      }

      if (alertType) {
        // Check if alert already exists
        const existingAlert = await prisma.reorderAlert.findFirst({
          where: {
            inventoryItemId,
            status: 'OPEN',
          },
        });

        if (!existingAlert) {
          await prisma.reorderAlert.create({
            data: {
              inventoryItemId,
              alertType: alertType as any,
              currentQuantity: item.quantityOnHand,
              reorderPoint: item.reorderPoint,
              reorderQuantity: 0, // Will be set based on item's reorder quantity
              status: 'OPEN',
            },
          });

          logger.info('Reorder alert created', {
            itemId: inventoryItemId,
            itemName: item.itemName,
            alertType,
            currentQuantity: item.quantityOnHand,
          });
        }
      }
    } catch (error: unknown) {
      logger.error('Failed to check reorder alert', { inventoryItemId, error });
    }
  }

  private calculateMonthlyUsage(transactions: any[], months: number): number[] {
    const monthlyUsage: number[] = new Array(months).fill(0);
    const now = new Date();

    transactions.forEach(transaction => {
      const monthsAgo = Math.floor(
        (now.getTime() - transaction.transactionDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      
      if (monthsAgo >= 0 && monthsAgo < months) {
        monthlyUsage[months - 1 - monthsAgo] += transaction.quantity;
      }
    });

    return monthlyUsage;
  }

  private calculateVariabilityIndex(usage: number[]): number {
    if (usage.length <= 1) {return 0;}

    const mean = usage.reduce((sum, val) => sum + val, 0) / usage.length;
    const variance = usage.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / usage.length;
    
    return Math.sqrt(variance);
  }
}

export const inventoryService = new InventoryService();