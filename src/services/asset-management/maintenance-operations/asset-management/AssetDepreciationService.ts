import { PrismaClient } from '@prisma/client';
import { logger } from '@/config/logger';
import { 
  AssetDepreciationRecord,
  DepreciationMethod,
  AssetFinancialData
} from './types/AssetTypes';
import { PrecisionUtils, PrecisionDecimal, PrecisionConfig } from '../../../../shared/precision-utils';

const prisma = new PrismaClient();

/**
 * AssetDepreciationService - Handles asset depreciation calculations and tracking
 * Manages various depreciation methods, financial reporting, and value adjustments
 * Part of the Asset Management domain within Turbo Asset IWMS
 */
export class AssetDepreciationService {

  /**
   * Initialize depreciation tracking for a new asset
   */
  async initializeDepreciation(
    assetId: string,
    depreciationData: {
      purchasePrice: number;
      usefulLife: number;
      salvageValue: number;
      method: DepreciationMethod;
      purchaseDate: Date;
    }
  ): Promise<AssetDepreciationRecord> {
    try {
      // Calculate initial depreciation values
      const initialCalculation = this.calculateDepreciationAmount(
        depreciationData.purchasePrice,
        depreciationData.salvageValue,
        depreciationData.usefulLife,
        depreciationData.method,
        1 // First year
      );

      // Create initial depreciation record
      const depreciationRecord = await prisma.assetDepreciation.create({
        data: {
          assetId,
          depreciationDate: depreciationData.purchaseDate,
          bookValue: depreciationData.purchasePrice,
          depreciationAmount: 0, // No depreciation on purchase date
          accumulatedDepreciation: 0,
          remainingValue: depreciationData.purchasePrice,
          method: depreciationData.method,
          usefulLife: depreciationData.usefulLife,
          salvageValue: depreciationData.salvageValue,
          calculatedBy: 'SYSTEM',
        },
      });

      // Set up depreciation schedule
      await this.createDepreciationSchedule(assetId, depreciationData);

      logger.info('Depreciation initialized for asset', {
        assetId,
        method: depreciationData.method,
        purchasePrice: depreciationData.purchasePrice,
        usefulLife: depreciationData.usefulLife,
      });

      return this.mapToDepreciationRecord(depreciationRecord);

    } catch (error: unknown) {
      logger.error('Failed to initialize depreciation', {
        assetId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Calculate current asset depreciation
   */
  async calculateCurrentDepreciation(assetId: string): Promise<AssetFinancialData> {
    try {
      const asset = await prisma.maintenanceAsset.findUnique({
        where: { id: assetId },
        include: {
          depreciations: {
            orderBy: { depreciationDate: 'desc' },
            take: 1,
          }
        }
      });

      if (!asset) {
        throw new Error('Asset not found');
      }

      if (!asset.purchasePrice || !asset.usefulLife || !asset.purchaseDate) {
        throw new Error('Insufficient data for depreciation calculation');
      }

      // Calculate current depreciation based on time elapsed
      const currentDate = new Date();
      const purchaseDate = new Date(asset.purchaseDate);
      const ageInYears = (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

      // Get depreciation method
      const method = (asset.depreciationMethod as DepreciationMethod) || DepreciationMethod.STRAIGHT_LINE;

      // Calculate depreciation
      const totalDepreciableValue = asset.purchasePrice - (asset.salvageValue || 0);
      const accumulatedDepreciation = this.calculateAccumulatedDepreciation(
        totalDepreciableValue,
        asset.usefulLife,
        ageInYears,
        method
      );

      const currentValue = Math.max(
        asset.purchasePrice - accumulatedDepreciation,
        asset.salvageValue || 0
      );

      const monthlyDepreciation = this.calculateMonthlyDepreciation(
        totalDepreciableValue,
        asset.usefulLife,
        method,
        ageInYears
      );

      // Get maintenance costs
      const maintenanceCosts = await this.calculateMaintenanceCosts(assetId);

      const financialData: AssetFinancialData = {
        purchasePrice: asset.purchasePrice,
        currentValue,
        accumulatedDepreciation,
        monthlyDepreciation,
        totalMaintenanceCost: maintenanceCosts.total,
        averageMaintenanceCost: maintenanceCosts.average,
        roi: this.calculateROI(asset.purchasePrice, currentValue, maintenanceCosts.total),
        paybackPeriod: this.calculatePaybackPeriod(asset.purchasePrice, maintenanceCosts.total),
      };

      return financialData;

    } catch (error: unknown) {
      logger.error('Failed to calculate current depreciation', {
        assetId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Process monthly depreciation for assets
   */
  async processMonthlyDepreciation(organizationId: string): Promise<{
    processed: number;
    totalDepreciation: number;
    errors: any[];
  }> {
    try {
      const results = {
        processed: 0,
        totalDepreciation: 0,
        errors: [],
      };

      // Get all depreciable assets
      const assets = await prisma.maintenanceAsset.findMany({
        where: {
          organizationId,
          status: { not: 'DISPOSED' },
          purchasePrice: { gt: 0 },
          usefulLife: { gt: 0 },
          purchaseDate: { not: null },
        },
        include: {
          depreciations: {
            orderBy: { depreciationDate: 'desc' },
            take: 1,
          }
        }
      });

      for (const asset of assets) {
        try {
          const depreciation = await this.processAssetDepreciation(asset);
          if (depreciation) {
            results.processed++;
            results.totalDepreciation += depreciation.depreciationAmount;
          }
        } catch (error: unknown) {
          results.errors.push({
            assetId: asset.id,
            assetTag: asset.assetTag,
            error: (error as Error).message,
          });
        }
      }

      logger.info('Monthly depreciation processing completed', {
        organizationId,
        processed: results.processed,
        totalDepreciation: results.totalDepreciation,
        errors: results.errors.length,
      });

      return results;

    } catch (error: unknown) {
      logger.error('Failed to process monthly depreciation', {
        organizationId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Adjust asset value manually
   */
  async adjustAssetValue(
    assetId: string,
    newValue: number,
    reason: string,
    adjustedBy: string
  ): Promise<AssetDepreciationRecord> {
    try {
      const asset = await prisma.maintenanceAsset.findUnique({
        where: { id: assetId },
        include: {
          depreciations: {
            orderBy: { depreciationDate: 'desc' },
            take: 1,
          }
        }
      });

      if (!asset) {
        throw new Error('Asset not found');
      }

      const currentValue = asset.depreciations[0]?.remainingValue || asset.currentValue || 0;
      const adjustmentAmount = newValue - currentValue;

      // Create adjustment record
      const adjustmentRecord = await prisma.assetDepreciation.create({
        data: {
          assetId,
          depreciationDate: new Date(),
          bookValue: newValue,
          depreciationAmount: adjustmentAmount,
          accumulatedDepreciation: (asset.purchasePrice || 0) - newValue,
          remainingValue: newValue,
          method: 'MANUAL_ADJUSTMENT',
          calculatedBy: adjustedBy,
          notes: `Manual value adjustment: ${reason}`,
        },
      });

      // Update asset current value
      await prisma.maintenanceAsset.update({
        where: { id: assetId },
        data: { currentValue: newValue },
      });

      // Create audit trail
      await this.createValueAdjustmentAudit(assetId, currentValue, newValue, reason, adjustedBy);

      logger.info('Asset value adjusted', {
        assetId,
        previousValue: currentValue,
        newValue,
        adjustmentAmount,
        reason,
      });

      return this.mapToDepreciationRecord(adjustmentRecord);

    } catch (error: unknown) {
      logger.error('Failed to adjust asset value', {
        assetId,
        newValue,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Generate depreciation report for assets
   */
  async generateDepreciationReport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalAssets: number;
    totalOriginalValue: number;
    totalCurrentValue: number;
    totalDepreciation: number;
    depreciationByMethod: Record<string, number>;
    depreciationByCategory: Record<string, number>;
    monthlyTrends: Array<{
      month: string;
      depreciation: number;
      assetsCount: number;
    }>;
  }> {
    try {
      // Get assets with depreciation data
      const assets = await prisma.maintenanceAsset.findMany({
        where: {
          organizationId,
          purchaseDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          depreciations: {
            where: {
              depreciationDate: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
      });

      let totalOriginalValue = 0;
      let totalCurrentValue = 0;
      let totalDepreciation = 0;
      const depreciationByMethod: Record<string, number> = {};
      const depreciationByCategory: Record<string, number> = {};

      assets.forEach(asset => {
        const originalValue = asset.purchasePrice || 0;
        const currentValue = asset.currentValue || 0;
        const assetDepreciation = originalValue - currentValue;

        totalOriginalValue += originalValue;
        totalCurrentValue += currentValue;
        totalDepreciation += assetDepreciation;

        // Group by depreciation method
        const method = asset.depreciationMethod || 'STRAIGHT_LINE';
        depreciationByMethod[method] = (depreciationByMethod[method] || 0) + assetDepreciation;

        // Group by category
        depreciationByCategory[asset.category] = (depreciationByCategory[asset.category] || 0) + assetDepreciation;
      });

      // Calculate monthly trends
      const monthlyTrends = await this.calculateMonthlyDepreciationTrends(
        organizationId,
        startDate,
        endDate
      );

      const report = {
        totalAssets: assets.length,
        totalOriginalValue,
        totalCurrentValue,
        totalDepreciation,
        depreciationByMethod,
        depreciationByCategory,
        monthlyTrends,
      };

      logger.info('Depreciation report generated', {
        organizationId,
        totalAssets: assets.length,
        totalDepreciation,
      });

      return report;

    } catch (error: unknown) {
      logger.error('Failed to generate depreciation report', {
        organizationId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Calculate depreciation amount based on method with high precision
   */
  private calculateDepreciationAmount(
    purchasePrice: number,
    salvageValue: number,
    usefulLife: number,
    method: DepreciationMethod,
    year: number
  ): number {
    if (!PrecisionUtils.isSafePrecision(purchasePrice, PrecisionConfig.CURRENCY) ||
        !PrecisionUtils.isSafePrecision(salvageValue, PrecisionConfig.CURRENCY)) {
      logger.warn('Depreciation calculation values exceed safe precision limits', {
        purchasePrice,
        salvageValue,
        method
      });
    }

    const depreciableValue = PrecisionUtils.subtract(purchasePrice, salvageValue, PrecisionConfig.CURRENCY);

    switch (method) {
      case DepreciationMethod.STRAIGHT_LINE:
        return PrecisionUtils.calculateStraightLineDepreciation(
          purchasePrice,
          salvageValue,
          usefulLife,
          year,
          PrecisionConfig.CURRENCY
        ).annualDepreciation;

      case DepreciationMethod.DECLINING_BALANCE:
        const rate = PrecisionUtils.divide(1, usefulLife, PrecisionConfig.INTEREST_RATE);
        const remainingValue = PrecisionUtils.multiply(
          purchasePrice,
          Math.pow(1 - rate, year - 1),
          PrecisionConfig.CURRENCY
        );
        const calculatedDepreciation = PrecisionUtils.multiply(remainingValue, rate, PrecisionConfig.CURRENCY);
        const maxDepreciation = PrecisionUtils.subtract(remainingValue, salvageValue, PrecisionConfig.CURRENCY);
        return Math.max(calculatedDepreciation, maxDepreciation);

      case DepreciationMethod.DOUBLE_DECLINING_BALANCE:
        return PrecisionUtils.calculateDecliningBalanceDepreciation(
          purchasePrice,
          PrecisionUtils.divide(2, usefulLife, PrecisionConfig.INTEREST_RATE),
          year,
          PrecisionConfig.CURRENCY
        ).annualDepreciation;

      case DepreciationMethod.SUM_OF_YEARS_DIGITS:
        const sumOfYears = PrecisionUtils.divide(
          usefulLife * (usefulLife + 1),
          2,
          PrecisionConfig.CURRENCY
        );
        const yearsFactor = PrecisionUtils.divide(
          (usefulLife - year + 1),
          sumOfYears,
          PrecisionConfig.RATIOS
        );
        return PrecisionUtils.multiply(depreciableValue, yearsFactor, PrecisionConfig.CURRENCY);

      case DepreciationMethod.UNITS_OF_PRODUCTION:
        // This would require usage data - simplified for now with high precision
        return PrecisionUtils.divide(depreciableValue, usefulLife, PrecisionConfig.CURRENCY);

      default:
        return PrecisionUtils.divide(depreciableValue, usefulLife, PrecisionConfig.CURRENCY);
    }
  }

  /**
   * Calculate accumulated depreciation with high precision
   */
  private calculateAccumulatedDepreciation(
    depreciableValue: number,
    usefulLife: number,
    ageInYears: number,
    method: DepreciationMethod
  ): number {
    if (ageInYears >= usefulLife) {
      return PrecisionUtils.roundToPrecision(depreciableValue, PrecisionConfig.CURRENCY);
    }

    switch (method) {
      case DepreciationMethod.STRAIGHT_LINE:
        const annualDepreciation = PrecisionUtils.divide(depreciableValue, usefulLife, PrecisionConfig.CURRENCY);
        return PrecisionUtils.multiply(annualDepreciation, ageInYears, PrecisionConfig.CURRENCY);

      case DepreciationMethod.DECLINING_BALANCE:
        const rate = PrecisionUtils.divide(1, usefulLife, PrecisionConfig.INTEREST_RATE);
        const factor = 1 - Math.pow(1 - rate, ageInYears);
        return PrecisionUtils.multiply(depreciableValue, factor, PrecisionConfig.CURRENCY);

      case DepreciationMethod.DOUBLE_DECLINING_BALANCE:
        const doubleRate = PrecisionUtils.divide(2, usefulLife, PrecisionConfig.INTEREST_RATE);
        const doubleFactor = 1 - Math.pow(1 - doubleRate, ageInYears);
        return PrecisionUtils.multiply(depreciableValue, doubleFactor, PrecisionConfig.CURRENCY);

      default:
        const defaultAnnualDepreciation = PrecisionUtils.divide(depreciableValue, usefulLife, PrecisionConfig.CURRENCY);
        return PrecisionUtils.multiply(defaultAnnualDepreciation, ageInYears, PrecisionConfig.CURRENCY);
    }
  }

  /**
   * Calculate monthly depreciation with high precision
   */
  private calculateMonthlyDepreciation(
    depreciableValue: number,
    usefulLife: number,
    method: DepreciationMethod,
    ageInYears: number
  ): number {
    if (ageInYears >= usefulLife) {
      return 0; // Fully depreciated
    }

    const annualDepreciation = this.calculateDepreciationAmount(
      PrecisionUtils.add(depreciableValue, 0, PrecisionConfig.CURRENCY), // Add salvage value back for calculation
      0,
      usefulLife,
      method,
      Math.ceil(ageInYears)
    );

    return PrecisionUtils.divide(annualDepreciation, 12, PrecisionConfig.CURRENCY);
  }

  /**
   * Calculate maintenance costs for asset
   */
  private async calculateMaintenanceCosts(assetId: string): Promise<{
    total: number;
    average: number;
  }> {
    try {
      const workOrders = await prisma.workOrder.findMany({
        where: {
          assetId,
          status: 'COMPLETED',
          actualCost: { not: null },
        },
        select: {
          actualCost: true,
          completedAt: true,
        },
      });

      const total = workOrders.reduce((sum, wo) => sum + (wo.actualCost || 0), 0);
      const average = workOrders.length > 0 ? total / workOrders.length : 0;

      return { total, average };

    } catch (error: unknown) {
      return { total: 0, average: 0 };
    }
  }

  /**
   * Calculate ROI for asset
   */
  private calculateROI(
    purchasePrice: number,
    currentValue: number,
    maintenanceCosts: number
  ): number {
    const totalInvestment = purchasePrice + maintenanceCosts;
    if (totalInvestment === 0) {return 0;}
    
    // Simplified ROI calculation - would need operational benefits data for accurate calculation
    const valueRetained = currentValue / purchasePrice;
    return ((valueRetained - 1) * 100) - ((maintenanceCosts / purchasePrice) * 100);
  }

  /**
   * Calculate payback period for asset
   */
  private calculatePaybackPeriod(purchasePrice: number, maintenanceCosts: number): number {
    // Simplified payback period calculation
    // Would need operational savings/benefits data for accurate calculation
    const totalCost = purchasePrice + maintenanceCosts;
    const estimatedAnnualSavings = purchasePrice * 0.1; // Assume 10% annual savings
    
    return estimatedAnnualSavings > 0 ? totalCost / estimatedAnnualSavings : 0;
  }

  /**
   * Process depreciation for a single asset
   */
  private async processAssetDepreciation(asset: any): Promise<AssetDepreciationRecord | null> {
    if (!asset.purchasePrice || !asset.usefulLife || !asset.purchaseDate) {
      return null;
    }

    const financialData = await this.calculateCurrentDepreciation(asset.id);

    // Check if we need to create a new depreciation record
    const lastDepreciation = asset.depreciations[0];
    const lastRecordDate = lastDepreciation ? new Date(lastDepreciation.depreciationDate) : null;
    const currentDate = new Date();

    // Only create monthly records
    if (lastRecordDate) {
      const monthsSinceLastRecord = 
        (currentDate.getFullYear() - lastRecordDate.getFullYear()) * 12 + 
        (currentDate.getMonth() - lastRecordDate.getMonth());

      if (monthsSinceLastRecord < 1) {
        return null; // Too soon for next depreciation record
      }
    }

    // Create new depreciation record
    const depreciationRecord = await prisma.assetDepreciation.create({
      data: {
        assetId: asset.id,
        depreciationDate: currentDate,
        bookValue: financialData.currentValue || 0,
        depreciationAmount: financialData.monthlyDepreciation || 0,
        accumulatedDepreciation: financialData.accumulatedDepreciation || 0,
        remainingValue: financialData.currentValue || 0,
        method: asset.depreciationMethod || 'STRAIGHT_LINE',
        calculatedBy: 'SYSTEM',
      },
    });

    // Update asset current value
    await prisma.maintenanceAsset.update({
      where: { id: asset.id },
      data: { currentValue: financialData.currentValue },
    });

    return this.mapToDepreciationRecord(depreciationRecord);
  }

  /**
   * Create depreciation schedule for asset
   */
  private async createDepreciationSchedule(
    assetId: string,
    depreciationData: any
  ): Promise<void> {
    // This would create a detailed depreciation schedule
    // For now, we'll just log that the schedule was created
    logger.info('Depreciation schedule created', {
      assetId,
      method: depreciationData.method,
      usefulLife: depreciationData.usefulLife,
    });
  }

  /**
   * Create value adjustment audit record
   */
  private async createValueAdjustmentAudit(
    assetId: string,
    previousValue: number,
    newValue: number,
    reason: string,
    adjustedBy: string
  ): Promise<void> {
    await prisma.assetAudit.create({
      data: {
        assetId,
        action: 'VALUE_ADJUSTED',
        userId: adjustedBy,
        details: {
          previousValue,
          newValue,
          adjustment: newValue - previousValue,
          reason,
        },
        timestamp: new Date(),
      },
    });
  }

  /**
   * Calculate monthly depreciation trends
   */
  private async calculateMonthlyDepreciationTrends(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ month: string; depreciation: number; assetsCount: number }>> {
    // This would calculate monthly trends from depreciation records
    // Simplified implementation for now
    const trends = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const depreciationRecords = await prisma.assetDepreciation.findMany({
        where: {
          asset: { organizationId },
          depreciationDate: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      const totalDepreciation = depreciationRecords.reduce(
        (sum, record) => sum + (record.depreciationAmount || 0), 
        0
      );

      trends.push({
        month: currentDate.toISOString().substring(0, 7), // YYYY-MM format
        depreciation: totalDepreciation,
        assetsCount: depreciationRecords.length,
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return trends;
  }

  /**
   * Map database record to depreciation record interface
   */
  private mapToDepreciationRecord(record: any): AssetDepreciationRecord {
    return {
      id: record.id,
      assetId: record.assetId,
      depreciationDate: record.depreciationDate,
      bookValue: record.bookValue,
      depreciationAmount: record.depreciationAmount,
      accumulatedDepreciation: record.accumulatedDepreciation,
      remainingValue: record.remainingValue,
      method: record.method,
      calculatedBy: record.calculatedBy,
    };
  }
}