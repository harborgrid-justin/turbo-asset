import { prisma } from '../config/database';
import { logger } from '../config/logger';

export interface VendorCreationData {
  organizationId: string;
  vendorCode: string;
  name: string;
  legalName?: string;
  vendorType: 'SERVICE' | 'CONTRACTOR' | 'SUPPLIER' | 'CONSULTANT' | 'BROKER' | 'LEGAL' | 'FINANCIAL' | 'TECHNOLOGY' | 'OTHER';
  contactInfo: {
    address?: any;
    phone?: string;
    email?: string;
    website?: string;
  };
  primaryContact?: string;
  accountManager?: string;
  businessType?: string;
  taxId?: string;
  dbaName?: string;
  services: string[];
  specialties?: string[];
  certifications?: string[];
  creditRating?: string;
  annualRevenue?: number;
  insurance?: any;
  standardRates?: any;
  complianceNotes?: string;
}

export interface BrokerCreationData {
  organizationId: string;
  brokerCode: string;
  name: string;
  company?: string;
  licenseNumber?: string;
  licenseState?: string;
  contactInfo: {
    address?: any;
    phone?: string;
    email?: string;
  };
  assistants?: any;
  specialization: string[];
  markets: string[];
  propertyTypes: string[];
  commissionRates?: any;
  commissionTerms?: any;
}

export interface PerformanceEvaluationData {
  vendorId?: string;
  brokerId?: string;
  evaluationPeriod: string; // YYYY-QQ format
  evaluationType: 'QUARTERLY' | 'ANNUAL' | 'PROJECT_BASED' | 'CONTRACT_END' | 'INCIDENT_BASED';
  metrics: {
    qualityScore?: number;
    timelinessScore?: number;
    costScore?: number;
    communicationScore?: number;
    overallScore?: number;
  };
  projectMetrics?: {
    projectsCompleted: number;
    onTimeDelivery: number;
    onBudgetDelivery: number;
    customerSatisfaction?: number;
  };
  financialMetrics?: {
    totalContractValue?: number;
    costVariance?: number;
    changeOrders?: number;
    changeOrderValue?: number;
  };
  transactionMetrics?: {
    transactionsCompleted: number;
    totalVolume: number;
    averageDealSize?: number;
    averageCommission?: number;
  };
  issuesAndComplaints?: {
    issuesReported: number;
    complaintsReceived: number;
    resolutionTime?: number;
  };
  evaluationNotes?: string;
  recommendations?: string[];
  recognitions?: string[];
  evaluatedBy: string;
}

export interface VendorSummary {
  totalVendors: number;
  activeVendors: number;
  vendorsByType: { [key: string]: number };
  vendorsByStatus: { [key: string]: number };
  averagePerformanceScore: number;
  totalContractValue: number;
  topPerformingVendors: Array<{
    vendorId: string;
    vendorName: string;
    overallRating: number;
    totalProjects: number;
    contractValue: number;
  }>;
  performanceMetrics: {
    averageQualityScore: number;
    averageTimelinessScore: number;
    averageCostScore: number;
    onTimeDeliveryRate: number;
    onBudgetDeliveryRate: number;
  };
  riskAssessment: {
    highRiskVendors: number;
    mediumRiskVendors: number;
    lowRiskVendors: number;
  };
}

export interface BrokerSummary {
  totalBrokers: number;
  activeBrokers: number;
  totalTransactions: number;
  totalVolume: number;
  averageCommission: number;
  topPerformingBrokers: Array<{
    brokerId: string;
    brokerName: string;
    overallRating: number;
    transactionsCompleted: number;
    totalVolume: number;
  }>;
  performanceMetrics: {
    averageMarketingScore: number;
    averageNegotiationScore: number;
    averageDocumentationScore: number;
    averageMarketTime: number;
    clientSatisfactionScore: number;
  };
  marketAnalysis: {
    marketsByBroker: { [key: string]: number };
    propertyTypesByBroker: { [key: string]: number };
  };
}

