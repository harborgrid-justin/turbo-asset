import { prisma } from '../config/database';
import { logger } from '../config/logger';

export interface CAMReconciliationData {
  leaseId: string;
  reconciliationPeriod: string; // YYYY for annual, YYYY-MM for monthly
  reconciliationType: 'ANNUAL' | 'MONTHLY' | 'QUARTERLY';
  budgetedCAM: number;
  actualCAM: number;
  tenantSharePercentage: number;
  priorAdjustment?: number;
  credits?: number;
  dueDate?: Date;
  expenses: Array<{
    category: string;
    description: string;
    budgetedAmount: number;
    actualAmount: number;
    allocationMethod?: string;
  }>;
}

export interface CAMReconciliationSummary {
  totalReconciliations: number;
  totalCAMCharges: number;
  totalVariance: number;
  averageVariancePercentage: number;
  disputedAmount: number;
  pendingReconciliations: number;
  completedReconciliations: number;
  reconciliationsByProperty: Array<{
    propertyId: string;
    propertyName: string;
    reconciliationCount: number;
    totalCAM: number;
    totalVariance: number;
  }>;
  monthlyTrends: Array<{
    period: string;
    reconciliationCount: number;
    totalCAM: number;
    variance: number;
  }>;
  expenseCategoryBreakdown: Array<{
    category: string;
    budgetedAmount: number;
    actualAmount: number;
    variance: number;
    variancePercentage: number;
  }>;
}

export interface VarianceAnalysis {
  reconciliationId: string;
  totalVariance: number;
  variancePercentage: number;
  significantVariances: Array<{
    category: string;
    budgetedAmount: number;
    actualAmount: number;
    variance: number;
    variancePercentage: number;
    explanation?: string;
    impact: 'FAVORABLE' | 'UNFAVORABLE';
    significance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  recommendations: string[];
  rootCauseAnalysis: Array<{
    category: string;
    cause: string;
    frequency: number;
    impact: string;
    correctionPlan: string;
  }>;
}

export interface DisputeTrackingData {
  reconciliationId: string;
  disputeReason: string;
  disputedAmount: number;
  supportingDocuments?: string[];
  tenantComments?: string;
  managementResponse?: string;
  resolutionPlan?: string;
  targetResolutionDate?: Date;
}

/**
 * CAMReconciliationService handles CAM reconciliation with variance analysis and dispute tracking
 * Provides comprehensive common area maintenance charge management and tenant billing
 */
export class CAMReconciliationService {

