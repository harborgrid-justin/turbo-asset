import { prisma } from '../config/database';
import { logger } from '@/config/logger';

export interface LeaseQuery {
  organizationId: string;
  propertyIds?: string[];
  tenantIds?: string[];
  status?: string[];
  startDate?: Date;
  endDate?: Date;
  expiringWithin?: number; // days
  renewalNoticeRequired?: boolean;
  limit?: number;
  offset?: number;
}

export interface LeaseCreationData {
  organizationId: string;
  propertyId: string;
  tenantId: string;
  leaseNumber: string;
  leaseName: string;
  leaseType?: string;
  startDate: Date;
  endDate: Date;
  originalTerm: number;
  baseLease: number;
  percentage?: number;
  currency?: string;
  securityDeposit?: number;
  leasableArea?: number;
  usableArea?: number;
  unitType?: string;
  useType?: string;
  commencement?: Date;
  rentCommencement?: Date;
  expirationDate: Date;
  optionDeadline?: Date;
  renewalNotice?: Date;
  renewalOptions?: any;
  escalationRules?: any;
  exclusiveRights?: any;
  capex?: number;
  personalProperty?: number;
  notes?: string;
}

export interface LeasePortfolioSummary {
  totalLeases: number;
  totalValue: number;
  totalArea: number;
  occupancyRate: number;
  averageRentPSF: number;
  expiringLeases: {
    next30Days: number;
    next60Days: number;
    next90Days: number;
    nextYear: number;
  };
  leaseTypes: { [key: string]: number };
  statusBreakdown: { [key: string]: number };
  topTenants: Array<{
    tenantName: string;
    totalArea: number;
    totalValue: number;
    leaseCount: number;
  }>;
  renewalPipeline: Array<{
    leaseId: string;
    tenantName: string;
    propertyName: string;
    expirationDate: Date;
    renewalNoticeDate: Date;
    annualRent: number;
    status: string;
  }>;
  alerts?: Array<{
    type: string;
    message: string;
    severity: string;
  }>;
}

export interface LeaseMetrics {
  portfolioValue: number;
  averageLeaseLength: number;
  occupancyRate: number;
  renewalRate: number;
  rentGrowthRate: number;
  tenantRetentionRate: number;
  averageRentPSF: number;
  leaseRollover: {
    year1: number;
    year2: number;
    year3: number;
    year4: number;
    year5Plus: number;
  };
}

export interface RenewalAnalysis {
  leaseId: string;
  currentRent: number;
  marketRent: number;
  recommendedRent: number;
  renewalProbability: number;
  tenantCreditRating: string;
  leaseHistory: any;
  marketComparables: any[];
  recommendations: string[];
}

/**
 * LeaseManagementService handles comprehensive lease portfolio management for 10,000+ properties
 * Provides core functionality for lease administration, portfolio analytics, and renewal management
 */
export class LeaseManagementService {
  