export interface VendorRiskAssessment {
  vendorId: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: Array<{
    factor: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
    mitigation?: string;
  }>;
  financialRisk: {
    creditRating?: string;
    revenueStability: string;
    paymentHistory: string;
  };
  operationalRisk: {
    performanceHistory: string;
    deliveryReliability: string;
    qualityConsistency: string;
  };
  complianceRisk: {
    licenseStatus: string;
    insuranceCoverage: string;
    backgroundCheck: string;
  };
  recommendations: string[];
  reviewDate: Date;
  nextReviewDate: Date;
}

/**
 * VendorBrokerService handles vendor and broker management with performance tracking
 * Provides comprehensive vendor relationship management and broker performance analytics
 */
export class VendorBrokerService {

  /**
   * Create a new vendor record
   */
  async createVendor(data: VendorCreationData): Promise<any> {
    try {
      // Validate organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: data.organizationId }
      });
      
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Check for duplicate vendor code
      const existingVendor = await prisma.vendor.findUnique({
        where: { vendorCode: data.vendorCode }
      });
      
      if (existingVendor) {
        throw new Error('Vendor code already exists');
      }

      const vendor = await prisma.vendor.create({
        data: {
          organizationId: data.organizationId,
          vendorCode: data.vendorCode,
          name: data.name,
          legalName: data.legalName,
          vendorType: data.vendorType,
          contactInfo: data.contactInfo,
          primaryContact: data.primaryContact,
          accountManager: data.accountManager,
          businessType: data.businessType,
          taxId: data.taxId,
          dbaName: data.dbaName,
          services: data.services,
          specialties: data.specialties,
          certifications: data.certifications,
          creditRating: data.creditRating,
          annualRevenue: data.annualRevenue,
          insurance: data.insurance,
          standardRates: data.standardRates,
          status: 'ACTIVE',
          onboardingDate: new Date(),
          backgroundCheck: false, // Would be set through separate process
          complianceNotes: data.complianceNotes
        }
      });

      logger.info('Vendor created successfully', {
        vendorId: vendor.id,
        vendorCode: data.vendorCode,
        name: data.name,
        type: data.vendorType
      });