  /**
   * Create a new CAM reconciliation record
   */
  async createCAMReconciliation(data: CAMReconciliationData): Promise<any> {
    try {
      // Validate lease exists
      const lease = await prisma.lease.findUnique({
        where: { id: data.leaseId },
        include: {
          property: true,
          tenant: true
        }
      });

      if (!lease) {
        throw new Error('Lease not found');
      }

      // Calculate variance and reconciliation amounts
      const variance = data.actualCAM - data.budgetedCAM;
      const variancePercent = data.budgetedCAM > 0 ? (variance / data.budgetedCAM) * 100 : 0;
      const tenantCAM = data.actualCAM * (data.tenantSharePercentage / 100);
      const totalOwed = tenantCAM + (data.priorAdjustment || 0) - (data.credits || 0);

      // Determine if this is a refund or additional charge
      const refundDue = totalOwed < 0 ? Math.abs(totalOwed) : 0;
      const additionalRent = totalOwed > 0 ? totalOwed : 0;

      const reconciliation = await prisma.cAMReconciliation.create({
        data: {
          leaseId: data.leaseId,
          reconciliationPeriod: data.reconciliationPeriod,
          reconciliationType: data.reconciliationType,
          totalCAMCharges: data.actualCAM,
          budgetedCAM: data.budgetedCAM,
          actualCAM: data.actualCAM,
          variance,
          variancePercent,
          tenantShare: data.tenantSharePercentage,
          tenantCAM,
          priorAdjustment: data.priorAdjustment || 0,
          totalOwed,
          credits: data.credits || 0,
          additionalRent,
          refundDue,
          reconciliationDate: new Date(),
          dueDate: data.dueDate,
          status: 'DRAFT',
          disputeStatus: 'NO_DISPUTE',
          auditTrail: {
            createdBy: 'system',
            createdDate: new Date(),
            calculations: {
              budgetedCAM: data.budgetedCAM,
              actualCAM: data.actualCAM,
              tenantSharePercentage: data.tenantSharePercentage,
              variance,
              variancePercent
            }
          }
        }
      });

      // Create expense line items
      const expensePromises = data.expenses.map(expense => {
        const expenseVariance = expense.actualAmount - expense.budgetedAmount;
        const expenseVariancePercent = expense.budgetedAmount > 0 ? 
          (expenseVariance / expense.budgetedAmount) * 100 : 0;

        return prisma.cAMExpense.create({
          data: {
            reconciliationId: reconciliation.id,
            expenseCategory: expense.category,
            description: expense.description,
            budgetedAmount: expense.budgetedAmount,
            actualAmount: expense.actualAmount,
            variance: expenseVariance,
            variancePercent: expenseVariancePercent,
            allocationMethod: expense.allocationMethod,
            tenantShare: expense.actualAmount * (data.tenantSharePercentage / 100)
          }
        });
      });

      await Promise.all(expensePromises);

      // Create variance records for significant variances
      await this.createVarianceRecords(reconciliation.id, data.expenses, data.tenantSharePercentage);

      logger.info('CAM reconciliation created', {
        reconciliationId: reconciliation.id,
        leaseId: data.leaseId,
        period: data.reconciliationPeriod,
        totalVariance: variance,
        expenseCount: data.expenses.length
      });

      return reconciliation;
    } catch (error) {
      logger.error('Failed to create CAM reconciliation', error);
      throw error;
    }
  }

