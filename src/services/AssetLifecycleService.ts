import { PrismaClient } from '@prisma/client';
import { logger } from '@/config/logger';

const prisma = new PrismaClient();

export interface AssetLifecycleData {
  assetId: string;
  depreciationMethod: string;
  usefulLife: number;
  salvageValue: number;
  purchasePrice: number;
  purchaseDate: Date;
  replacementCost?: number;
  replacementDate?: Date;
  disposalMethod?: string;
  disposalValue?: number;
  organizationId: string;
  updatedBy: string;
}

export interface DepreciationCalculation {
  year: number;
  startingValue: number;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  endingValue: number;
  rate?: number;
}

export interface ReplacementPlan {
  assetId: string;
  assetName: string;
  currentAge: number;
  remainingUsefulLife: number;
  currentCondition: string;
  estimatedReplacementCost: number;
  recommendedReplacementDate: Date;
  priority: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';
  justification: string;
  budgetImpact: number;
  riskOfFailure: number;
  businessImpact: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  alternativeOptions: string[];
}

export interface LifecycleMetrics {
  totalAssetValue: number;
  totalDepreciation: number;
  averageAssetAge: number;
  assetsNearingReplacement: number;
  totalReplacementBudgetRequired: number;
  depreciationByMethod: { [method: string]: number };
  assetsByLifecycleStage: {
    new: number;        // 0-20% of useful life
    productive: number; // 20-70% of useful life
    mature: number;     // 70-90% of useful life
    endOfLife: number;  // 90-100% of useful life
    overdue: number;    // >100% of useful life
  };
  replacementsByYear: { [year: string]: { count: number; estimatedCost: number } };
  totalCostOfOwnership: number;
  averageROI: number;
}

export interface DisposalRecord {
  assetId: string;
  disposalDate: Date;
  disposalMethod: string;
  disposalValue: number;
  disposalCost: number;
  environmentalImpact?: string;
  certificationRequired: boolean;
  vendor?: string;
  documentation: string[];
  netDisposalValue: number;
}

/**
 * AssetLifecycleService - Comprehensive asset lifecycle and depreciation management
 * Handles asset depreciation, replacement planning, and disposal management
 * Supports multiple depreciation methods and advanced lifecycle analytics
 */
export class AssetLifecycleService {

  /**
   * Calculate depreciation for an asset
   */
  async calculateAssetDepreciation(lifecycleData: AssetLifecycleData): Promise<DepreciationCalculation[]> {
    try {
      const depreciations: DepreciationCalculation[] = [];
      const { depreciationMethod, usefulLife, salvageValue, purchasePrice, purchaseDate } = lifecycleData;
      
      const depreciableAmount = purchasePrice - salvageValue;
      const currentYear = new Date().getFullYear();
      const purchaseYear = purchaseDate.getFullYear();

      switch (depreciationMethod) {
        case 'STRAIGHT_LINE':
          depreciations.push(...this.calculateStraightLineDepreciation(
            purchasePrice, salvageValue, usefulLife, purchaseYear, currentYear
          ));
          break;

        case 'DECLINING_BALANCE':
          depreciations.push(...this.calculateDecliningBalanceDepreciation(
            purchasePrice, salvageValue, usefulLife, purchaseYear, currentYear, 1.5
          ));
          break;

        case 'DOUBLE_DECLINING_BALANCE':
          depreciations.push(...this.calculateDecliningBalanceDepreciation(
            purchasePrice, salvageValue, usefulLife, purchaseYear, currentYear, 2.0
          ));
          break;

        case 'SUM_OF_YEARS_DIGITS':
          depreciations.push(...this.calculateSumOfYearsDigitsDepreciation(
            purchasePrice, salvageValue, usefulLife, purchaseYear, currentYear
          ));
          break;

        default:
          throw new Error(`Unsupported depreciation method: ${depreciationMethod}`);
      }

      // Store depreciation records in database
      for (const depreciation of depreciations) {
        await prisma.assetDepreciation.upsert({
          where: {
            assetId_depreciationYear: {
              assetId: lifecycleData.assetId,
              depreciationYear: depreciation.year,
            },
          },
          update: {
            startingValue: depreciation.startingValue,
            depreciationAmount: depreciation.depreciationAmount,
            accumulatedDepreciation: depreciation.accumulatedDepreciation,
            endingValue: depreciation.endingValue,
            method: depreciationMethod as any,
            depreciationRate: depreciation.rate,
            calculatedDate: new Date(),
          },
          create: {
            assetId: lifecycleData.assetId,
            depreciationYear: depreciation.year,
            startingValue: depreciation.startingValue,
            depreciationAmount: depreciation.depreciationAmount,
            accumulatedDepreciation: depreciation.accumulatedDepreciation,
            endingValue: depreciation.endingValue,
            method: depreciationMethod as any,
            depreciationRate: depreciation.rate,
            calculatedDate: new Date(),
          },
        });
      }

      // Update asset current value
      const latestDepreciation = depreciations[depreciations.length - 1];
      if (latestDepreciation) {
        await prisma.maintenanceAsset.update({
          where: { id: lifecycleData.assetId },
          data: { currentValue: latestDepreciation.endingValue },
        });
      }

      logger.info('Asset depreciation calculated', { 
        assetId: lifecycleData.assetId, 
        method: depreciationMethod,
        years: depreciations.length 
      });

      return depreciations;
    } catch (error: unknown) {
      logger.error('Failed to calculate asset depreciation', { assetId: lifecycleData.assetId, error });
      throw error;
    }
  }