  /**
   * Create a new lease record with comprehensive validation
   */
  async createLease(data: LeaseCreationData): Promise<any> {
    try {
      // Validate tenant exists
      const tenant = await prisma.tenant.findUnique({
        where: { id: data.tenantId },
      });
      
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Validate property exists
      const property = await prisma.property.findUnique({
        where: { id: data.propertyId },
      });
      
      if (!property) {
        throw new Error('Property not found');
      }

      // Check for lease number uniqueness
      const existingLease = await prisma.lease.findUnique({
        where: { leaseNumber: data.leaseNumber },
      });
      
      if (existingLease) {
        throw new Error('Lease number already exists');
      }

      // Create the lease
      const lease = await prisma.lease.create({
        data: {
          leaseNumber: data.leaseNumber,
          leaseName: data.leaseName,
          leaseType: data.leaseType as any || 'OPERATING',
          status: 'ACTIVE',
          startDate: data.startDate,
          endDate: data.endDate,
          originalTerm: data.originalTerm,
          currentTerm: data.originalTerm,
          baseLease: data.baseLease,
          percentage: data.percentage,
          currency: data.currency || 'USD',
          securityDeposit: data.securityDeposit,
          leasableArea: data.leasableArea,
          usableArea: data.usableArea,
          unitType: data.unitType,
          useType: data.useType,
          commencement: data.commencement,
          rentCommencement: data.rentCommencement,
          expirationDate: data.expirationDate,
          optionDeadline: data.optionDeadline,
          renewalNotice: data.renewalNotice,
          renewalOptions: data.renewalOptions,
          escalationRules: data.escalationRules,
          exclusiveRights: data.exclusiveRights,
          capex: data.capex,
          personalProperty: data.personalProperty,
          notes: data.notes,
          property: {
            connect: { id: data.propertyId }
          },
          tenant: {
            connect: { id: data.tenantId }
          }
        },
        include: {
          property: true,
          tenant: true,
        }
      });

      // Create initial rent roll entry
      await prisma.rentRoll.create({
        data: {
          leaseId: lease.id,
          rollDate: new Date(),
          rollPeriod: new Date().toISOString().substring(0, 7), // YYYY-MM format
          baseRent: data.baseLease,
          percentageRent: data.percentage || 0,
          totalRent: data.baseLease + (data.percentage || 0),
          leasableArea: data.leasableArea,
          occupiedArea: data.usableArea,
          occupancyRate: data.usableArea && data.leasableArea ? 
            (data.usableArea / data.leasableArea) * 100 : null,
          rentPerSqFt: data.leasableArea ? data.baseLease / data.leasableArea : null,
          annualizedRent: data.baseLease * 12,
          status: 'CURRENT'
        }
      });

      // Create critical dates for this lease
      const criticalDates = [];
      
      if (data.expirationDate) {
        criticalDates.push({
          leaseId: lease.id,
          dateType: 'LEASE_EXPIRATION',
          dateValue: data.expirationDate,
          description: `Lease ${data.leaseNumber} expires`,
          importance: 'HIGH',
          alertDays: [365, 180, 90, 60, 30, 7]
        });
      }
      
      if (data.optionDeadline) {
        criticalDates.push({
          leaseId: lease.id,
          dateType: 'OPTION_DEADLINE',
          dateValue: data.optionDeadline,
          description: `Option deadline for lease ${data.leaseNumber}`,
          importance: 'HIGH',
          alertDays: [90, 60, 30, 14, 7]
        });
      }
      
      if (data.renewalNotice) {
        criticalDates.push({
          leaseId: lease.id,
          dateType: 'RENEWAL_NOTICE',
          dateValue: data.renewalNotice,
          description: `Renewal notice required for lease ${data.leaseNumber}`,
          importance: 'CRITICAL',
          alertDays: [120, 90, 60, 30, 14, 7]
        });
      }

      if (criticalDates.length > 0) {
        await prisma.criticalDate.createMany({
          data: criticalDates
        });
      }

      logger.info('Lease created successfully', {
        leaseId: lease.id,
        leaseNumber: data.leaseNumber,
        propertyId: data.propertyId,
        tenantId: data.tenantId
      });

      return lease;
    } catch (error: unknown) {
      logger.error('Failed to create lease', error);
      throw error;
    }
  }