  /**
   * Get CAM reconciliation summary for organization
   */
  async getCAMReconciliationSummary(organizationId: string, fiscalYear?: number): Promise<CAMReconciliationSummary> {
    try {
      const whereClause: any = {
        lease: {
          property: {
            organizationId
          }
        }
      };

      if (fiscalYear) {
        whereClause.reconciliationPeriod = {
          startsWith: fiscalYear.toString()
        };
      }

      const reconciliations = await prisma.cAMReconciliation.findMany({
        where: whereClause,
        include: {
          lease: {
            include: {
              property: true,
              tenant: true
            }
          },
          expenses: true
        }
      });

      // Calculate summary statistics
      const totalReconciliations = reconciliations.length;
      const totalCAMCharges = reconciliations.reduce((sum, r) => sum + r.totalCAMCharges, 0);
      const totalVariance = reconciliations.reduce((sum, r) => sum + r.variance, 0);
      const averageVariancePercentage = totalReconciliations > 0 ? 
        reconciliations.reduce((sum, r) => sum + Math.abs(r.variancePercent), 0) / totalReconciliations : 0;
      const disputedAmount = reconciliations
        .filter(r => r.disputeStatus !== 'NO_DISPUTE')
        .reduce((sum, r) => sum + (r.disputeAmount || 0), 0);
      const pendingReconciliations = reconciliations.filter(r => 
        ['DRAFT', 'TENANT_REVIEW'].includes(r.status)
      ).length;
      const completedReconciliations = reconciliations.filter(r => 
        ['FINALIZED', 'PAID'].includes(r.status)
      ).length;

      // Group by property
      const propertyMap = new Map<string, {
        propertyId: string;
        propertyName: string;
        reconciliationCount: number;
        totalCAM: number;
        totalVariance: number;
      }>();

      reconciliations.forEach(r => {
        const propertyId = r.lease.property.id;
        if (!propertyMap.has(propertyId)) {
          propertyMap.set(propertyId, {
            propertyId,
            propertyName: r.lease.property.name,
            reconciliationCount: 0,
            totalCAM: 0,
            totalVariance: 0
          });
        }
        const property = propertyMap.get(propertyId)!;
        property.reconciliationCount++;
        property.totalCAM += r.totalCAMCharges;
        property.totalVariance += r.variance;
      });

      // Generate monthly trends
      const periodMap = new Map<string, {
        period: string;
        reconciliationCount: number;
        totalCAM: number;
        variance: number;
      }>();

      reconciliations.forEach(r => {
        const period = r.reconciliationPeriod.substring(0, 7); // YYYY-MM
        if (!periodMap.has(period)) {
          periodMap.set(period, {
            period,
            reconciliationCount: 0,
            totalCAM: 0,
            variance: 0
          });
        }
        const periodData = periodMap.get(period)!;
        periodData.reconciliationCount++;
        periodData.totalCAM += r.totalCAMCharges;
        periodData.variance += r.variance;
      });

      // Generate expense category breakdown
      const categoryMap = new Map<string, {
        category: string;
        budgetedAmount: number;
        actualAmount: number;
        variance: number;
      }>();

      reconciliations.forEach(r => {
        r.expenses.forEach(e => {
          if (!categoryMap.has(e.expenseCategory)) {
            categoryMap.set(e.expenseCategory, {
              category: e.expenseCategory,
              budgetedAmount: 0,
              actualAmount: 0,
              variance: 0
            });
          }
          const category = categoryMap.get(e.expenseCategory)!;
          category.budgetedAmount += e.budgetedAmount;
          category.actualAmount += e.actualAmount;
          category.variance += e.variance;
        });
      });

      const expenseCategoryBreakdown = Array.from(categoryMap.values()).map(c => ({
        ...c,
        variancePercentage: c.budgetedAmount > 0 ? (c.variance / c.budgetedAmount) * 100 : 0
      }));

      return {
        totalReconciliations,
        totalCAMCharges: Math.round(totalCAMCharges),
        totalVariance: Math.round(totalVariance),
        averageVariancePercentage: Math.round(averageVariancePercentage * 100) / 100,
        disputedAmount: Math.round(disputedAmount),
        pendingReconciliations,
        completedReconciliations,
        reconciliationsByProperty: Array.from(propertyMap.values()),
        monthlyTrends: Array.from(periodMap.values()).sort((a, b) => a.period.localeCompare(b.period)),
        expenseCategoryBreakdown: expenseCategoryBreakdown.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
      };
    } catch (error) {
      logger.error('Failed to get CAM reconciliation summary', error);
      throw error;
    }
  }

  /**
   * Perform variance analysis for a reconciliation
   */
  async performVarianceAnalysis(reconciliationId: string): Promise<VarianceAnalysis> {
    try {
      const reconciliation = await prisma.cAMReconciliation.findUnique({
        where: { id: reconciliationId },
        include: {
          expenses: true,
          variances: true,
          lease: {
            include: {
              property: true,
              tenant: true
            }
          }
        }
      });

      if (!reconciliation) {
        throw new Error('CAM reconciliation not found');
      }

      const totalVariance = reconciliation.variance;
      const variancePercentage = reconciliation.variancePercent;

      // Analyze significant variances (>10% or >$1000)
      const significantVariances = reconciliation.expenses
        .filter(expense => 
          Math.abs(expense.variancePercent) > 10 || Math.abs(expense.variance) > 1000
        )
        .map(expense => ({
          category: expense.expenseCategory,
          budgetedAmount: expense.budgetedAmount,
          actualAmount: expense.actualAmount,
          variance: expense.variance,
          variancePercentage: expense.variancePercent,
          explanation: this.generateVarianceExplanation(expense),
          impact: expense.variance > 0 ? 'UNFAVORABLE' as const : 'FAVORABLE' as const,
          significance: this.determineVarianceSignificance(expense.variance, expense.budgetedAmount)
        }))
        .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

      // Generate recommendations
      const recommendations = this.generateRecommendations(reconciliation, significantVariances);

      // Perform root cause analysis
      const rootCauseAnalysis = this.performRootCauseAnalysis(reconciliation.expenses);

      logger.info('Variance analysis completed', {
        reconciliationId,
        totalVariance,
        significantVarianceCount: significantVariances.length
      });

      return {
        reconciliationId,
        totalVariance: Math.round(totalVariance),
        variancePercentage: Math.round(variancePercentage * 100) / 100,
        significantVariances,
        recommendations,
        rootCauseAnalysis
      };
    } catch (error) {
      logger.error('Failed to perform variance analysis', error);
      throw error;
    }
  }