  /**
   * Generate replacement plan for assets
   */
  async generateReplacementPlan(
    organizationId: string,
    yearsAhead: number = 5,
    filters?: {
      category?: string;
      criticality?: string;
      location?: string;
      minValue?: number;
    }
  ): Promise<ReplacementPlan[]> {
    try {
      const where: any = { organizationId };
      
      if (filters?.category) {where.category = filters.category;}
      if (filters?.criticality) {where.criticality = filters.criticality;}
      if (filters?.location) {where.location = { contains: filters.location };}
      if (filters?.minValue) {where.currentValue = { gte: filters.minValue };}

      const assets = await prisma.maintenanceAsset.findMany({
        where,
        include: {
          assetConditions: {
            orderBy: { assessmentDate: 'desc' },
            take: 1,
          },
          depreciations: {
            orderBy: { depreciationYear: 'desc' },
            take: 1,
          },
          workOrders: {
            where: { status: 'COMPLETED' },
            select: { actualCost: true },
          },
        },
      });

      const replacementPlans: ReplacementPlan[] = [];
      const currentDate = new Date();

      for (const asset of assets) {
        if (!asset.purchaseDate || !asset.usefulLife) {continue;}

        const assetAge = (currentDate.getTime() - asset.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
        const remainingUsefulLife = Math.max(0, asset.usefulLife - assetAge);
        
        // Calculate estimated replacement cost (with inflation)
        const inflationRate = 0.03; // 3% annual inflation
        const estimatedReplacementCost = (asset.purchasePrice || 0) * Math.pow(1 + inflationRate, assetAge);

        // Determine recommended replacement date
        const replacementDate = new Date(asset.purchaseDate);
        replacementDate.setFullYear(replacementDate.getFullYear() + asset.usefulLife);

        // Calculate risk factors
        const latestCondition = asset.assetConditions[0];
        const conditionScore = latestCondition?.overallScore || 100;
        const riskOfFailure = this.calculateFailureRisk(assetAge, asset.usefulLife, conditionScore);

        // Determine priority and business impact
        const { priority, businessImpact, justification } = this.assessReplacementPriority(
          remainingUsefulLife,
          riskOfFailure,
          asset.criticality,
          conditionScore
        );

        // Calculate total cost of ownership
        const maintenanceCosts = asset.workOrders.reduce((sum, wo) => sum + wo.actualCost, 0);
        const currentValue = asset.currentValue || 0;
        
        // Generate alternative options
        const alternativeOptions = this.generateAlternativeOptions(asset, remainingUsefulLife, riskOfFailure);

        if (remainingUsefulLife <= yearsAhead || priority === 'IMMEDIATE' || priority === 'HIGH') {
          replacementPlans.push({
            assetId: asset.id,
            assetName: asset.assetName,
            currentAge: assetAge,
            remainingUsefulLife,
            currentCondition: asset.condition,
            estimatedReplacementCost,
            recommendedReplacementDate: replacementDate,
            priority,
            justification,
            budgetImpact: estimatedReplacementCost,
            riskOfFailure,
            businessImpact,
            alternativeOptions,
          });
        }
      }

      // Sort by priority and then by recommended date
      replacementPlans.sort((a, b) => {
        const priorityOrder = { 'IMMEDIATE': 1, 'HIGH': 2, 'MEDIUM': 3, 'LOW': 4 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        
        if (priorityDiff !== 0) {return priorityDiff;}
        return a.recommendedReplacementDate.getTime() - b.recommendedReplacementDate.getTime();
      });

      logger.info('Replacement plan generated', { 
        organizationId, 
        totalAssets: assets.length,
        replacementsPlanned: replacementPlans.length 
      });

      return replacementPlans;
    } catch (error: unknown) {
      logger.error('Failed to generate replacement plan', { organizationId, error });
      throw error;
    }
  }

  /**
   * Get comprehensive lifecycle metrics
   */
  async getLifecycleMetrics(organizationId: string): Promise<LifecycleMetrics> {
    try {
      const [
        assets,
        depreciations,
        workOrders,
      ] = await Promise.all([
        prisma.maintenanceAsset.findMany({
          where: { organizationId },
          include: {
            depreciations: {
              orderBy: { depreciationYear: 'desc' },
              take: 1,
            },
          },
        }),
        
        prisma.assetDepreciation.findMany({
          where: {
            asset: { organizationId },
          },
        }),
        
        prisma.workOrder.findMany({
          where: {
            organizationId,
            status: 'COMPLETED',
          },
          select: { actualCost: true, assetId: true },
        }),
      ]);

      const currentDate = new Date();

      // Calculate basic metrics
      const totalAssetValue = assets.reduce((sum, asset) => sum + (asset.currentValue || 0), 0);
      const totalDepreciation = depreciations.reduce((sum, dep) => sum + dep.accumulatedDepreciation, 0);
      
      // Calculate average asset age
      const assetsWithPurchaseDate = assets.filter(a => a.purchaseDate);
      const averageAssetAge = assetsWithPurchaseDate.length > 0
        ? assetsWithPurchaseDate.reduce((sum, asset) => {
            const age = (currentDate.getTime() - asset.purchaseDate!.getTime()) / (1000 * 60 * 60 * 24 * 365);
            return sum + age;
          }, 0) / assetsWithPurchaseDate.length
        : 0;

      // Calculate depreciation by method
      const depreciationByMethod: { [method: string]: number } = {};
      depreciations.forEach(dep => {
        if (!depreciationByMethod[dep.method]) {
          depreciationByMethod[dep.method] = 0;
        }
        depreciationByMethod[dep.method] += dep.accumulatedDepreciation;
      });

      // Calculate assets by lifecycle stage
      const lifecycleStages = {
        new: 0,
        productive: 0,
        mature: 0,
        endOfLife: 0,
        overdue: 0,
      };

      let assetsNearingReplacement = 0;
      let totalReplacementBudgetRequired = 0;

      for (const asset of assets) {
        if (asset.purchaseDate && asset.usefulLife) {
          const age = (currentDate.getTime() - asset.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
          const lifePercentage = (age / asset.usefulLife) * 100;

          if (lifePercentage <= 20) {
            lifecycleStages.new++;
          } else if (lifePercentage <= 70) {
            lifecycleStages.productive++;
          } else if (lifePercentage <= 90) {
            lifecycleStages.mature++;
          } else if (lifePercentage <= 100) {
            lifecycleStages.endOfLife++;
            assetsNearingReplacement++;
            totalReplacementBudgetRequired += this.estimateReplacementCost(asset);
          } else {
            lifecycleStages.overdue++;
            assetsNearingReplacement++;
            totalReplacementBudgetRequired += this.estimateReplacementCost(asset);
          }
        }
      }

      // Calculate replacements by year (next 5 years)
      const replacementsByYear: { [year: string]: { count: number; estimatedCost: number } } = {};
      
      for (let i = 0; i < 5; i++) {
        const year = (currentDate.getFullYear() + i).toString();
        replacementsByYear[year] = { count: 0, estimatedCost: 0 };
      }

      for (const asset of assets) {
        if (asset.purchaseDate && asset.usefulLife) {
          const replacementDate = new Date(asset.purchaseDate);
          replacementDate.setFullYear(replacementDate.getFullYear() + asset.usefulLife);
          
          const replacementYear = replacementDate.getFullYear().toString();
          if (replacementsByYear[replacementYear]) {
            replacementsByYear[replacementYear].count++;
            replacementsByYear[replacementYear].estimatedCost += this.estimateReplacementCost(asset);
          }
        }
      }

      // Calculate total cost of ownership and ROI
      const assetMaintenanceCosts = new Map<string, number>();
      workOrders.forEach(wo => {
        if (wo.assetId) {
          assetMaintenanceCosts.set(wo.assetId, (assetMaintenanceCosts.get(wo.assetId) || 0) + wo.actualCost);
        }
      });

      let totalCostOfOwnership = 0;
      let totalROI = 0;
      let assetsWithROI = 0;

      assets.forEach(asset => {
        const purchasePrice = asset.purchasePrice || 0;
        const maintenanceCost = assetMaintenanceCosts.get(asset.id) || 0;
        const currentValue = asset.currentValue || 0;
        
        totalCostOfOwnership += purchasePrice + maintenanceCost;
        
        if (purchasePrice > 0) {
          const roi = ((currentValue + maintenanceCost) - purchasePrice) / purchasePrice;
          totalROI += roi;
          assetsWithROI++;
        }
      });

      const averageROI = assetsWithROI > 0 ? (totalROI / assetsWithROI) * 100 : 0;

      return {
        totalAssetValue,
        totalDepreciation,
        averageAssetAge,
        assetsNearingReplacement,
        totalReplacementBudgetRequired,
        depreciationByMethod,
        assetsByLifecycleStage: lifecycleStages,
        replacementsByYear,
        totalCostOfOwnership,
        averageROI,
      };
    } catch (error: unknown) {
      logger.error('Failed to get lifecycle metrics', { organizationId, error });
      throw error;
    }
  }

  /**
   * Record asset disposal
   */
  async recordAssetDisposal(disposalData: {
    assetId: string;
    disposalMethod: string;
    disposalValue: number;
    disposalCost: number;
    environmentalImpact?: string;
    certificationRequired: boolean;
    vendor?: string;
    documentation: string[];
    disposedBy: string;
  }): Promise<DisposalRecord> {
    try {
      // Update asset status
      const asset = await prisma.maintenanceAsset.update({
        where: { id: disposalData.assetId },
        data: { status: 'DISPOSED' },
      });

      const netDisposalValue = disposalData.disposalValue - disposalData.disposalCost;

      const disposalRecord: DisposalRecord = {
        assetId: disposalData.assetId,
        disposalDate: new Date(),
        disposalMethod: disposalData.disposalMethod,
        disposalValue: disposalData.disposalValue,
        disposalCost: disposalData.disposalCost,
        environmentalImpact: disposalData.environmentalImpact,
        certificationRequired: disposalData.certificationRequired,
        vendor: disposalData.vendor,
        documentation: disposalData.documentation,
        netDisposalValue,
      };

      // In a real implementation, you would store this in a disposal_records table
      // For now, we'll log it and potentially store as JSON in asset record
      
      logger.info('Asset disposal recorded', { 
        assetId: disposalData.assetId,
        disposalMethod: disposalData.disposalMethod,
        netValue: netDisposalValue 
      });

      return disposalRecord;
    } catch (error: unknown) {
      logger.error('Failed to record asset disposal', { assetId: disposalData.assetId, error });
      throw error;
    }
  }

  /**
   * Perform asset lifecycle analysis for multiple assets
   */
  async performBulkLifecycleAnalysis(
    assetIds: string[],
    organizationId: string
  ): Promise<Array<{
    assetId: string;
    assetName: string;
    lifecycleStage: string;
    currentValue: number;
    depreciationRate: number;
    maintenanceCostTrend: string;
    replacementRecommendation: string;
    timeToReplacement: number; // years
    riskScore: number; // 0-100
  }>> {
    try {
      const assets = await prisma.maintenanceAsset.findMany({
        where: {
          id: { in: assetIds },
          organizationId,
        },
        include: {
          depreciations: {
            orderBy: { depreciationYear: 'desc' },
            take: 3,
          },
          workOrders: {
            where: { status: 'COMPLETED' },
            select: { actualCost: true, completionDate: true },
            orderBy: { completionDate: 'desc' },
          },
          assetConditions: {
            orderBy: { assessmentDate: 'desc' },
            take: 1,
          },
        },
      });

      const analyses = assets.map(asset => {
        const currentDate = new Date();
        
        // Calculate lifecycle stage
        let lifecycleStage = 'UNKNOWN';
        let timeToReplacement = 0;
        
        if (asset.purchaseDate && asset.usefulLife) {
          const age = (currentDate.getTime() - asset.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
          const lifePercentage = (age / asset.usefulLife) * 100;
          timeToReplacement = Math.max(0, asset.usefulLife - age);

          if (lifePercentage <= 20) {
            lifecycleStage = 'NEW';
          } else if (lifePercentage <= 70) {
            lifecycleStage = 'PRODUCTIVE';
          } else if (lifePercentage <= 90) {
            lifecycleStage = 'MATURE';
          } else if (lifePercentage <= 100) {
            lifecycleStage = 'END_OF_LIFE';
          } else {
            lifecycleStage = 'OVERDUE';
          }
        }

        // Calculate depreciation rate
        const depreciationRate = asset.depreciations.length > 0 && asset.purchasePrice
          ? (asset.depreciations[0].accumulatedDepreciation / asset.purchasePrice) * 100
          : 0;

        // Analyze maintenance cost trend
        const recentWorkOrders = asset.workOrders.slice(0, 10);
        let maintenanceCostTrend = 'STABLE';
        
        if (recentWorkOrders.length >= 4) {
          const recent = recentWorkOrders.slice(0, 2).reduce((sum, wo) => sum + wo.actualCost, 0) / 2;
          const older = recentWorkOrders.slice(2, 4).reduce((sum, wo) => sum + wo.actualCost, 0) / 2;
          
          if (recent > older * 1.2) {
            maintenanceCostTrend = 'INCREASING';
          } else if (recent < older * 0.8) {
            maintenanceCostTrend = 'DECREASING';
          }
        }

        // Generate replacement recommendation
        let replacementRecommendation = 'NOT_REQUIRED';
        if (lifecycleStage === 'OVERDUE') {
          replacementRecommendation = 'IMMEDIATE';
        } else if (lifecycleStage === 'END_OF_LIFE') {
          replacementRecommendation = 'WITHIN_YEAR';
        } else if (lifecycleStage === 'MATURE' && maintenanceCostTrend === 'INCREASING') {
          replacementRecommendation = 'PLAN_REPLACEMENT';
        }

        // Calculate risk score
        const conditionScore = asset.assetConditions[0]?.overallScore || 100;
        const ageRisk = lifecycleStage === 'OVERDUE' ? 100 : 
                       lifecycleStage === 'END_OF_LIFE' ? 80 :
                       lifecycleStage === 'MATURE' ? 60 : 30;
        const maintenanceRisk = maintenanceCostTrend === 'INCREASING' ? 30 : 0;
        const riskScore = Math.min(100, (100 - conditionScore) * 0.4 + ageRisk * 0.4 + maintenanceRisk * 0.2);

        return {
          assetId: asset.id,
          assetName: asset.assetName,
          lifecycleStage,
          currentValue: asset.currentValue || 0,
          depreciationRate,
          maintenanceCostTrend,
          replacementRecommendation,
          timeToReplacement,
          riskScore: Math.round(riskScore),
        };
      });

      logger.info('Bulk lifecycle analysis completed', { 
        organizationId,
        assetsAnalyzed: analyses.length 
      });

      return analyses;
    } catch (error: unknown) {
      logger.error('Failed to perform bulk lifecycle analysis', { organizationId, error });
      throw error;
    }
  }

  // Private helper methods

  private calculateStraightLineDepreciation(
    purchasePrice: number,
    salvageValue: number,
    usefulLife: number,
    purchaseYear: number,
    currentYear: number
  ): DepreciationCalculation[] {
    const depreciations: DepreciationCalculation[] = [];
    const annualDepreciation = (purchasePrice - salvageValue) / usefulLife;
    let accumulatedDepreciation = 0;

    for (let year = purchaseYear; year <= Math.min(currentYear, purchaseYear + usefulLife - 1); year++) {
      const startingValue = purchasePrice - accumulatedDepreciation;
      accumulatedDepreciation += annualDepreciation;
      const endingValue = Math.max(salvageValue, purchasePrice - accumulatedDepreciation);

      depreciations.push({
        year,
        startingValue,
        depreciationAmount: annualDepreciation,
        accumulatedDepreciation,
        endingValue,
      });
    }

    return depreciations;
  }

  private calculateDecliningBalanceDepreciation(
    purchasePrice: number,
    salvageValue: number,
    usefulLife: number,
    purchaseYear: number,
    currentYear: number,
    multiplier: number
  ): DepreciationCalculation[] {
    const depreciations: DepreciationCalculation[] = [];
    const rate = (multiplier / usefulLife);
    let bookValue = purchasePrice;
    let accumulatedDepreciation = 0;

    for (let year = purchaseYear; year <= Math.min(currentYear, purchaseYear + usefulLife - 1); year++) {
      const startingValue = bookValue;
      const depreciationAmount = Math.min(bookValue * rate, bookValue - salvageValue);
      
      accumulatedDepreciation += depreciationAmount;
      bookValue -= depreciationAmount;

      depreciations.push({
        year,
        startingValue,
        depreciationAmount,
        accumulatedDepreciation,
        endingValue: bookValue,
        rate: rate * 100,
      });
    }

    return depreciations;
  }

  private calculateSumOfYearsDigitsDepreciation(
    purchasePrice: number,
    salvageValue: number,
    usefulLife: number,
    purchaseYear: number,
    currentYear: number
  ): DepreciationCalculation[] {
    const depreciations: DepreciationCalculation[] = [];
    const depreciableAmount = purchasePrice - salvageValue;
    const sumOfYears = (usefulLife * (usefulLife + 1)) / 2;
    let accumulatedDepreciation = 0;

    for (let year = purchaseYear; year <= Math.min(currentYear, purchaseYear + usefulLife - 1); year++) {
      const yearInLife = year - purchaseYear + 1;
      const remainingYears = usefulLife - yearInLife + 1;
      const depreciationAmount = (remainingYears / sumOfYears) * depreciableAmount;
      
      const startingValue = purchasePrice - accumulatedDepreciation;
      accumulatedDepreciation += depreciationAmount;
      const endingValue = purchasePrice - accumulatedDepreciation;

      depreciations.push({
        year,
        startingValue,
        depreciationAmount,
        accumulatedDepreciation,
        endingValue,
      });
    }

    return depreciations;
  }

  private calculateFailureRisk(assetAge: number, usefulLife: number, conditionScore: number): number {
    const ageRisk = (assetAge / usefulLife) * 100;
    const conditionRisk = (100 - conditionScore);
    return Math.min(100, (ageRisk * 0.6) + (conditionRisk * 0.4));
  }

  private assessReplacementPriority(
    remainingUsefulLife: number,
    riskOfFailure: number,
    criticality: string,
    conditionScore: number
  ): {
    priority: ReplacementPlan['priority'];
    businessImpact: ReplacementPlan['businessImpact'];
    justification: string;
  } {
    let priority: ReplacementPlan['priority'] = 'LOW';
    let businessImpact: ReplacementPlan['businessImpact'] = 'LOW';
    let justification = '';

    // Determine business impact based on criticality
    switch (criticality) {
      case 'CRITICAL':
        businessImpact = 'CRITICAL';
        break;
      case 'HIGH':
        businessImpact = 'HIGH';
        break;
      case 'MEDIUM':
        businessImpact = 'MEDIUM';
        break;
      default:
        businessImpact = 'LOW';
    }

    // Determine priority based on multiple factors
    if (remainingUsefulLife <= 0 || riskOfFailure >= 80) {
      priority = 'IMMEDIATE';
      justification = 'Asset is beyond useful life or at critical risk of failure';
    } else if (remainingUsefulLife <= 1 || (riskOfFailure >= 60 && criticality === 'CRITICAL')) {
      priority = 'HIGH';
      justification = 'Asset approaching end of life with high failure risk';
    } else if (remainingUsefulLife <= 2 || riskOfFailure >= 40) {
      priority = 'MEDIUM';
      justification = 'Asset should be included in replacement planning';
    } else {
      priority = 'LOW';
      justification = 'Asset in good condition with remaining useful life';
    }

    return { priority, businessImpact, justification };
  }

  private generateAlternativeOptions(
    asset: any,
    remainingUsefulLife: number,
    riskOfFailure: number
  ): string[] {
    const alternatives: string[] = [];

    if (remainingUsefulLife > 2) {
      alternatives.push('Continue current maintenance schedule');
    }

    if (riskOfFailure < 60) {
      alternatives.push('Extend useful life with enhanced maintenance');
    }

    alternatives.push('Replace with similar equipment');
    alternatives.push('Upgrade to newer technology');

    if (asset.category === 'MECHANICAL' || asset.category === 'HVAC') {
      alternatives.push('Consider energy-efficient replacement');
    }

    if (riskOfFailure > 40) {
      alternatives.push('Implement condition-based monitoring');
    }

    return alternatives;
  }

  private estimateReplacementCost(asset: any): number {
    const inflationRate = 0.03;
    const currentDate = new Date();
    const age = asset.purchaseDate 
      ? (currentDate.getTime() - asset.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
      : 0;
    
    return (asset.purchasePrice || 0) * Math.pow(1 + inflationRate, age);
  }
}

export const assetLifecycleService = new AssetLifecycleService();