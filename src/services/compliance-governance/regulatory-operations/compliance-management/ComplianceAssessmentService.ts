/**
 * Compliance Assessment Service - Regulatory compliance management
 * 
 * This service handles comprehensive compliance assessments, regulatory
 * reporting, lease accounting standards (ASC842/IFRS16), and audit trails.
 * Migrated from legacy ComplianceService with enhanced domain architecture.
 */

import { EventEmitter } from 'events';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { 
  ComplianceRule,
  ComplianceAssessment,
  ComplianceFinding,
  ComplianceContext,
  AuditTrail
} from './types/ComplianceTypes';
import { 
  COMPLIANCE_CONSTANTS,
  EVENTS,
  ERROR_CODES
} from './constants/ComplianceConstants';

export interface ComplianceCalculationData {
  leaseId: string;
  accountingStandard: 'ASC842' | 'IFRS16';
  fiscalYear: number;
  fiscalPeriod: number;
  incrementalBorrowingRate: number;
  leasePayments: Array<{
    period: number;
    amount: number;
    paymentDate: Date;
    isFixed: boolean;
  }>;
  initialDirectCosts?: number;
  prepaidLeasePayments?: number;
  leaseIncentivesReceived?: number;
  residualValueGuarantee?: number;
  purchaseOption?: {
    exerciseProbability: number;
    exercisePrice: number;
  };
  terminationPenalty?: {
    penaltyProbability: number;
    penaltyAmount: number;
  };
}

export interface LeaseAccountingResult {
  rightOfUseAsset: number;
  leaseLiability: number;
  presentValue: number;
  monthlyDepreciation: number;
  monthlyInterest: number;
  totalCost: number;
  journalEntries: Array<{
    period: number;
    date: Date;
    entries: Array<{
      accountCode: string;
      accountName: string;
      debit?: number;
      credit?: number;
    }>;
  }>;
}

export interface ComplianceReport {
  organizationId: string;
  reportingPeriod: string;
  accountingStandard: string;
  totalRightOfUseAssets: number;
  totalLeaseLiabilities: number;
  totalLeaseExpense: number;
  cashPaidForLeases: number;
  newLeaseCommitments: number;
  leaseModifications: number;
  leaseTerminations: number;
  weightedAverageDiscountRate: number;
  weightedAverageRemainingTerm: number;
  maturityAnalysis: {
    year1: number;
    year2: number;
    year3: number;
    year4: number;
    year5: number;
    thereafter: number;
  };
  leaseDetails: Array<{
    leaseId: string;
    leaseNumber: string;
    tenantName: string;
    rightOfUseAsset: number;
    leaseLiability: number;
    leaseExpense: number;
    remainingTerm: number;
  }>;
}

export interface JournalEntryTemplate {
  entryType: string;
  description: string;
  accounts: Array<{
    accountCode: string;
    accountName: string;
    debitFormula?: string;
    creditFormula?: string;
    isDebit: boolean;
  }>;
}

/**
 * ComplianceAssessmentService handles ASC 842/IFRS 16 compliance with automated journal entries
 * Provides comprehensive lease accounting calculations and compliance reporting
 * Migrated from legacy ComplianceService with enhanced domain architecture
 */
export class ComplianceAssessmentService extends EventEmitter {
  private readonly complianceCache: Map<string, ComplianceAssessment> = new Map();
  private readonly context?: ComplianceContext;
  
  private readonly journalEntryTemplates: Map<string, JournalEntryTemplate> = new Map([
    ['INITIAL_RECOGNITION', {
      entryType: 'INITIAL_RECOGNITION',
      description: 'Initial recognition of lease liability and ROU asset',
      accounts: [
        { accountCode: '1650', accountName: 'Right-of-Use Asset', isDebit: true },
        { accountCode: '2350', accountName: 'Lease Liability', isDebit: false }
      ]
    }],
    ['MONTHLY_EXPENSE', {
      entryType: 'MONTHLY_EXPENSE',
      description: 'Monthly lease expense recognition',
      accounts: [
        { accountCode: '6100', accountName: 'Lease Expense', isDebit: true },
        { accountCode: '1001', accountName: 'Cash', isDebit: false }
      ]
    }],
    ['MONTHLY_AMORTIZATION', {
      entryType: 'MONTHLY_AMORTIZATION',
      description: 'Monthly ROU asset amortization',
      accounts: [
        { accountCode: '6200', accountName: 'Amortization Expense', isDebit: true },
        { accountCode: '1651', accountName: 'Accumulated Amortization - ROU Asset', isDebit: false }
      ]
    }],
    ['MONTHLY_INTEREST', {
      entryType: 'MONTHLY_INTEREST',
      description: 'Monthly interest on lease liability',
      accounts: [
        { accountCode: '6300', accountName: 'Interest Expense', isDebit: true },
        { accountCode: '2350', accountName: 'Lease Liability', isDebit: false }
      ]
    }],
    ['LEASE_PAYMENT', {
      entryType: 'LEASE_PAYMENT',
      description: 'Lease payment against liability',
      accounts: [
        { accountCode: '2350', accountName: 'Lease Liability', isDebit: true },
        { accountCode: '1001', accountName: 'Cash', isDebit: false }
      ]
    }]
  ]);

  constructor(context?: ComplianceContext) {
    super();
    this.context = context;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.on(EVENTS.COMPLIANCE_ASSESSMENT_CREATED, this.handleAssessmentCreated.bind(this));
    this.on(EVENTS.LEASE_CALCULATION_COMPLETED, this.handleLeaseCalculationCompleted.bind(this));
  }

