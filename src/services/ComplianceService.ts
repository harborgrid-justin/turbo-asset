import { prisma } from '../config/database';
import { logger } from '@/config/logger';

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
 * ComplianceService handles ASC 842/IFRS 16 compliance with automated journal entries
 * Provides comprehensive lease accounting calculations and compliance reporting
 */
export class ComplianceService {
  
  private journalEntryTemplates: Map<string, JournalEntryTemplate> = new Map([
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
      
      // Add initial direct costs
      if (data.initialDirectCosts) {
        rightOfUseAsset += data.initialDirectCosts;
      }
      
      // Add prepaid lease payments
      if (data.prepaidLeasePayments) {
        rightOfUseAsset += data.prepaidLeasePayments;
      }
      
      // Subtract lease incentives received
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

      return result;
    } catch (error: unknown) {
      logger.error('Failed to calculate lease accounting', error);
      throw error;
    }
  }

  /**
   * Create lease accounting record with journal entries
   */
  async createLeaseAccountingRecord(
    calculationData: ComplianceCalculationData,
    calculationResult: LeaseAccountingResult,
    approvalWorkflow: boolean = true
  ): Promise<any> {
    try {
      // Create lease accounting record
      const accountingRecord = await prisma.leaseAccounting.create({
        data: {
          leaseId: calculationData.leaseId,
          accountingStandard: calculationData.accountingStandard,
          fiscalYear: calculationData.fiscalYear,
          fiscalPeriod: calculationData.fiscalPeriod,
          rightOfUseAsset: calculationResult.rightOfUseAsset,
          leaseLIABILITY: calculationResult.leaseLiability,
          presentValue: calculationResult.presentValue,
          discountRate: calculationData.incrementalBorrowingRate,
          fixedPayments: calculationData.leasePayments
            .filter(p => p.isFixed)
            .reduce((sum, p) => sum + p.amount, 0),
          variablePayments: calculationData.leasePayments
            .filter(p => !p.isFixed)
            .reduce((sum, p) => sum + p.amount, 0),
          residualValue: calculationData.residualValueGuarantee || 0,
          amortization: calculationResult.monthlyDepreciation,
          interestExpense: calculationResult.monthlyInterest,
          status: approvalWorkflow ? 'DRAFT' : 'CALCULATED',
          calculations: {
            leasePayments: calculationData.leasePayments,
            initialDirectCosts: calculationData.initialDirectCosts,
            prepaidPayments: calculationData.prepaidLeasePayments,
            incentivesReceived: calculationData.leaseIncentivesReceived,
            purchaseOption: calculationData.purchaseOption,
            terminationPenalty: calculationData.terminationPenalty
          }
        }
      });

      // Create journal entries
      const journalEntryIds = [];
      for (const journalEntry of calculationResult.journalEntries) {
        const entryId = await this.createJournalEntry(
          accountingRecord.id,
          journalEntry,
          approvalWorkflow
        );
        journalEntryIds.push(entryId);
      }

      logger.info('Lease accounting record created', {
        accountingRecordId: accountingRecord.id,
        journalEntriesCount: journalEntryIds.length
      });

      return {
        ...accountingRecord,
        journalEntryIds
      };
    } catch (error: unknown) {
      logger.error('Failed to create lease accounting record', error);
      throw error;
    }
  }