  /**
   * Process tenant dispute for reconciliation
   */
  async processDispute(disputeData: DisputeTrackingData): Promise<any> {
    try {
      const reconciliation = await prisma.cAMReconciliation.findUnique({
        where: { id: disputeData.reconciliationId }
      });

      if (!reconciliation) {
        throw new Error('CAM reconciliation not found');
      }

      const updatedReconciliation = await prisma.cAMReconciliation.update({
        where: { id: disputeData.reconciliationId },
        data: {
          disputeStatus: 'DISPUTED',
          disputeReason: disputeData.disputeReason,
          disputeAmount: disputeData.disputedAmount,
          disputeDate: new Date(),
          resolutionDate: null,
          auditTrail: {
            ...reconciliation.auditTrail as any,
            disputeHistory: [
              ...((reconciliation.auditTrail as any)?.disputeHistory || []),
              {
                date: new Date(),
                action: 'DISPUTE_FILED',
                reason: disputeData.disputeReason,
                amount: disputeData.disputedAmount,
                documents: disputeData.supportingDocuments || []
              }
            ]
          }
        }
      });

      // Create variance record for disputed amount
      await prisma.cAMVariance.create({
        data: {
          reconciliationId: disputeData.reconciliationId,
          varianceType: 'BUDGET',
          category: 'DISPUTED_CHARGES',
          description: `Tenant dispute: ${disputeData.disputeReason}`,
          amount: disputeData.disputedAmount,
          percentage: reconciliation.totalCAMCharges > 0 ? 
            (disputeData.disputedAmount / reconciliation.totalCAMCharges) * 100 : 0,
          reason: disputeData.disputeReason,
          impact: 'Tenant has disputed charges, resolution required',
          actionPlan: disputeData.resolutionPlan || 'Review dispute and provide documentation',
          responsible: 'Property Manager',
          status: 'OPEN'
        }
      });

      // Create critical date for dispute resolution
      if (disputeData.targetResolutionDate) {
        await prisma.criticalDate.create({
          data: {
            dateType: 'CAM_RECONCILIATION',
            dateValue: disputeData.targetResolutionDate,
            description: `Resolve CAM dispute for reconciliation ${disputeData.reconciliationId}`,
            importance: 'HIGH',
            alertDays: [30, 14, 7, 1],
            actionRequired: `Review and resolve tenant dispute for $${disputeData.disputedAmount}`
          }
        });
      }

      logger.info('CAM dispute processed', {
        reconciliationId: disputeData.reconciliationId,
        disputedAmount: disputeData.disputedAmount,
        reason: disputeData.disputeReason
      });

      return updatedReconciliation;
    } catch (error) {
      logger.error('Failed to process CAM dispute', error);
      throw error;
    }
  }