      return vendor;
    } catch (error: unknown) {
      logger.error('Failed to create vendor', error);
      throw error;
    }
  }

  /**
   * Create a new broker record
   */
  async createBroker(data: BrokerCreationData): Promise<any> {
    try {
      // Validate organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: data.organizationId }
      });
      
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Check for duplicate broker code
      const existingBroker = await prisma.broker.findUnique({
        where: { brokerCode: data.brokerCode }
      });
      
      if (existingBroker) {
        throw new Error('Broker code already exists');
      }

      const broker = await prisma.broker.create({
        data: {
          organizationId: data.organizationId,
          brokerCode: data.brokerCode,
          name: data.name,
          company: data.company,
          licenseNumber: data.licenseNumber,
          licenseState: data.licenseState,
          contactInfo: data.contactInfo,
          assistants: data.assistants,
          specialization: data.specialization,
          markets: data.markets,
          propertyTypes: data.propertyTypes,
          commissionRates: data.commissionRates,
          commissionTerms: data.commissionTerms,
          status: 'ACTIVE',
          startDate: new Date()
        }
      });

      logger.info('Broker created successfully', {
        brokerId: broker.id,
        brokerCode: data.brokerCode,
        name: data.name,
        license: data.licenseNumber
      });

      return broker;
    } catch (error: unknown) {
      logger.error('Failed to create broker', error);
      throw error;
    }
  }

  /**
   * Record performance evaluation for vendor or broker
   */
  async recordPerformanceEvaluation(data: PerformanceEvaluationData): Promise<any> {
    try {
      if (data.vendorId) {
        return await this.recordVendorPerformance(data);
      } else if (data.brokerId) {
        return await this.recordBrokerPerformance(data);
      } else {
        throw new Error('Either vendorId or brokerId must be provided');
      }
    } catch (error: unknown) {
      logger.error('Failed to record performance evaluation', error);
      throw error;
    }
  }

  /**
   * Get comprehensive vendor summary
   */
  async getVendorSummary(organizationId: string): Promise<VendorSummary> {
    try {
      const vendors = await prisma.vendor.findMany({
        where: { organizationId },
        include: {
          performance: {
            orderBy: { evaluationDate: 'desc' },
            take: 1
          },
          contracts: true,
          invoices: true
        }
      });

      const totalVendors = vendors.length;
      const activeVendors = vendors.filter(v => v.status === 'ACTIVE').length;

      // Vendor breakdown by type
      const vendorsByType = vendors.reduce((acc, vendor) => {
        acc[vendor.vendorType] = (acc[vendor.vendorType] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      // Vendor breakdown by status
      const vendorsByStatus = vendors.reduce((acc, vendor) => {
        acc[vendor.status] = (acc[vendor.status] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      // Calculate performance metrics
      const vendorsWithPerformance = vendors.filter(v => v.performance.length > 0);
      const averagePerformanceScore = vendorsWithPerformance.length > 0 ?
        vendorsWithPerformance.reduce((sum, v) => sum + (v.performance[0]?.overallScore || 0), 0) / vendorsWithPerformance.length : 0;

      // Calculate total contract value
      const totalContractValue = vendors.reduce((sum, vendor) => {
        return sum + vendor.contracts.reduce((contractSum: number, contract: any) => {
          return contractSum + (contract.contractValue || 0);
        }, 0);
      }, 0);

      // Top performing vendors
      const topPerformingVendors = vendors
        .filter(v => v.performance.length > 0)
        .sort((a, b) => (b.performance[0]?.overallScore || 0) - (a.performance[0]?.overallScore || 0))
        .slice(0, 10)
        .map(v => ({
          vendorId: v.id,
          vendorName: v.name,
          overallRating: v.performance[0]?.overallScore || 0,
          totalProjects: v.totalProjects,
          contractValue: v.contracts.reduce((sum: number, contract: any) => sum + (contract.contractValue || 0), 0)
        }));

      // Performance metrics
      const performanceMetrics = this.calculateVendorPerformanceMetrics(vendorsWithPerformance);

      // Risk assessment
      const riskAssessment = this.calculateVendorRiskDistribution(vendors);

      return {
        totalVendors,
        activeVendors,
        vendorsByType,
        vendorsByStatus,
        averagePerformanceScore: Math.round(averagePerformanceScore * 100) / 100,
        totalContractValue: Math.round(totalContractValue),
        topPerformingVendors,
        performanceMetrics,
        riskAssessment
      };
    } catch (error: unknown) {
      logger.error('Failed to get vendor summary', error);
      throw error;
    }
  }

  /**
   * Get comprehensive broker summary
   */
  async getBrokerSummary(organizationId: string): Promise<BrokerSummary> {
    try {
      const brokers = await prisma.broker.findMany({
        where: { organizationId },
        include: {
          performance: {
            orderBy: { evaluationDate: 'desc' },
            take: 1
          },
          tenantBrokers: {
            include: {
              tenant: {
                include: {
                  leases: true
                }
              }
            }
          }
        }
      });

      const totalBrokers = brokers.length;
      const activeBrokers = brokers.filter(b => b.status === 'ACTIVE').length;

      // Calculate transaction metrics
      let totalTransactions = 0;
      let totalVolume = 0;
      brokers.forEach(broker => {
        totalTransactions += broker.dealsCompleted;
        totalVolume += broker.totalValue;
      });

      const averageCommission = totalTransactions > 0 ? 
        brokers.reduce((sum, b) => sum + (b.averageCommission || 0), 0) / totalTransactions : 0;

      // Top performing brokers
      const topPerformingBrokers = brokers
        .filter(b => b.performance.length > 0)
        .sort((a, b) => (b.performance[0]?.overallScore || 0) - (a.performance[0]?.overallScore || 0))
        .slice(0, 10)
        .map(b => ({
          brokerId: b.id,
          brokerName: b.name,
          overallRating: b.performance[0]?.overallScore || 0,
          transactionsCompleted: b.dealsCompleted,
          totalVolume: b.totalValue
        }));

      // Performance metrics
      const brokersWithPerformance = brokers.filter(b => b.performance.length > 0);
      const performanceMetrics = this.calculateBrokerPerformanceMetrics(brokersWithPerformance);

      // Market analysis
      const marketAnalysis = this.calculateMarketAnalysis(brokers);

      return {
        totalBrokers,
        activeBrokers,
        totalTransactions,
        totalVolume: Math.round(totalVolume),
        averageCommission: Math.round(averageCommission),
        topPerformingBrokers,
        performanceMetrics,
        marketAnalysis
      };
    } catch (error: unknown) {
      logger.error('Failed to get broker summary', error);
      throw error;
    }
  }

  /**
   * Perform vendor risk assessment
   */
  async performVendorRiskAssessment(vendorId: string): Promise<VendorRiskAssessment> {
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
        include: {
          performance: {
            orderBy: { evaluationDate: 'desc' },
            take: 5
          },
          contracts: true,
          invoices: {
            orderBy: { invoiceDate: 'desc' },
            take: 12 // Last 12 invoices for payment history analysis
          }
        }
      });

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      const riskFactors = [];
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

      // Financial risk assessment
      if (vendor.creditRating && ['C', 'D', 'DEFAULT'].includes(vendor.creditRating)) {
        riskFactors.push({
          factor: 'Poor Credit Rating',
          severity: 'HIGH' as const,
          description: `Credit rating of ${vendor.creditRating} indicates financial instability`,
          mitigation: 'Require additional security deposits or guarantees'
        });
        riskLevel = 'HIGH';
      }

      // Performance risk assessment
      if (vendor.performance.length > 0) {
        const avgPerformance = vendor.performance.reduce((sum, p) => sum + (p.overallScore || 0), 0) / vendor.performance.length;
        if (avgPerformance < 3) {
          riskFactors.push({
            factor: 'Poor Performance History',
            severity: 'HIGH' as const,
            description: `Average performance score of ${avgPerformance.toFixed(1)} is below acceptable threshold`,
            mitigation: 'Implement performance improvement plan and increased oversight'
          });
          riskLevel = 'HIGH';
        }
      }

      // Compliance risk assessment
      if (!vendor.backgroundCheck) {
        riskFactors.push({
          factor: 'No Background Check',
          severity: 'MEDIUM' as const,
          description: 'Background check has not been completed',
          mitigation: 'Complete background verification before contract execution'
        });
        if (riskLevel === 'LOW') {riskLevel = 'MEDIUM';}
      }

      // Payment history analysis
      const overdueInvoices = vendor.invoices.filter(i => 
        i.status === 'OVERDUE' || 
        (i.dueDate < new Date() && i.status === 'PENDING')
      );
      
      if (overdueInvoices.length > 2) {
        riskFactors.push({
          factor: 'Payment Issues',
          severity: 'MEDIUM' as const,
          description: `${overdueInvoices.length} overdue invoices indicate payment processing issues`,
          mitigation: 'Review payment processes and terms'
        });
        if (riskLevel === 'LOW') {riskLevel = 'MEDIUM';}
      }

      // Insurance coverage check
      if (!vendor.insurance || Object.keys(vendor.insurance as any || {}).length === 0) {
        riskFactors.push({
          factor: 'Inadequate Insurance Coverage',
          severity: 'HIGH' as const,
          description: 'Missing or incomplete insurance documentation',
          mitigation: 'Require proof of adequate insurance coverage'
        });
        riskLevel = 'HIGH';
      }

      // Generate financial, operational, and compliance risk summaries
      const financialRisk = {
        creditRating: vendor.creditRating || 'Not Available',
        revenueStability: vendor.annualRevenue && vendor.annualRevenue > 1000000 ? 'Stable' : 'Unknown',
        paymentHistory: overdueInvoices.length === 0 ? 'Good' : 'Concerning'
      };

      const operationalRisk = {
        performanceHistory: vendor.performance.length > 0 ? 
          (vendor.performance.reduce((sum, p) => sum + (p.overallScore || 0), 0) / vendor.performance.length > 3.5 ? 'Good' : 'Poor') : 'Not Evaluated',
        deliveryReliability: vendor.totalProjects > 0 && vendor.completedProjects > 0 ? 
          ((vendor.completedProjects / vendor.totalProjects) > 0.9 ? 'High' : 'Medium') : 'Unknown',
        qualityConsistency: 'Acceptable' // Would be calculated from quality scores
      };

      const complianceRisk = {
        licenseStatus: 'Current', // Would be verified against licensing systems
        insuranceCoverage: vendor.insurance ? 'Adequate' : 'Insufficient',
        backgroundCheck: vendor.backgroundCheck ? 'Complete' : 'Pending'
      };

      // Generate recommendations
      const recommendations = this.generateRiskRecommendations(riskLevel, riskFactors);

      const assessment: VendorRiskAssessment = {
        vendorId,
        riskLevel,
        riskFactors,
        financialRisk,
        operationalRisk,
        complianceRisk,
        recommendations,
        reviewDate: new Date(),
        nextReviewDate: new Date(Date.now() + (riskLevel === 'HIGH' ? 90 : riskLevel === 'MEDIUM' ? 180 : 365) * 24 * 60 * 60 * 1000)
      };

      logger.info('Vendor risk assessment completed', {
        vendorId,
        riskLevel,
        factorCount: riskFactors.length
      });

      return assessment;
    } catch (error: unknown) {
      logger.error('Failed to perform vendor risk assessment', error);
      throw error;
    }
  }

  /**
   * Generate vendor performance report
   */
  async generateVendorPerformanceReport(
    organizationId: string,
    reportType: string,
    filters: any = {}
  ): Promise<any> {
    try {
      switch (reportType) {
        case 'PERFORMANCE_SUMMARY':
          return await this.generatePerformanceSummaryReport(organizationId, filters);
        case 'VENDOR_SCORECARDS':
          return await this.generateVendorScorecardsReport(organizationId, filters);
        case 'RISK_ANALYSIS':
          return await this.generateRiskAnalysisReport(organizationId, filters);
        case 'BROKER_ANALYSIS':
          return await this.generateBrokerAnalysisReport(organizationId, filters);
        default:
          throw new Error('Invalid report type');
      }
    } catch (error: unknown) {
      logger.error('Failed to generate vendor performance report', error);
      throw error;
    }
  }

  /**
   * Update vendor performance rating
   */
  async updateVendorRating(vendorId: string, newRating: number, reason: string): Promise<any> {
    try {
      const vendor = await prisma.vendor.update({
        where: { id: vendorId },
        data: {
          overallRating: newRating,
          updatedAt: new Date()
        }
      });

      // Log the rating change
      logger.info('Vendor rating updated', {
        vendorId,
        newRating,
        reason,
        timestamp: new Date()
      });

      return vendor;
    } catch (error: unknown) {
      logger.error('Failed to update vendor rating', error);
      throw error;
    }
  }

  /**
   * Bulk update vendor statuses
   */
  async bulkUpdateVendorStatus(
    organizationId: string,
    updates: Array<{
      vendorId: string;
      newStatus: string;
      reason: string;
    }>
  ): Promise<any> {
    try {
      const results = [];

      for (const update of updates) {
        try {
          const vendor = await prisma.vendor.update({
            where: {
              id: update.vendorId,
              organizationId // Ensure vendor belongs to organization
            },
            data: {
              status: update.newStatus as any,
              updatedAt: new Date()
            }
          });

          results.push({
            vendorId: update.vendorId,
            status: 'SUCCESS',
            newStatus: update.newStatus
          });

        } catch (error: unknown) {
          results.push({
            vendorId: update.vendorId,
            status: 'ERROR',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      logger.info('Bulk vendor status update completed', {
        organizationId,
        totalUpdates: updates.length,
        successful: results.filter(r => r.status === 'SUCCESS').length,
        failed: results.filter(r => r.status === 'ERROR').length
      });

      return {
        summary: {
          total: updates.length,
          successful: results.filter(r => r.status === 'SUCCESS').length,
          failed: results.filter(r => r.status === 'ERROR').length
        },
        results
      };
    } catch (error: unknown) {
      logger.error('Failed to bulk update vendor status', error);
      throw error;
    }
  }

  // Private helper methods

  private async recordVendorPerformance(data: PerformanceEvaluationData): Promise<any> {
    const vendor = await prisma.vendor.findUnique({
      where: { id: data.vendorId! }
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const performance = await prisma.vendorPerformance.create({
      data: {
        vendorId: data.vendorId!,
        evaluationPeriod: data.evaluationPeriod,
        evaluationType: data.evaluationType,
        qualityScore: data.metrics.qualityScore,
        timelinessScore: data.metrics.timelinessScore,
        costScore: data.metrics.costScore,
        communicationScore: data.metrics.communicationScore,
        overallScore: data.metrics.overallScore,
        projectsCompleted: data.projectMetrics?.projectsCompleted || 0,
        onTimeDelivery: data.projectMetrics?.onTimeDelivery || 0,
        onBudgetDelivery: data.projectMetrics?.onBudgetDelivery || 0,
        customerSatisfaction: data.projectMetrics?.customerSatisfaction,
        totalContractValue: data.financialMetrics?.totalContractValue,
        costVariance: data.financialMetrics?.costVariance,
        changeOrders: data.financialMetrics?.changeOrders || 0,
        changeOrderValue: data.financialMetrics?.changeOrderValue || 0,
        issuesReported: data.issuesAndComplaints?.issuesReported || 0,
        complaintsReceived: data.issuesAndComplaints?.complaintsReceived || 0,
        resolutionTime: data.issuesAndComplaints?.resolutionTime,
        evaluationNotes: data.evaluationNotes,
        recommendations: data.recommendations,
        recognitions: data.recognitions,
        evaluationDate: new Date(),
        evaluatedBy: data.evaluatedBy
      }
    });

    // Update vendor's aggregate performance metrics
    await this.updateVendorAggregateMetrics(data.vendorId!);

    return performance;
  }

  private async recordBrokerPerformance(data: PerformanceEvaluationData): Promise<any> {
    const broker = await prisma.broker.findUnique({
      where: { id: data.brokerId! }
    });

    if (!broker) {
      throw new Error('Broker not found');
    }

    const performance = await prisma.brokerPerformance.create({
      data: {
        brokerId: data.brokerId!,
        evaluationPeriod: data.evaluationPeriod,
        transactionsCompleted: data.transactionMetrics?.transactionsCompleted || 0,
        totalVolume: data.transactionMetrics?.totalVolume || 0,
        averageDealSize: data.transactionMetrics?.averageDealSize,
        averageCommission: data.transactionMetrics?.averageCommission,
        marketingScore: data.metrics.qualityScore, // Repurpose for marketing
        negotiationScore: data.metrics.timelinessScore, // Repurpose for negotiation
        documentationScore: data.metrics.costScore, // Repurpose for documentation
        relationshipScore: data.metrics.communicationScore,
        overallScore: data.metrics.overallScore,
        clientSatisfaction: data.projectMetrics?.customerSatisfaction,
        referralsReceived: 0, // Would be tracked separately
        repeatClients: 0, // Would be tracked separately
        averageMarketTime: 45, // Demo value - would be calculated
        listingToContract: 30, // Demo value - would be calculated
        contractToClose: 45, // Demo value - would be calculated
        evaluationNotes: data.evaluationNotes,
        areasForImprovement: data.recommendations,
        strengths: data.recognitions,
        evaluationDate: new Date(),
        evaluatedBy: data.evaluatedBy
      }
    });

    // Update broker's aggregate performance metrics
    await this.updateBrokerAggregateMetrics(data.brokerId!);

    return performance;
  }

  private async updateVendorAggregateMetrics(vendorId: string): Promise<void> {
    const performances = await prisma.vendorPerformance.findMany({
      where: { vendorId },
      orderBy: { evaluationDate: 'desc' }
    });

    if (performances.length === 0) {return;}

    const avgOverallScore = performances.reduce((sum, p) => sum + (p.overallScore || 0), 0) / performances.length;
    const totalProjects = performances.reduce((sum, p) => sum + (p.projectsCompleted || 0), 0);
    const completedProjects = performances.reduce((sum, p) => sum + (p.onTimeDelivery || 0), 0);

    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        overallRating: avgOverallScore,
        totalProjects,
        completedProjects,
        activeProjects: totalProjects - completedProjects
      }
    });
  }

  private async updateBrokerAggregateMetrics(brokerId: string): Promise<void> {
    const performances = await prisma.brokerPerformance.findMany({
      where: { brokerId },
      orderBy: { evaluationDate: 'desc' }
    });

    if (performances.length === 0) {return;}

    const avgOverallScore = performances.reduce((sum, p) => sum + (p.overallScore || 0), 0) / performances.length;
    const totalTransactions = performances.reduce((sum, p) => sum + (p.transactionsCompleted || 0), 0);
    const totalVolume = performances.reduce((sum, p) => sum + (p.totalVolume || 0), 0);

    await prisma.broker.update({
      where: { id: brokerId },
      data: {
        overallRating: avgOverallScore,
        dealsCompleted: totalTransactions,
        totalValue: totalVolume,
        averageCommission: totalTransactions > 0 ? totalVolume / totalTransactions * 0.03 : 0 // 3% assumption
      }
    });
  }

  private calculateVendorPerformanceMetrics(vendors: any[]): any {
    if (vendors.length === 0) {
      return {
        averageQualityScore: 0,
        averageTimelinessScore: 0,
        averageCostScore: 0,
        onTimeDeliveryRate: 0,
        onBudgetDeliveryRate: 0
      };
    }

    const performances = vendors.map(v => v.performance[0]).filter(p => p);
    
    return {
      averageQualityScore: this.calculateAverage(performances.map(p => p.qualityScore)),
      averageTimelinessScore: this.calculateAverage(performances.map(p => p.timelinessScore)),
      averageCostScore: this.calculateAverage(performances.map(p => p.costScore)),
      onTimeDeliveryRate: this.calculateDeliveryRate(performances, 'onTimeDelivery'),
      onBudgetDeliveryRate: this.calculateDeliveryRate(performances, 'onBudgetDelivery')
    };
  }

  private calculateBrokerPerformanceMetrics(brokers: any[]): any {
    if (brokers.length === 0) {
      return {
        averageMarketingScore: 0,
        averageNegotiationScore: 0,
        averageDocumentationScore: 0,
        averageMarketTime: 0,
        clientSatisfactionScore: 0
      };
    }

    const performances = brokers.map(b => b.performance[0]).filter(p => p);
    
    return {
      averageMarketingScore: this.calculateAverage(performances.map(p => p.marketingScore)),
      averageNegotiationScore: this.calculateAverage(performances.map(p => p.negotiationScore)),
      averageDocumentationScore: this.calculateAverage(performances.map(p => p.documentationScore)),
      averageMarketTime: this.calculateAverage(performances.map(p => p.averageMarketTime)),
      clientSatisfactionScore: this.calculateAverage(performances.map(p => p.clientSatisfaction))
    };
  }

  private calculateVendorRiskDistribution(vendors: any[]): any {
    // Simplified risk calculation based on performance and status
    let highRisk = 0, mediumRisk = 0, lowRisk = 0;

    vendors.forEach(vendor => {
      const latestPerformance = vendor.performance[0];
      const overallScore = latestPerformance?.overallScore || 3;

      if (vendor.status === 'SUSPENDED' || overallScore < 2.5) {
        highRisk++;
      } else if (overallScore < 3.5 || !vendor.backgroundCheck) {
        mediumRisk++;
      } else {
        lowRisk++;
      }
    });

    return { highRiskVendors: highRisk, mediumRiskVendors: mediumRisk, lowRiskVendors: lowRisk };
  }

  private calculateMarketAnalysis(brokers: any[]): any {
    const marketsByBroker = new Map<string, number>();
    const propertyTypesByBroker = new Map<string, number>();

    brokers.forEach(broker => {
      (broker.markets || []).forEach((market: string) => {
        marketsByBroker.set(market, (marketsByBroker.get(market) || 0) + 1);
      });

      (broker.propertyTypes || []).forEach((type: string) => {
        propertyTypesByBroker.set(type, (propertyTypesByBroker.get(type) || 0) + 1);
      });
    });

    return {
      marketsByBroker: Object.fromEntries(marketsByBroker),
      propertyTypesByBroker: Object.fromEntries(propertyTypesByBroker)
    };
  }

  private calculateAverage(values: (number | null | undefined)[]): number {
    const validValues = values.filter(v => v != null) as number[];
    return validValues.length > 0 ? 
      Math.round((validValues.reduce((sum, v) => sum + v, 0) / validValues.length) * 100) / 100 : 0;
  }

  private calculateDeliveryRate(performances: any[], field: string): number {
    const totalProjects = performances.reduce((sum, p) => sum + (p.projectsCompleted || 0), 0);
    const successfulDeliveries = performances.reduce((sum, p) => sum + (p[field] || 0), 0);
    return totalProjects > 0 ? Math.round((successfulDeliveries / totalProjects) * 10000) / 100 : 0;
  }

  private generateRiskRecommendations(riskLevel: string, riskFactors: any[]): string[] {
    const recommendations = [];

    if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
      recommendations.push('Require additional contract security measures');
      recommendations.push('Implement enhanced monitoring and oversight');
      recommendations.push('Consider contract renegotiation or termination');
    }

    if (riskLevel === 'MEDIUM' || riskLevel === 'HIGH') {
      recommendations.push('Schedule more frequent performance reviews');
      recommendations.push('Establish clear performance improvement metrics');
    }

    riskFactors.forEach(factor => {
      if (factor.mitigation) {
        recommendations.push(factor.mitigation);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Continue standard monitoring and periodic reviews');
    }

    return recommendations;
  }

  private async generatePerformanceSummaryReport(organizationId: string, filters: any): Promise<any> {
    const vendorSummary = await this.getVendorSummary(organizationId);
    const brokerSummary = await this.getBrokerSummary(organizationId);

    return {
      reportType: 'PERFORMANCE_SUMMARY',
      generatedDate: new Date(),
      vendorSummary,
      brokerSummary,
      keyInsights: [
        `${vendorSummary.topPerformingVendors.length} vendors achieving excellence`,
        `Average vendor performance score: ${vendorSummary.averagePerformanceScore}`,
        `${brokerSummary.activeBrokers} active brokers managing $${brokerSummary.totalVolume.toLocaleString()} in transactions`,
        `${vendorSummary.riskAssessment.highRiskVendors} vendors require immediate attention`
      ]
    };
  }

  private async generateVendorScorecardsReport(organizationId: string, filters: any): Promise<any> {
    // Implementation for detailed vendor scorecards
    return {
      reportType: 'VENDOR_SCORECARDS',
      generatedDate: new Date(),
      // ... detailed scorecard implementation
    };
  }

  private async generateRiskAnalysisReport(organizationId: string, filters: any): Promise<any> {
    // Implementation for risk analysis report
    return {
      reportType: 'RISK_ANALYSIS',
      generatedDate: new Date(),
      // ... detailed risk analysis implementation
    };
  }

  private async generateBrokerAnalysisReport(organizationId: string, filters: any): Promise<any> {
    // Implementation for broker analysis report
    return {
      reportType: 'BROKER_ANALYSIS',
      generatedDate: new Date(),
      // ... detailed broker analysis implementation
    };
  }
}