  /**
   * Get comprehensive lease portfolio summary for an organization
   */
  async getPortfolioSummary(organizationId: string): Promise<LeasePortfolioSummary> {
    try {
      const now = new Date();
      const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const next60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const next90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

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
          rentRoll: {
            where: { status: 'CURRENT' },
            orderBy: { rollDate: 'desc' },
            take: 1
          }
        }
      });

      // Calculate basic metrics
      const totalLeases = leases.length;
      const totalValue = leases.reduce((sum, lease) => {
        const currentRentRoll = lease.rentRoll[0];
        return sum + (currentRentRoll?.annualizedRent || lease.baseLease * 12);
      }, 0);
      const totalArea = leases.reduce((sum, lease) => sum + (lease.leasableArea || 0), 0);
      const occupiedArea = leases.reduce((sum, lease) => sum + (lease.usableArea || 0), 0);
      const occupancyRate = totalArea > 0 ? (occupiedArea / totalArea) * 100 : 0;
      const averageRentPSF = totalArea > 0 ? totalValue / totalArea : 0;

      // Count expiring leases
      const expiringLeases = {
        next30Days: leases.filter(l => l.expirationDate <= next30Days).length,
        next60Days: leases.filter(l => l.expirationDate <= next60Days).length,
        next90Days: leases.filter(l => l.expirationDate <= next90Days).length,
        nextYear: leases.filter(l => l.expirationDate <= nextYear).length,
      };

      // Lease type breakdown
      const leaseTypes = leases.reduce((acc, lease) => {
        acc[lease.leaseType] = (acc[lease.leaseType] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      // Status breakdown
      const statusBreakdown = leases.reduce((acc, lease) => {
        acc[lease.status] = (acc[lease.status] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      // Top tenants by area and value
      const tenantMap = new Map<string, {
        tenantName: string;
        totalArea: number;
        totalValue: number;
        leaseCount: number;
      }>();

      leases.forEach(lease => {
        const key = lease.tenant.id;
        if (!tenantMap.has(key)) {
          tenantMap.set(key, {
            tenantName: lease.tenant.name,
            totalArea: 0,
            totalValue: 0,
            leaseCount: 0
          });
        }
        const tenant = tenantMap.get(key)!;
        tenant.totalArea += lease.leasableArea || 0;
        tenant.totalValue += lease.rentRoll[0]?.annualizedRent || lease.baseLease * 12;
        tenant.leaseCount += 1;
      });

      const topTenants = Array.from(tenantMap.values())
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 10);

      // Renewal pipeline - leases requiring attention in next 12 months
      const renewalPipeline = leases
        .filter(lease => {
          const expirationDate = new Date(lease.expirationDate);
          return expirationDate <= nextYear && lease.renewalNotice;
        })
        .map(lease => ({
          leaseId: lease.id,
          tenantName: lease.tenant.name,
          propertyName: lease.property.name,
          expirationDate: lease.expirationDate,
          renewalNoticeDate: lease.renewalNotice!,
          annualRent: lease.rentRoll[0]?.annualizedRent || lease.baseLease * 12,
          status: this.getRenewalStatus(lease)
        }))
        .sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime());

      return {
        totalLeases,
        totalValue: Math.round(totalValue),
        totalArea: Math.round(totalArea),
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        averageRentPSF: Math.round(averageRentPSF * 100) / 100,
        expiringLeases,
        leaseTypes,
        statusBreakdown,
        topTenants,
        renewalPipeline
      };
    } catch (error: unknown) {
      logger.error('Failed to get portfolio summary', error);
      throw error;
    }
  }

  /**
   * Search and filter leases with advanced querying capabilities
   */
  async searchLeases(query: LeaseQuery): Promise<any[]> {
    try {
      const whereClause: any = {
        property: {
          organizationId: query.organizationId,
          isActive: true
        }
      };

      if (query.propertyIds?.length) {
        whereClause.propertyId = { in: query.propertyIds };
      }

      if (query.tenantIds?.length) {
        whereClause.tenantId = { in: query.tenantIds };
      }

      if (query.status?.length) {
        whereClause.status = { in: query.status };
      }

      if (query.startDate || query.endDate) {
        whereClause.AND = whereClause.AND || [];
        
        if (query.startDate) {
          whereClause.AND.push({
            endDate: { gte: query.startDate }
          });
        }
        
        if (query.endDate) {
          whereClause.AND.push({
            startDate: { lte: query.endDate }
          });
        }
      }

      if (query.expiringWithin) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + query.expiringWithin);
        whereClause.expirationDate = { lte: expirationDate };
      }

      if (query.renewalNoticeRequired) {
        whereClause.renewalNotice = { not: null };
      }

      const leases = await prisma.lease.findMany({
        where: whereClause,
        include: {
          property: {
            select: {
              id: true,
              name: true,
              address: true,
              type: true
            }
          },
          tenant: {
            select: {
              id: true,
              name: true,
              tenantType: true,
              creditRating: true
            }
          },
          rentRoll: {
            where: { status: 'CURRENT' },
            orderBy: { rollDate: 'desc' },
            take: 1
          },
          criticalDates: {
            where: {
              dateValue: { gte: new Date() },
              isCompleted: false
            },
            orderBy: { dateValue: 'asc' }
          }
        },
        orderBy: { expirationDate: 'asc' },
        take: query.limit || 100,
        skip: query.offset || 0
      });

      return leases.map(lease => ({
        ...lease,
        currentRent: lease.rentRoll[0]?.totalRent || lease.baseLease,
        annualRent: lease.rentRoll[0]?.annualizedRent || lease.baseLease * 12,
        rentPerSqFt: lease.rentRoll[0]?.rentPerSqFt || 
          (lease.leasableArea ? lease.baseLease / lease.leasableArea : null),
        daysToExpiration: Math.ceil(
          (new Date(lease.expirationDate).getTime() - new Date().getTime()) / 
          (1000 * 60 * 60 * 24)
        ),
        upcomingDates: lease.criticalDates.slice(0, 3)
      }));
    } catch (error: unknown) {
      logger.error('Failed to search leases', error);
      throw error;
    }
  }

  /**
   * Get detailed lease metrics and analytics
   */
  async getLeaseMetrics(organizationId: string, propertyIds?: string[]): Promise<LeaseMetrics> {
    try {
      const whereClause: any = {
        property: {
          organizationId,
          isActive: true
        },
        status: 'ACTIVE'
      };

      if (propertyIds?.length) {
        whereClause.propertyId = { in: propertyIds };
      }

      const leases = await prisma.lease.findMany({
        where: whereClause,
        include: {
          rentRoll: {
            where: { status: 'CURRENT' },
            orderBy: { rollDate: 'desc' },
            take: 1
          }
        }
      });

      // Calculate portfolio value
      const portfolioValue = leases.reduce((sum, lease) => {
        return sum + (lease.rentRoll[0]?.annualizedRent || lease.baseLease * 12);
      }, 0);

      // Calculate average lease length
      const totalLeaseTerms = leases.reduce((sum, lease) => sum + lease.originalTerm, 0);
      const averageLeaseLength = leases.length > 0 ? totalLeaseTerms / leases.length : 0;

      // Calculate occupancy rate
      const totalArea = leases.reduce((sum, lease) => sum + (lease.leasableArea || 0), 0);
      const occupiedArea = leases.reduce((sum, lease) => sum + (lease.usableArea || 0), 0);
      const occupancyRate = totalArea > 0 ? (occupiedArea / totalArea) * 100 : 0;

      // Calculate average rent per square foot
      const averageRentPSF = totalArea > 0 ? portfolioValue / totalArea : 0;

      // For demo purposes, we'll calculate estimated rates
      // In a real system, these would be calculated from historical data
      const renewalRate = 75; // 75% renewal rate assumption
      const rentGrowthRate = 3.5; // 3.5% annual rent growth assumption
      const tenantRetentionRate = 80; // 80% tenant retention assumption

      // Calculate lease rollover schedule
      const now = new Date();
      const leaseRollover = {
        year1: 0,
        year2: 0,
        year3: 0,
        year4: 0,
        year5Plus: 0
      };

      leases.forEach(lease => {
        const expirationDate = new Date(lease.expirationDate);
        const yearsToExpiration = (expirationDate.getTime() - now.getTime()) / 
          (1000 * 60 * 60 * 24 * 365);
        
        const annualRent = lease.rentRoll[0]?.annualizedRent || lease.baseLease * 12;
        
        if (yearsToExpiration <= 1) {
          leaseRollover.year1 += annualRent;
        } else if (yearsToExpiration <= 2) {
          leaseRollover.year2 += annualRent;
        } else if (yearsToExpiration <= 3) {
          leaseRollover.year3 += annualRent;
        } else if (yearsToExpiration <= 4) {
          leaseRollover.year4 += annualRent;
        } else {
          leaseRollover.year5Plus += annualRent;
        }
      });

      return {
        portfolioValue: Math.round(portfolioValue),
        averageLeaseLength: Math.round(averageLeaseLength * 10) / 10,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        renewalRate,
        rentGrowthRate,
        tenantRetentionRate,
        averageRentPSF: Math.round(averageRentPSF * 100) / 100,
        leaseRollover: {
          year1: Math.round(leaseRollover.year1),
          year2: Math.round(leaseRollover.year2),
          year3: Math.round(leaseRollover.year3),
          year4: Math.round(leaseRollover.year4),
          year5Plus: Math.round(leaseRollover.year5Plus)
        }
      };
    } catch (error: unknown) {
      logger.error('Failed to calculate lease metrics', error);
      throw error;
    }
  }

  /**
   * Analyze lease renewal opportunities and provide recommendations
   */
  async analyzeRenewalOpportunities(organizationId: string, monthsAhead: number = 18): Promise<RenewalAnalysis[]> {
    try {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + monthsAhead);

      const leasesForRenewal = await prisma.lease.findMany({
        where: {
          property: {
            organizationId,
            isActive: true
          },
          status: 'ACTIVE',
          expirationDate: {
            lte: futureDate,
            gte: new Date()
          }
        },
        include: {
          property: true,
          tenant: true,
          rentRoll: {
            where: { status: 'CURRENT' },
            orderBy: { rollDate: 'desc' },
            take: 1
          },
          payments: {
            where: {
              paymentDate: {
                gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last year
              }
            },
            orderBy: { paymentDate: 'desc' }
          }
        }
      });

      const renewalAnalyses: RenewalAnalysis[] = [];

      for (const lease of leasesForRenewal) {
        const currentRent = lease.rentRoll[0]?.totalRent || lease.baseLease;
        
        // For demo purposes, calculate market rent with assumptions
        // In a real system, this would integrate with market data sources
        const marketRent = currentRent * 1.15; // Assume 15% market premium
        const recommendedRent = currentRent * 1.08; // Assume 8% increase for renewal
        
        // Calculate renewal probability based on tenant payment history and lease terms
        const renewalProbability = this.calculateRenewalProbability(lease);
        
        const analysis: RenewalAnalysis = {
          leaseId: lease.id,
          currentRent,
          marketRent: Math.round(marketRent),
          recommendedRent: Math.round(recommendedRent),
          renewalProbability,
          tenantCreditRating: lease.tenant.creditRating || 'Unknown',
          leaseHistory: {
            originalTerm: lease.originalTerm,
            startDate: lease.startDate,
            expirationDate: lease.expirationDate,
            paymentHistory: lease.payments.length
          },
          marketComparables: [], // Would be populated with actual market data
          recommendations: this.generateRenewalRecommendations(lease, renewalProbability)
        };

        renewalAnalyses.push(analysis);
      }

      return renewalAnalyses.sort((a, b) => b.renewalProbability - a.renewalProbability);
    } catch (error: unknown) {
      logger.error('Failed to analyze renewal opportunities', error);
      throw error;
    }
  }

  /**
   * Update lease terms and create amendment record
   */
  async updateLease(leaseId: string, updates: Partial<LeaseCreationData>, amendmentReason: string): Promise<any> {
    try {
      const existingLease = await prisma.lease.findUnique({
        where: { id: leaseId },
        include: {
          property: true,
          tenant: true
        }
      });

      if (!existingLease) {
        throw new Error('Lease not found');
      }

      // Store previous values for amendment tracking
      const previousValues = {
        baseLease: existingLease.baseLease,
        percentage: existingLease.percentage,
        endDate: existingLease.endDate,
        escalationRules: existingLease.escalationRules,
        renewalOptions: existingLease.renewalOptions
      };

      // Update the lease
      const updatedLease = await prisma.lease.update({
        where: { id: leaseId },
        data: {
          ...updates,
          updatedAt: new Date()
        },
        include: {
          property: true,
          tenant: true
        }
      });

      // Create amendment record
      await prisma.leaseAmendment.create({
        data: {
          leaseId,
          amendmentNumber: `${existingLease.leaseNumber}-AMD-${Date.now()}`,
          amendmentType: this.determineAmendmentType(updates),
          effectiveDate: new Date(),
          description: amendmentReason,
          changes: updates,
          previousValues,
          newValues: updates,
          financialImpact: this.calculateFinancialImpact(previousValues, updates),
          status: 'PENDING',
          requestedBy: 'system', // Would be actual user ID
          requestDate: new Date()
        }
      });

      // Update rent roll if rent changed
      if (updates.baseLease || updates.percentage) {
        await prisma.rentRoll.create({
          data: {
            leaseId,
            rollDate: new Date(),
            rollPeriod: new Date().toISOString().substring(0, 7),
            baseRent: updates.baseLease || existingLease.baseLease,
            percentageRent: updates.percentage || existingLease.percentage || 0,
            totalRent: (updates.baseLease || existingLease.baseLease) + 
              (updates.percentage || existingLease.percentage || 0),
            leasableArea: existingLease.leasableArea,
            occupiedArea: existingLease.usableArea,
            occupancyRate: existingLease.usableArea && existingLease.leasableArea ? 
              (existingLease.usableArea / existingLease.leasableArea) * 100 : null,
            rentPerSqFt: existingLease.leasableArea ? 
              (updates.baseLease || existingLease.baseLease) / existingLease.leasableArea : null,
            annualizedRent: (updates.baseLease || existingLease.baseLease) * 12,
            status: 'CURRENT'
          }
        });

        // Mark previous rent roll as historical
        await prisma.rentRoll.updateMany({
          where: {
            leaseId,
            status: 'CURRENT',
            rollDate: { not: new Date() }
          },
          data: { status: 'HISTORICAL' }
        });
      }

      logger.info('Lease updated successfully', {
        leaseId,
        amendments: Object.keys(updates).length
      });

      return updatedLease;
    } catch (error: unknown) {
      logger.error('Failed to update lease', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive lease reports
   */
  async generateLeaseReport(organizationId: string, reportType: string, filters: any = {}): Promise<any> {
    try {
      switch (reportType) {
        case 'EXPIRATION_REPORT':
          return await this.generateExpirationReport(organizationId, filters);
        case 'RENT_ROLL':
          return await this.generateRentRollReport(organizationId, filters);
        case 'TENANT_ANALYSIS':
          return await this.generateTenantAnalysisReport(organizationId, filters);
        case 'RENEWAL_PIPELINE':
          return await this.generateRenewalPipelineReport(organizationId, filters);
        default:
          throw new Error('Invalid report type');
      }
    } catch (error: unknown) {
      logger.error('Failed to generate lease report', error);
      throw error;
    }
  }

  // Private helper methods
  private getRenewalStatus(lease: any): string {
    const now = new Date();
    const expirationDate = new Date(lease.expirationDate);
    const renewalNoticeDate = lease.renewalNotice ? new Date(lease.renewalNotice) : null;
    
    if (renewalNoticeDate && now > renewalNoticeDate) {
      return 'NOTICE_OVERDUE';
    } else if (renewalNoticeDate && now > new Date(renewalNoticeDate.getTime() - 30 * 24 * 60 * 60 * 1000)) {
      return 'NOTICE_DUE_SOON';
    } else if (expirationDate.getTime() - now.getTime() < 90 * 24 * 60 * 60 * 1000) {
      return 'REQUIRES_ATTENTION';
    } else {
      return 'ON_TRACK';
    }
  }

  private calculateRenewalProbability(lease: any): number {
    let probability = 70; // Base probability

    // Adjust based on tenant credit rating
    const {creditRating} = lease.tenant;
    if (creditRating === 'AAA' || creditRating === 'AA') {
      probability += 15;
    } else if (creditRating === 'A' || creditRating === 'BBB') {
      probability += 10;
    } else if (creditRating === 'BB' || creditRating === 'B') {
      probability -= 10;
    }

    // Adjust based on payment history
    const paymentHistory = lease.payments || [];
    const onTimePayments = paymentHistory.filter((p: any) => 
      p.paidDate && p.paidDate <= p.dueDate
    ).length;
    const paymentRate = paymentHistory.length > 0 ? onTimePayments / paymentHistory.length : 1;
    probability += (paymentRate - 0.8) * 50; // Adjust based on payment performance

    // Adjust based on lease term remaining
    const remainingTerm = lease.currentTerm || lease.originalTerm;
    if (remainingTerm < 12) {
      probability -= 5;
    } else if (remainingTerm > 60) {
      probability += 5;
    }

    return Math.max(0, Math.min(100, Math.round(probability)));
  }

  private generateRenewalRecommendations(lease: any, renewalProbability: number): string[] {
    const recommendations: string[] = [];

    if (renewalProbability > 80) {
      recommendations.push('High renewal probability - consider market rate increase');
      recommendations.push('Offer multi-year extension with favorable terms');
    } else if (renewalProbability > 60) {
      recommendations.push('Moderate renewal probability - negotiate carefully');
      recommendations.push('Consider tenant improvement allowance as incentive');
    } else {
      recommendations.push('Low renewal probability - prepare for potential vacancy');
      recommendations.push('Begin marketing space to backup tenants');
      recommendations.push('Consider rent concessions to retain tenant');
    }

    // Add specific recommendations based on lease characteristics
    if (lease.leasableArea && lease.leasableArea > 10000) {
      recommendations.push('Large space - prioritize retention due to potential long vacancy');
    }

    if (lease.tenant.creditRating && ['C', 'D'].includes(lease.tenant.creditRating)) {
      recommendations.push('Poor credit tenant - require additional security measures for renewal');
    }

    return recommendations;
  }

  private determineAmendmentType(updates: any): string {
    if (updates.baseLease || updates.percentage) {return 'RENT_CHANGE';}
    if (updates.endDate) {return 'TERM_EXTENSION';}
    if (updates.leasableArea || updates.usableArea) {return 'SPACE_MODIFICATION';}
    if (updates.useType) {return 'USE_CHANGE';}
    return 'OTHER';
  }

  private calculateFinancialImpact(previousValues: any, newValues: any): number {
    const oldAnnualRent = (previousValues.baseLease || 0) * 12;
    const newAnnualRent = (newValues.baseLease || previousValues.baseLease || 0) * 12;
    return newAnnualRent - oldAnnualRent;
  }

  private async generateExpirationReport(organizationId: string, filters: any): Promise<any> {
    // Implementation for expiration report
    const monthsAhead = filters.monthsAhead || 18;
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + monthsAhead);

    const expiringLeases = await prisma.lease.findMany({
      where: {
        property: { organizationId },
        status: 'ACTIVE',
        expirationDate: {
          gte: new Date(),
          lte: futureDate
        }
      },
      include: {
        property: true,
        tenant: true,
        rentRoll: {
          where: { status: 'CURRENT' },
          take: 1
        }
      },
      orderBy: { expirationDate: 'asc' }
    });

    return {
      reportType: 'EXPIRATION_REPORT',
      generatedDate: new Date(),
      parameters: { monthsAhead, organizationId },
      summary: {
        totalExpiring: expiringLeases.length,
        totalRentAtRisk: expiringLeases.reduce((sum, l) => 
          sum + (l.rentRoll[0]?.annualizedRent || l.baseLease * 12), 0)
      },
      leases: expiringLeases.map(lease => ({
        leaseNumber: lease.leaseNumber,
        tenantName: lease.tenant.name,
        propertyName: lease.property.name,
        expirationDate: lease.expirationDate,
        renewalNoticeDate: lease.renewalNotice,
        currentRent: lease.rentRoll[0]?.totalRent || lease.baseLease,
        annualRent: lease.rentRoll[0]?.annualizedRent || lease.baseLease * 12,
        area: lease.leasableArea,
        daysToExpiration: Math.ceil(
          (new Date(lease.expirationDate).getTime() - new Date().getTime()) / 
          (1000 * 60 * 60 * 24)
        )
      }))
    };
  }

  private async generateRentRollReport(organizationId: string, filters: any): Promise<any> {
    const asOfDate = filters.asOfDate || new Date();
    const rollPeriod = asOfDate.toISOString().substring(0, 7);

    const rentRolls = await prisma.rentRoll.findMany({
      where: {
        rollPeriod,
        lease: {
          property: { organizationId },
          status: 'ACTIVE'
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

    return {
      reportType: 'RENT_ROLL',
      generatedDate: new Date(),
      asOfDate,
      summary: {
        totalProperties: new Set(rentRolls.map(r => r.lease.propertyId)).size,
        totalTenants: new Set(rentRolls.map(r => r.lease.tenantId)).size,
        totalArea: rentRolls.reduce((sum, r) => sum + (r.leasableArea || 0), 0),
        occupiedArea: rentRolls.reduce((sum, r) => sum + (r.occupiedArea || 0), 0),
        totalRent: rentRolls.reduce((sum, r) => sum + r.totalRent, 0),
        averageRentPSF: rentRolls.length > 0 ? 
          rentRolls.reduce((sum, r) => sum + (r.rentPerSqFt || 0), 0) / rentRolls.length : 0
      },
      rentRoll: rentRolls.map(roll => ({
        propertyName: roll.lease.property.name,
        tenantName: roll.lease.tenant.name,
        leaseNumber: roll.lease.leaseNumber,
        area: roll.leasableArea,
        baseRent: roll.baseRent,
        percentageRent: roll.percentageRent,
        totalRent: roll.totalRent,
        rentPerSqFt: roll.rentPerSqFt,
        expirationDate: roll.lease.expirationDate
      }))
    };
  }

  private async generateTenantAnalysisReport(organizationId: string, filters: any): Promise<any> {
    // Implementation for tenant analysis report
    return {
      reportType: 'TENANT_ANALYSIS',
      generatedDate: new Date(),
      // ... detailed tenant analysis implementation
    };
  }

  private async generateRenewalPipelineReport(organizationId: string, filters: any): Promise<any> {
    // Implementation for renewal pipeline report
    const renewalAnalyses = await this.analyzeRenewalOpportunities(organizationId, filters.monthsAhead);
    
    return {
      reportType: 'RENEWAL_PIPELINE',
      generatedDate: new Date(),
      summary: {
        totalLeases: renewalAnalyses.length,
        highProbability: renewalAnalyses.filter(a => a.renewalProbability > 70).length,
        atRisk: renewalAnalyses.filter(a => a.renewalProbability < 50).length,
        totalRentAtRisk: renewalAnalyses.reduce((sum, a) => sum + a.currentRent * 12, 0)
      },
      pipeline: renewalAnalyses
    };
  }
}