  /**
   * Calculate lease accounting under ASC 842 or IFRS 16
   */
  async calculateLeaseAccounting(data: ComplianceCalculationData): Promise<LeaseAccountingResult> {
    try {
      logger.info('Starting lease accounting calculation', {
        leaseId: data.leaseId,
        standard: data.accountingStandard,
        fiscalPeriod: `${data.fiscalYear}-${data.fiscalPeriod}`
      });

      // Get lease details
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

      // Calculate present value of lease payments
      const presentValue = this.calculatePresentValue(
        data.leasePayments,
        data.incrementalBorrowingRate
      );

      // Calculate initial ROU asset value
      let rightOfUseAsset = presentValue;
      
      if (data.initialDirectCosts) {
        rightOfUseAsset += data.initialDirectCosts;
      }
      
      if (data.prepaidLeasePayments) {
        rightOfUseAsset += data.prepaidLeasePayments;
      }
      
      if (data.leaseIncentivesReceived) {
        rightOfUseAsset -= data.leaseIncentivesReceived;
      }

      // Initial lease liability equals present value
      const leaseLiability = presentValue;

      // Calculate monthly depreciation (straight-line over lease term)
      const leaseTermMonths = this.calculateLeaseTermMonths(lease);
      const monthlyDepreciation = rightOfUseAsset / leaseTermMonths;

      // Calculate total cost over lease term
      const totalCashPayments = data.leasePayments.reduce((sum, payment) => sum + payment.amount, 0);
      const totalCost = totalCashPayments + (data.initialDirectCosts || 0);

      // Generate amortization schedule and journal entries
      const journalEntries = this.generateJournalEntries(
        data,
        rightOfUseAsset,
        leaseLiability,
        monthlyDepreciation,
        leaseTermMonths
      );

      // Calculate average monthly interest (simplified)
      const totalInterest = totalCashPayments - presentValue;
      const monthlyInterest = totalInterest / leaseTermMonths;

      const result: LeaseAccountingResult = {
        rightOfUseAsset: Math.round(rightOfUseAsset * 100) / 100,
        leaseLiability: Math.round(leaseLiability * 100) / 100,
        presentValue: Math.round(presentValue * 100) / 100,
        monthlyDepreciation: Math.round(monthlyDepreciation * 100) / 100,
        monthlyInterest: Math.round(monthlyInterest * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        journalEntries
      };

      logger.info('Lease accounting calculation completed', {
        leaseId: data.leaseId,
        rightOfUseAsset: result.rightOfUseAsset,
        leaseLiability: result.leaseLiability
      });

      this.emit(EVENTS.LEASE_CALCULATION_COMPLETED, { leaseId: data.leaseId, result });
      return result;
    } catch (error: unknown) {
      logger.error('Failed to calculate lease accounting', error);
      throw error;
    }
  }

  /**
   * Create compliance assessment
   */
  async createComplianceAssessment(
    organizationId: string,
    framework: string,
    scopeAreas: string[],
    createdBy: string
  ): Promise<ComplianceAssessment> {
    try {
      const assessment: ComplianceAssessment = {
        id: `assessment-${Date.now()}`,
        organizationId,
        framework,
        scopeAreas,
        status: 'DRAFT',
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.complianceCache.set(assessment.id, assessment);
      
      this.emit(EVENTS.COMPLIANCE_ASSESSMENT_CREATED, { 
        assessmentId: assessment.id, 
        organizationId, 
        framework 
      });

      logger.info('Compliance assessment created', {
        assessmentId: assessment.id,
        framework,
        organizationId
      });

      return assessment;
    } catch (error: unknown) {
      logger.error('Failed to create compliance assessment', error);
      throw error;
    }
  }

  private calculatePresentValue(
    payments: Array<{ period: number; amount: number; paymentDate: Date; isFixed: boolean }>,
    discountRate: number
  ): number {
    return payments.reduce((pv, payment) => {
      const periodRate = discountRate / 12; // Monthly rate
      const discountFactor = 1 / Math.pow(1 + periodRate, payment.period);
      return pv + (payment.amount * discountFactor);
    }, 0);
  }

  private calculateLeaseTermMonths(lease: any): number {
    const startDate = new Date(lease.startDate);
    const endDate = new Date(lease.endDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 30.44); // Average days per month
  }

  private generateJournalEntries(
    data: ComplianceCalculationData,
    rightOfUseAsset: number,
    leaseLiability: number,
    monthlyDepreciation: number,
    leaseTermMonths: number
  ): any[] {
    const entries = [];
    
    // Initial recognition entry
    entries.push({
      period: 1,
      date: new Date(),
      entries: [
        {
          accountCode: '1650',
          accountName: 'Right-of-Use Asset',
          debit: rightOfUseAsset
        },
        {
          accountCode: '2350',
          accountName: 'Lease Liability',
          credit: leaseLiability
        }
      ]
    });

    // Monthly depreciation entries (sample for first few months)
    for (let period = 2; period <= Math.min(13, leaseTermMonths + 1); period++) {
      entries.push({
        period,
        date: new Date(2024, period - 2, 1),
        entries: [
          {
            accountCode: '6200',
            accountName: 'Amortization Expense',
            debit: monthlyDepreciation
          },
          {
            accountCode: '1651',
            accountName: 'Accumulated Amortization - ROU Asset',
            credit: monthlyDepreciation
          }
        ]
      });
    }

    return entries;
  }

  private handleAssessmentCreated(eventData: any): void {
    logger.info('Compliance assessment created event processed', eventData);
  }

  private handleLeaseCalculationCompleted(eventData: any): void {
    logger.info('Lease calculation completed event processed', eventData);
  }

  clearCaches(): void {
    this.complianceCache.clear();
    logger.info('ComplianceAssessmentService caches cleared');
  }
}