  /**
   * Resolve dispute and finalize reconciliation
   */
  async resolveDispute(
    reconciliationId: string, 
    resolution: {
      adjustedAmount?: number;
      resolutionNotes: string;
      documentsProvided?: string[];
      tenantAgreement: boolean;
    }
  ): Promise<any> {
    try {
      const reconciliation = await prisma.cAMReconciliation.findUnique({
        where: { id: reconciliationId }
      });

      if (!reconciliation) {
        throw new Error('CAM reconciliation not found');
      }

      const newStatus = resolution.tenantAgreement ? 'RESOLVED' : 'MEDIATION';
      const finalAmount = resolution.adjustedAmount !== undefined ? 
        resolution.adjustedAmount : reconciliation.totalOwed;

      const updatedReconciliation = await prisma.cAMReconciliation.update({
        where: { id: reconciliationId },
        data: {
          disputeStatus: newStatus,
          resolutionDate: new Date(),
          totalOwed: finalAmount,
          additionalRent: finalAmount > 0 ? finalAmount : 0,
          refundDue: finalAmount < 0 ? Math.abs(finalAmount) : 0,
          auditTrail: {
            ...reconciliation.auditTrail as any,
            disputeHistory: [
              ...((reconciliation.auditTrail as any)?.disputeHistory || []),
              {
                date: new Date(),
                action: 'DISPUTE_RESOLVED',
                resolution: newStatus,
                finalAmount,
                notes: resolution.resolutionNotes,
                documents: resolution.documentsProvided || []
              }
            ]
          }
        }
      });

      // Update variance records
      await prisma.cAMVariance.updateMany({
        where: {
          reconciliationId,
          category: 'DISPUTED_CHARGES',
          status: 'OPEN'
        },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolvedBy: 'system' // Would be actual user
        }
      });

      // Mark critical dates as completed
      await prisma.criticalDate.updateMany({
        where: {
          description: { contains: reconciliationId },
          isCompleted: false
        },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          completedBy: 'system'
        }
      });

      logger.info('CAM dispute resolved', {
        reconciliationId,
        resolution: newStatus,
        finalAmount
      });