  /**
   * Process bulk lease accounting calculations for period-end
   */
  async processBulkLeaseAccounting(
    organizationId: string,
    fiscalYear: number,
    fiscalPeriod: number,
    accountingStandard: 'ASC842' | 'IFRS16' = 'ASC842'
  ): Promise<any> {
    try {
      logger.info('Starting bulk lease accounting processing', {
        organizationId,
        fiscalYear,
        fiscalPeriod,
        accountingStandard
      });

      // Get all active leases for the organization
      const leases = await prisma.lease.findMany({
        where: {
          property: {
            organizationId,
            isActive: true
          },
          status: 'ACTIVE'
        },
        include: {
          property: true,
          tenant: true,
          payments: {
            where: {
              paymentDate: {
                gte: new Date(fiscalYear, fiscalPeriod - 1, 1),
                lt: new Date(fiscalYear, fiscalPeriod, 1)
              }
            }
          }
        }
      });

      const results = [];
      let processed = 0;
      let errors = 0;

      for (const lease of leases) {
        try {
          // Check if accounting record already exists for this period
          const existingRecord = await prisma.leaseAccounting.findFirst({
            where: {
              leaseId: lease.id,
              fiscalYear,
              fiscalPeriod
            }
          });

          if (existingRecord) {
            logger.info('Accounting record already exists', {
              leaseId: lease.id,
              recordId: existingRecord.id
            });
            continue;
          }

          // Generate lease payments schedule from existing payments and lease terms
          const leasePayments = this.generateLeasePaymentSchedule(lease);

          const calculationData: ComplianceCalculationData = {
            leaseId: lease.id,
            accountingStandard,
            fiscalYear,
            fiscalPeriod,
            incrementalBorrowingRate: 0.05, // 5% default - should be configurable
            leasePayments,
            initialDirectCosts: 0,
            prepaidLeasePayments: 0,
            leaseIncentivesReceived: 0
          };

          // Calculate lease accounting
          const calculationResult = await this.calculateLeaseAccounting(calculationData);

          // Create accounting record
          const accountingRecord = await this.createLeaseAccountingRecord(
            calculationData,
            calculationResult,
            false // Skip approval workflow for bulk processing
          );

          results.push({
            leaseId: lease.id,
            leaseNumber: lease.leaseNumber,
            accountingRecordId: accountingRecord.id,
            rightOfUseAsset: calculationResult.rightOfUseAsset,
            leaseLiability: calculationResult.leaseLiability,
            status: 'SUCCESS'
          });

          processed++;
        } catch (error: unknown) {
          logger.error('Failed to process lease accounting', {
            leaseId: lease.id,
            error: error instanceof Error ? (error as Error).message : 'Unknown error'
          });
          
          results.push({
            leaseId: lease.id,
            leaseNumber: lease.leaseNumber,
            status: 'ERROR',
            error: error instanceof Error ? (error as Error).message : 'Unknown error'
          });
          
          errors++;
        }
      }

      logger.info('Bulk lease accounting processing completed', {
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
    } catch (error: unknown) {
      logger.error('Failed to process bulk lease accounting', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive compliance report
   */
  async generateComplianceReport(
    organizationId: string,
    reportingPeriod: string,
    accountingStandard: 'ASC842' | 'IFRS16' = 'ASC842'
  ): Promise<ComplianceReport> {
    try {
      const [year, period] = reportingPeriod.split('-').map(Number);

      // Get all lease accounting records for the period
      const accountingRecords = await prisma.leaseAccounting.findMany({
        where: {
          fiscalYear: year,
          fiscalPeriod: period,
          accountingStandard,
          lease: {
            property: {
              organizationId
            }
          }
        },
        include: {
          lease: {
            include: {
              property: true,
              tenant: true
            }
          }
        }
      });

      // Calculate totals
      const totalRightOfUseAssets = accountingRecords.reduce(
        (sum, record) => sum + (record.rightOfUseAsset || 0), 0
      );
      
      const totalLeaseLiabilities = accountingRecords.reduce(
        (sum, record) => sum + (record.leaseLIABILITY || 0), 0
      );

      const totalLeaseExpense = accountingRecords.reduce(
        (sum, record) => sum + ((record.amortization || 0) + (record.interestExpense || 0)), 0
      );

      // Get cash payments for the period
      const cashPaidForLeases = await this.getCashPaidForLeases(organizationId, year, period);

      // Get new lease commitments
      const newLeaseCommitments = await this.getNewLeaseCommitments(organizationId, year, period);

      // Calculate weighted averages
      const weightedAverageDiscountRate = this.calculateWeightedAverageDiscountRate(accountingRecords);
      const weightedAverageRemainingTerm = await this.calculateWeightedAverageRemainingTerm(accountingRecords);

      // Generate maturity analysis
      const maturityAnalysis = await this.generateMaturityAnalysis(organizationId, accountingStandard);

      // Prepare lease details
      const leaseDetails = accountingRecords.map(record => ({
        leaseId: record.leaseId,
        leaseNumber: record.lease.leaseNumber,
        tenantName: record.lease.tenant.name,
        rightOfUseAsset: record.rightOfUseAsset || 0,
        leaseLiability: record.leaseLIABILITY || 0,
        leaseExpense: (record.amortization || 0) + (record.interestExpense || 0),
        remainingTerm: this.calculateRemainingTerm(record.lease)
      }));

      const report: ComplianceReport = {
        organizationId,
        reportingPeriod,
        accountingStandard,
        totalRightOfUseAssets: Math.round(totalRightOfUseAssets),
        totalLeaseLiabilities: Math.round(totalLeaseLiabilities),
        totalLeaseExpense: Math.round(totalLeaseExpense),
        cashPaidForLeases: Math.round(cashPaidForLeases),
        newLeaseCommitments: Math.round(newLeaseCommitments),
        leaseModifications: 0, // Would be calculated from amendments
        leaseTerminations: 0, // Would be calculated from terminated leases
        weightedAverageDiscountRate,
        weightedAverageRemainingTerm,
        maturityAnalysis,
        leaseDetails
      };

      logger.info('Compliance report generated', {
        organizationId,
        reportingPeriod,
        totalLeases: accountingRecords.length
      });

      return report;
    } catch (error: unknown) {
      logger.error('Failed to generate compliance report', error);
      throw error;
    }
  }

  /**
   * Update discount rates for existing lease accounting records
   */
  async updateDiscountRates(
    organizationId: string,
    newRates: Array<{ leaseId: string; discountRate: number }>,
    effectiveDate: Date
  ): Promise<any> {
    try {
      const results = [];

      for (const rateUpdate of newRates) {
        // Get current lease accounting records
        const currentRecords = await prisma.leaseAccounting.findMany({
          where: {
            leaseId: rateUpdate.leaseId,
            status: { in: ['CALCULATED', 'APPROVED'] }
          },
          include: {
            lease: {
              include: {
                payments: true
              }
            }
          },
          orderBy: {
            fiscalYear: 'desc',
            fiscalPeriod: 'desc'
          },
          take: 1
        });

        if (currentRecords.length === 0) {
          continue;
        }

        const currentRecord = currentRecords[0];
        const lease = currentRecord.lease;

        // Recalculate with new discount rate
        const leasePayments = this.generateLeasePaymentSchedule(lease);
        
        const calculationData: ComplianceCalculationData = {
          leaseId: rateUpdate.leaseId,
          accountingStandard: currentRecord.accountingStandard as any,
          fiscalYear: currentRecord.fiscalYear,
          fiscalPeriod: currentRecord.fiscalPeriod,
          incrementalBorrowingRate: rateUpdate.discountRate,
          leasePayments
        };

        const recalculatedResult = await this.calculateLeaseAccounting(calculationData);

        // Create new accounting record with updated calculations
        const updatedRecord = await prisma.leaseAccounting.create({
          data: {
            ...currentRecord,
            id: undefined, // Create new record
            discountRate: rateUpdate.discountRate,
            rightOfUseAsset: recalculatedResult.rightOfUseAsset,
            leaseLIABILITY: recalculatedResult.leaseLiability,
            presentValue: recalculatedResult.presentValue,
            amortization: recalculatedResult.monthlyDepreciation,
            interestExpense: recalculatedResult.monthlyInterest,
            status: 'DRAFT',
            notes: `Discount rate updated from ${currentRecord.discountRate} to ${rateUpdate.discountRate}`,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        // Mark old record as superseded
        await prisma.leaseAccounting.update({
          where: { id: currentRecord.id },
          data: {
            status: 'SUPERSEDED',
            notes: `Superseded by record ${updatedRecord.id} due to discount rate change`
          }
        });

        results.push({
          leaseId: rateUpdate.leaseId,
          oldRecordId: currentRecord.id,
          newRecordId: updatedRecord.id,
          oldRate: currentRecord.discountRate,
          newRate: rateUpdate.discountRate,
          impactOnROU: recalculatedResult.rightOfUseAsset - (currentRecord.rightOfUseAsset || 0),
          impactOnLiability: recalculatedResult.leaseLiability - (currentRecord.leaseLIABILITY || 0)
        });
      }

      logger.info('Discount rates updated', {
        organizationId,
        updatedLeases: results.length
      });

      return {
        effectiveDate,
        summary: {
          leasesUpdated: results.length,
          totalROUImpact: results.reduce((sum, r) => sum + r.impactOnROU, 0),
          totalLiabilityImpact: results.reduce((sum, r) => sum + r.impactOnLiability, 0)
        },
        details: results
      };
    } catch (error: unknown) {
      logger.error('Failed to update discount rates', error);
      throw error;
    }
  }

  /**
   * Generate ASC 842/IFRS 16 disclosure notes for financial statements
   */
  async generateDisclosureNotes(
    organizationId: string,
    fiscalYear: number,
    accountingStandard: 'ASC842' | 'IFRS16' = 'ASC842'
  ): Promise<any> {
    try {
      // Get annual summary data
      const yearEndReport = await this.generateComplianceReport(
        organizationId,
        `${fiscalYear}-12`,
        accountingStandard
      );

      // Get prior year for comparison
      const priorYearReport = await this.generateComplianceReport(
        organizationId,
        `${fiscalYear - 1}-12`,
        accountingStandard
      ).catch(() => null); // May not exist for first year

      // Generate disclosure components
      const disclosureNotes = {
        leasingArrangements: {
          description: 'The Company leases office space, warehouses, and equipment under non-cancelable operating leases.',
          accountingPolicy: `Leases are accounted for under ${accountingStandard}. The Company determines if an arrangement is a lease at inception.`,
          significantJudgments: [
            'Determination of lease term including renewal options',
            'Determination of incremental borrowing rate',
            'Assessment of lease modifications'
          ]
        },
        
        balanceSheetImpacts: {
          rightOfUseAssets: {
            beginningBalance: priorYearReport?.totalRightOfUseAssets || 0,
            additions: yearEndReport.newLeaseCommitments,
            depreciation: yearEndReport.totalLeaseExpense * 0.7, // Estimate
            modifications: 0, // Would be calculated
            terminations: 0, // Would be calculated
            endingBalance: yearEndReport.totalRightOfUseAssets
          },
          leaseLiabilities: {
            beginningBalance: priorYearReport?.totalLeaseLiabilities || 0,
            additions: yearEndReport.newLeaseCommitments,
            payments: yearEndReport.cashPaidForLeases,
            interestAccrual: yearEndReport.totalLeaseExpense * 0.3, // Estimate
            modifications: 0, // Would be calculated
            endingBalance: yearEndReport.totalLeaseLiabilities
          }
        },

        incomeStatementImpacts: {
          operatingLeaseExpense: yearEndReport.totalLeaseExpense,
          shortTermLeaseExpense: 0, // Would be calculated separately
          variableLeaseExpense: 0, // Would be calculated separately
          subleaseIncome: 0 // Would be calculated if applicable
        },

        cashFlowImpacts: {
          operatingActivities: {
            leaseExpense: yearEndReport.totalLeaseExpense
          },
          financingActivities: {
            principalPayments: yearEndReport.cashPaidForLeases * 0.7 // Estimate
          }
        },

        maturityAnalysis: yearEndReport.maturityAnalysis,

        additionalInformation: {
          weightedAverageRemainingTerm: `${yearEndReport.weightedAverageRemainingTerm} years`,
          weightedAverageDiscountRate: `${(yearEndReport.weightedAverageDiscountRate * 100).toFixed(2)}%`,
          totalUndiscountedCashFlows: Object.values(yearEndReport.maturityAnalysis).reduce((sum, val) => sum + val, 0)
        }
      };

      logger.info('Disclosure notes generated', {
        organizationId,
        fiscalYear,
        accountingStandard
      });

      return disclosureNotes;
    } catch (error: unknown) {
      logger.error('Failed to generate disclosure notes', error);
      throw error;
    }
  }

  // Private helper methods

  private calculatePresentValue(
    payments: Array<{ period: number; amount: number; paymentDate: Date }>,
    discountRate: number
  ): number {
    const monthlyRate = discountRate / 12;
    let presentValue = 0;

    for (const payment of payments) {
      const discountFactor = Math.pow(1 + monthlyRate, -payment.period);
      presentValue += payment.amount * discountFactor;
    }

    return presentValue;
  }

  private calculateLeaseTermMonths(lease: any): number {
    const startDate = new Date(lease.startDate);
    const endDate = new Date(lease.expirationDate);
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44)); // Average days per month
  }

  private generateLeasePaymentSchedule(lease: any): Array<{
    period: number;
    amount: number;
    paymentDate: Date;
    isFixed: boolean;
  }> {
    const payments = [];
    const monthlyRent = lease.baseLease;
    const startDate = new Date(lease.rentCommencement || lease.startDate);
    const termMonths = this.calculateLeaseTermMonths(lease);

    for (let month = 1; month <= termMonths; month++) {
      const paymentDate = new Date(startDate);
      paymentDate.setMonth(paymentDate.getMonth() + month - 1);
      
      payments.push({
        period: month,
        amount: monthlyRent,
        paymentDate,
        isFixed: true
      });
    }

    return payments;
  }

  private generateJournalEntries(
    data: ComplianceCalculationData,
    rightOfUseAsset: number,
    leaseLiability: number,
    monthlyDepreciation: number,
    leaseTermMonths: number
  ): Array<any> {
    const entries = [];

    // Initial recognition entry
    entries.push({
      period: 0,
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

    // Monthly entries for first 12 months (sample)
    const monthsToGenerate = Math.min(12, leaseTermMonths);
    for (let month = 1; month <= monthsToGenerate; month++) {
      const entryDate = new Date();
      entryDate.setMonth(entryDate.getMonth() + month - 1);

      entries.push({
        period: month,
        date: entryDate,
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

  private async createJournalEntry(
    leaseAccountingId: string,
    journalEntryData: any,
    approvalWorkflow: boolean
  ): Promise<string> {
    const totalDebit = journalEntryData.entries
      .filter((e: any) => e.debit)
      .reduce((sum: number, e: any) => sum + (e.debit || 0), 0);
    
    const totalCredit = journalEntryData.entries
      .filter((e: any) => e.credit)
      .reduce((sum: number, e: any) => sum + (e.credit || 0), 0);

    const journalEntry = await prisma.journalEntry.create({
      data: {
        entryNumber: `LE-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        entryType: 'LEASE_LIABILITY',
        entryDate: journalEntryData.date,
        description: `Lease accounting entry - Period ${journalEntryData.period}`,
        totalDebit,
        totalCredit,
        status: approvalWorkflow ? 'DRAFT' : 'APPROVED',
        preparedAt: new Date(),
        leaseAccountingId,
        lineItems: {
          create: journalEntryData.entries.map((entry: any, index: number) => ({
            lineNumber: index + 1,
            accountCode: entry.accountCode,
            accountName: entry.accountName,
            debitAmount: entry.debit,
            creditAmount: entry.credit
          }))
        }
      }
    });

    return journalEntry.id;
  }

  private async getCashPaidForLeases(
    organizationId: string,
    fiscalYear: number,
    fiscalPeriod: number
  ): Promise<number> {
    const payments = await prisma.leasePayment.aggregate({
      where: {
        lease: {
          property: { organizationId }
        },
        paidDate: {
          gte: new Date(fiscalYear, fiscalPeriod - 1, 1),
          lt: new Date(fiscalYear, fiscalPeriod, 1)
        },
        status: 'CLEARED'
      },
      _sum: {
        amount: true
      }
    });

    return payments._sum.amount || 0;
  }

  private async getNewLeaseCommitments(
    organizationId: string,
    fiscalYear: number,
    fiscalPeriod: number
  ): Promise<number> {
    const newLeases = await prisma.lease.findMany({
      where: {
        property: { organizationId },
        startDate: {
          gte: new Date(fiscalYear, fiscalPeriod - 1, 1),
          lt: new Date(fiscalYear, fiscalPeriod, 1)
        }
      },
      include: {
        rentRoll: {
          where: { status: 'CURRENT' },
          take: 1
        }
      }
    });

    return newLeases.reduce((sum, lease) => {
      const annualRent = lease.rentRoll[0]?.annualizedRent || lease.baseLease * 12;
      const remainingTerm = this.calculateRemainingTerm(lease);
      return sum + (annualRent * remainingTerm);
    }, 0);
  }

  private calculateWeightedAverageDiscountRate(records: any[]): number {
    if (records.length === 0) {return 0;}

    const totalWeightedRate = records.reduce((sum, record) => {
      const weight = record.leaseLIABILITY || 0;
      const rate = record.discountRate || 0;
      return sum + (weight * rate);
    }, 0);

    const totalWeight = records.reduce((sum, record) => sum + (record.leaseLIABILITY || 0), 0);

    return totalWeight > 0 ? totalWeightedRate / totalWeight : 0;
  }

  private async calculateWeightedAverageRemainingTerm(records: any[]): Promise<number> {
    if (records.length === 0) {return 0;}

    let totalWeightedTerm = 0;
    let totalWeight = 0;

    for (const record of records) {
      const weight = record.leaseLIABILITY || 0;
      const remainingTerm = this.calculateRemainingTerm(record.lease);
      totalWeightedTerm += weight * remainingTerm;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalWeightedTerm / totalWeight : 0;
  }

  private calculateRemainingTerm(lease: any): number {
    const now = new Date();
    const expirationDate = new Date(lease.expirationDate);
    const remainingTime = expirationDate.getTime() - now.getTime();
    return Math.max(0, remainingTime / (1000 * 60 * 60 * 24 * 365.25)); // Years
  }

  private async generateMaturityAnalysis(
    organizationId: string,
    accountingStandard: string
  ): Promise<any> {
    // Get all active leases
    const leases = await prisma.lease.findMany({
      where: {
        property: { organizationId },
        status: 'ACTIVE'
      },
      include: {
        rentRoll: {
          where: { status: 'CURRENT' },
          take: 1
        }
      }
    });

    const maturityAnalysis = {
      year1: 0,
      year2: 0,
      year3: 0,
      year4: 0,
      year5: 0,
      thereafter: 0
    };

    const now = new Date();

    for (const lease of leases) {
      const expirationDate = new Date(lease.expirationDate);
      const yearsToExpiration = (expirationDate.getTime() - now.getTime()) / 
        (1000 * 60 * 60 * 24 * 365.25);
      
      const annualRent = lease.rentRoll[0]?.annualizedRent || lease.baseLease * 12;
      
      if (yearsToExpiration <= 1) {
        maturityAnalysis.year1 += annualRent * yearsToExpiration;
      } else if (yearsToExpiration <= 2) {
        maturityAnalysis.year1 += annualRent;
        maturityAnalysis.year2 += annualRent * (yearsToExpiration - 1);
      } else if (yearsToExpiration <= 3) {
        maturityAnalysis.year1 += annualRent;
        maturityAnalysis.year2 += annualRent;
        maturityAnalysis.year3 += annualRent * (yearsToExpiration - 2);
      } else if (yearsToExpiration <= 4) {
        maturityAnalysis.year1 += annualRent;
        maturityAnalysis.year2 += annualRent;
        maturityAnalysis.year3 += annualRent;
        maturityAnalysis.year4 += annualRent * (yearsToExpiration - 3);
      } else if (yearsToExpiration <= 5) {
        maturityAnalysis.year1 += annualRent;
        maturityAnalysis.year2 += annualRent;
        maturityAnalysis.year3 += annualRent;
        maturityAnalysis.year4 += annualRent;
        maturityAnalysis.year5 += annualRent * (yearsToExpiration - 4);
      } else {
        maturityAnalysis.year1 += annualRent;
        maturityAnalysis.year2 += annualRent;
        maturityAnalysis.year3 += annualRent;
        maturityAnalysis.year4 += annualRent;
        maturityAnalysis.year5 += annualRent;
        maturityAnalysis.thereafter += annualRent * (yearsToExpiration - 5);
      }
    }

    // Round all values
    Object.keys(maturityAnalysis).forEach(key => {
      (maturityAnalysis as any)[key] = Math.round((maturityAnalysis as any)[key]);
    });

    return maturityAnalysis;
  }
}