      return updatedReconciliation;
    } catch (error) {
      logger.error('Failed to resolve CAM dispute', error);
      throw error;
    }
  }

  /**
   * Generate CAM reconciliation report
   */
  async generateCAMReport(
    organizationId: string, 
    reportType: string, 
    filters: any = {}
  ): Promise<any> {
    try {
      switch (reportType) {
        case 'RECONCILIATION_SUMMARY':
          return await this.generateReconciliationSummaryReport(organizationId, filters);
        case 'VARIANCE_ANALYSIS':
          return await this.generateVarianceAnalysisReport(organizationId, filters);
        case 'DISPUTE_TRACKING':
          return await this.generateDisputeTrackingReport(organizationId, filters);
        case 'TENANT_BILLING':
          return await this.generateTenantBillingReport(organizationId, filters);
        default:
          throw new Error('Invalid report type');
      }
    } catch (error) {
      logger.error('Failed to generate CAM report', error);
      throw error;
    }
  }

  /**
   * Bulk process reconciliations for multiple properties
   */
  async bulkProcessReconciliations(
    organizationId: string,
    reconciliationPeriod: string,
    propertyIds?: string[]
  ): Promise<any> {
    try {
      logger.info('Starting bulk CAM reconciliation processing', {
        organizationId,
        reconciliationPeriod,
        propertyCount: propertyIds?.length || 'all'
      });

      const whereClause: any = {
        property: {
          organizationId,
          isActive: true
        },
        status: 'ACTIVE'
      };

      if (propertyIds?.length) {
        whereClause.property.id = { in: propertyIds };
      }

      const leases = await prisma.lease.findMany({
        where: whereClause,
        include: {
          property: true,
          tenant: true
        }
      });

      const results = [];
      let processed = 0;
      let errors = 0;

      for (const lease of leases) {
        try {
          // Check if reconciliation already exists
          const existingReconciliation = await prisma.cAMReconciliation.findFirst({
            where: {
              leaseId: lease.id,
              reconciliationPeriod
            }
          });

          if (existingReconciliation) {
            results.push({
              leaseId: lease.id,
              status: 'SKIPPED',
              reason: 'Reconciliation already exists'
            });
            continue;
          }

          // Generate reconciliation data based on lease terms and property expenses
          const reconciliationData = await this.generateReconciliationDataForLease(
            lease, 
            reconciliationPeriod
          );

          const reconciliation = await this.createCAMReconciliation(reconciliationData);

          results.push({
            leaseId: lease.id,
            reconciliationId: reconciliation.id,
            status: 'SUCCESS',
            totalCAM: reconciliation.totalCAMCharges,
            variance: reconciliation.variance
          });

          processed++;
        } catch (error) {
          logger.error('Failed to process reconciliation for lease', {
            leaseId: lease.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          results.push({
            leaseId: lease.id,
            status: 'ERROR',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          errors++;
        }
      }

      logger.info('Bulk CAM reconciliation processing completed', {
        total: leases.length,
        processed,
        errors,
        skipped: leases.length - processed - errors
      });

      return {
        summary: {
          totalLeases: leases.length,
          processed,
          errors,
          skipped: leases.length - processed - errors
        },
        results
      };
    } catch (error) {
      logger.error('Failed to bulk process reconciliations', error);
      throw error;
    }
  }

  // Private helper methods

  private async createVarianceRecords(
    reconciliationId: string, 
    expenses: any[], 
    tenantSharePercentage: number
  ): Promise<void> {
    const significantVariances = expenses.filter(expense => {
      const variance = expense.actualAmount - expense.budgetedAmount;
      const variancePercent = expense.budgetedAmount > 0 ? (variance / expense.budgetedAmount) * 100 : 0;
      return Math.abs(variancePercent) > 15 || Math.abs(variance) > 2000; // Significant thresholds
    });

    const variancePromises = significantVariances.map(expense => {
      const variance = expense.actualAmount - expense.budgetedAmount;
      const variancePercent = expense.budgetedAmount > 0 ? (variance / expense.budgetedAmount) * 100 : 0;

      return prisma.cAMVariance.create({
        data: {
          reconciliationId,
          varianceType: 'BUDGET',
          category: expense.category,
          description: `Significant variance in ${expense.category}: ${expense.description}`,
          amount: variance,
          percentage: variancePercent,
          reason: this.determineVarianceReason(expense.category, variancePercent),
          impact: this.assessVarianceImpact(variance, tenantSharePercentage),
          actionPlan: this.generateActionPlan(expense.category, variance),
          responsible: 'Property Manager',
          status: 'OPEN'
        }
      });
    });

    await Promise.all(variancePromises);
  }

  private generateVarianceExplanation(expense: any): string {
    const variancePercent = Math.abs(expense.variancePercent);
    const category = expense.expenseCategory.toLowerCase();

    if (variancePercent > 50) {
      return `Extreme variance in ${expense.expenseCategory}. Requires immediate investigation.`;
    } else if (variancePercent > 25) {
      return `High variance in ${expense.expenseCategory}. Review actual vs budgeted expenses.`;
    } else if (category.includes('utility') && variancePercent > 15) {
      return 'Utility variance may be due to seasonal changes or rate increases.';
    } else if (category.includes('maintenance') && variancePercent > 20) {
      return 'Maintenance variance could indicate deferred maintenance or emergency repairs.';
    } else {
      return 'Variance within acceptable range but should be monitored.';
    }
  }

  private determineVarianceSignificance(variance: number, budgetedAmount: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const variancePercent = Math.abs(budgetedAmount > 0 ? (variance / budgetedAmount) * 100 : 0);
    const absoluteVariance = Math.abs(variance);

    if (variancePercent > 50 || absoluteVariance > 10000) {
      return 'CRITICAL';
    } else if (variancePercent > 25 || absoluteVariance > 5000) {
      return 'HIGH';
    } else if (variancePercent > 15 || absoluteVariance > 2000) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  private generateRecommendations(reconciliation: any, significantVariances: any[]): string[] {
    const recommendations = [];

    if (Math.abs(reconciliation.variancePercent) > 20) {
      recommendations.push('Conduct detailed review of budget vs actual expenses');
      recommendations.push('Consider adjusting budget assumptions for next period');
    }

    if (significantVariances.length > 3) {
      recommendations.push('Multiple significant variances detected - review budgeting process');
    }

    significantVariances.forEach(variance => {
      if (variance.category.toLowerCase().includes('utility')) {
        recommendations.push('Review utility usage patterns and consider energy efficiency improvements');
      }
      if (variance.category.toLowerCase().includes('maintenance')) {
        recommendations.push('Evaluate maintenance scheduling and preventive maintenance programs');
      }
    });

    if (reconciliation.totalOwed > 5000) {
      recommendations.push('Consider payment plan options for large additional charges');
    }

    if (recommendations.length === 0) {
      recommendations.push('Variances are within acceptable ranges - continue monitoring');
    }

    return recommendations;
  }

  private performRootCauseAnalysis(expenses: any[]): any[] {
    const categoryAnalysis = new Map();

    expenses.forEach(expense => {
      if (!categoryAnalysis.has(expense.expenseCategory)) {
        categoryAnalysis.set(expense.expenseCategory, {
          category: expense.expenseCategory,
          occurrences: 0,
          totalVariance: 0,
          commonCauses: []
        });
      }

      const analysis = categoryAnalysis.get(expense.expenseCategory);
      analysis.occurrences++;
      analysis.totalVariance += Math.abs(expense.variance);

      // Determine likely causes based on category and variance pattern
      const variancePercent = Math.abs(expense.variancePercent);
      if (expense.expenseCategory.toLowerCase().includes('utility') && variancePercent > 15) {
        analysis.commonCauses.push('Weather variations');
        analysis.commonCauses.push('Rate increases');
      }
      if (expense.expenseCategory.toLowerCase().includes('maintenance') && variancePercent > 20) {
        analysis.commonCauses.push('Emergency repairs');
        analysis.commonCauses.push('Deferred maintenance');
      }
    });

    return Array.from(categoryAnalysis.values()).map(analysis => ({
      category: analysis.category,
      cause: analysis.commonCauses.length > 0 ? 
        analysis.commonCauses[0] : 'Budget estimation accuracy',
      frequency: analysis.occurrences,
      impact: analysis.totalVariance > 5000 ? 'High' : 
              analysis.totalVariance > 2000 ? 'Medium' : 'Low',
      correctionPlan: this.generateCorrectionPlan(analysis.category, analysis.totalVariance)
    }));
  }

  private determineVarianceReason(category: string, variancePercent: number): string {
    if (category.toLowerCase().includes('utility')) {
      return variancePercent > 0 ? 'Higher than expected utility usage' : 'Lower utility consumption';
    } else if (category.toLowerCase().includes('maintenance')) {
      return variancePercent > 0 ? 'Unplanned maintenance expenses' : 'Deferred maintenance';
    } else if (category.toLowerCase().includes('insurance')) {
      return variancePercent > 0 ? 'Premium increases' : 'Premium reductions';
    } else {
      return variancePercent > 0 ? 'Higher than budgeted expenses' : 'Cost savings achieved';
    }
  }

  private assessVarianceImpact(variance: number, tenantSharePercentage: number): string {
    const tenantImpact = variance * (tenantSharePercentage / 100);
    const absoluteImpact = Math.abs(tenantImpact);

    if (absoluteImpact > 5000) {
      return `High tenant impact: $${absoluteImpact.toFixed(2)} ${variance > 0 ? 'additional charge' : 'credit'}`;
    } else if (absoluteImpact > 2000) {
      return `Medium tenant impact: $${absoluteImpact.toFixed(2)} ${variance > 0 ? 'additional charge' : 'credit'}`;
    } else {
      return `Low tenant impact: $${absoluteImpact.toFixed(2)} ${variance > 0 ? 'additional charge' : 'credit'}`;
    }
  }

  private generateActionPlan(category: string, variance: number): string {
    if (category.toLowerCase().includes('utility') && variance > 1000) {
      return 'Review utility bills for accuracy, investigate usage patterns, consider energy audit';
    } else if (category.toLowerCase().includes('maintenance') && variance > 2000) {
      return 'Review maintenance contracts, evaluate preventive maintenance program';
    } else if (Math.abs(variance) > 5000) {
      return 'Conduct detailed expense review, update budget assumptions, implement better tracking';
    } else {
      return 'Monitor trend in future reconciliations, adjust budget if pattern continues';
    }
  }

  private generateCorrectionPlan(category: string, totalVariance: number): string {
    if (category.toLowerCase().includes('utility')) {
      return 'Implement energy management system, review utility contracts';
    } else if (category.toLowerCase().includes('maintenance')) {
      return 'Develop preventive maintenance schedule, negotiate maintenance contracts';
    } else if (totalVariance > 10000) {
      return 'Comprehensive budget review and revision process';
    } else {
      return 'Enhanced monthly tracking and budget monitoring';
    }
  }

  private async generateReconciliationDataForLease(lease: any, period: string): Promise<CAMReconciliationData> {
    // This would normally pull from actual expense tracking systems
    // For demo purposes, we'll generate sample data based on lease terms

    const baseCam = lease.baseLease * 0.3; // Assume CAM is 30% of base rent
    const budgetedCAM = baseCam * 12; // Annual budget
    const actualCAM = budgetedCAM * (0.95 + Math.random() * 0.15); // +/- 10% variance

    const expenses = [
      {
        category: 'Utilities',
        description: 'Electricity, water, gas',
        budgetedAmount: budgetedCAM * 0.40,
        actualAmount: budgetedCAM * 0.40 * (0.9 + Math.random() * 0.2)
      },
      {
        category: 'Maintenance',
        description: 'General maintenance and repairs',
        budgetedAmount: budgetedCAM * 0.30,
        actualAmount: budgetedCAM * 0.30 * (0.85 + Math.random() * 0.3)
      },
      {
        category: 'Insurance',
        description: 'Property insurance',
        budgetedAmount: budgetedCAM * 0.15,
        actualAmount: budgetedCAM * 0.15 * (0.95 + Math.random() * 0.1)
      },
      {
        category: 'Management',
        description: 'Property management fees',
        budgetedAmount: budgetedCAM * 0.15,
        actualAmount: budgetedCAM * 0.15 * (0.98 + Math.random() * 0.04)
      }
    ];

    return {
      leaseId: lease.id,
      reconciliationPeriod: period,
      reconciliationType: 'ANNUAL',
      budgetedCAM,
      actualCAM,
      tenantSharePercentage: 100, // Assuming single tenant or pro-rata calculation already done
      expenses
    };
  }

  private async generateReconciliationSummaryReport(organizationId: string, filters: any): Promise<any> {
    const summary = await this.getCAMReconciliationSummary(organizationId, filters.fiscalYear);
    
    return {
      reportType: 'RECONCILIATION_SUMMARY',
      generatedDate: new Date(),
      parameters: { organizationId, fiscalYear: filters.fiscalYear },
      summary,
      recommendations: [
        summary.averageVariancePercentage > 15 ? 
          'Average variance exceeds 15% - review budgeting accuracy' : 
          'Variance levels are acceptable',
        summary.disputedAmount > 50000 ? 
          'High disputed amounts - improve documentation and communication' : 
          'Dispute levels are manageable',
        'Continue monitoring monthly trends for early variance detection'
      ]
    };
  }

  private async generateVarianceAnalysisReport(organizationId: string, filters: any): Promise<any> {
    // Implementation for detailed variance analysis report
    return {
      reportType: 'VARIANCE_ANALYSIS',
      generatedDate: new Date(),
      // ... detailed variance analysis implementation
    };
  }

  private async generateDisputeTrackingReport(organizationId: string, filters: any): Promise<any> {
    // Implementation for dispute tracking report
    return {
      reportType: 'DISPUTE_TRACKING',
      generatedDate: new Date(),
      // ... detailed dispute tracking implementation
    };
  }

  private async generateTenantBillingReport(organizationId: string, filters: any): Promise<any> {
    // Implementation for tenant billing report
    return {
      reportType: 'TENANT_BILLING',
      generatedDate: new Date(),
      // ... detailed tenant billing implementation
    };
  }
}