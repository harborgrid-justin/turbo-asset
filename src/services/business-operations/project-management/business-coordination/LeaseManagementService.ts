/**
 * Lease Management Service - Enterprise Lease Lifecycle Management
 * 
 * Comprehensive service for managing lease agreements including
 * creation, administration, renewals, and financial reconciliation.
 */

import { EventEmitter } from 'events';
import { logger } from '../../../../config/logger';
import { prisma } from '../../../../config/database';
import {
  Lease,
  LeaseRentDetails,
  LeaseCriticalDate,
  LeasePayment,
  LeaseDocument,
  ILeaseManagementService,
  BusinessOperationsContext
} from './types';
import {
  LEASE_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  BUSINESS_OPERATIONS_CONFIG
} from './constants';

export class LeaseManagementService extends EventEmitter implements ILeaseManagementService {
  private cache = new Map<string, Lease>();
  private readonly cacheTTL = BUSINESS_OPERATIONS_CONFIG.CACHING.LEASE_CACHE_TTL * 1000;

  constructor(private context: BusinessOperationsContext) {
    super();
    logger.info('Lease Management Service initialized', {
      organizationId: context.organizationId,
      userId: context.userId
    });
  }

  async createLease(data: Partial<Lease>): Promise<Lease> {
    try {
      this.validateLeaseData(data);
      
      const leaseNumber = await this.generateLeaseNumber();
      
      const lease: Lease = {
        id: '',
        organizationId: this.context.organizationId,
        leaseNumber,
        propertyId: data.propertyId!,
        spaceIds: data.spaceIds || [],
        leaseType: data.leaseType!,
        status: 'DRAFT',
        startDate: data.startDate!,
        endDate: data.endDate!,
        rentableArea: data.rentableArea!,
        usableArea: data.usableArea!,
        rentDetails: data.rentDetails!,
        renewalOptions: data.renewalOptions || [],
        expansionOptions: data.expansionOptions || [],
        assignmentRights: data.assignmentRights!,
        subleaseRights: data.subleaseRights!,
        criticalDates: [],
        amendments: [],
        payments: [],
        documents: [],
        createdBy: this.context.userId,
        createdDate: new Date(),
        lastUpdated: new Date()
      };

      const savedLease = await this.saveLease(lease);
      this.cache.set(savedLease.id, savedLease);

      // Generate critical dates
      await this.generateCriticalDates(savedLease);

      this.emit('leaseCreated', {
        type: 'LEASE_CREATED',
        entityType: 'LEASE',
        entityId: savedLease.id,
        data: savedLease,
        timestamp: new Date(),
        userId: this.context.userId,
        organizationId: this.context.organizationId
      });

      logger.info('Lease created', {
        leaseId: savedLease.id,
        leaseNumber: savedLease.leaseNumber
      });

      return savedLease;
      
    } catch (error) {
      logger.error('Failed to create lease', error);
      throw new Error(`Failed to create lease: ${(error as Error).message}`);
    }
  }

  async getLease(id: string): Promise<Lease | null> {
    try {
      const cached = this.cache.get(id);
      if (cached) return cached;

      const lease = await this.loadLease(id);
      if (lease) {
        this.cache.set(id, lease);
      }
      return lease;
      
    } catch (error) {
      logger.error('Failed to get lease', { leaseId: id, error });
      throw new Error(`Failed to get lease: ${(error as Error).message}`);
    }
  }

  async updateLease(id: string, data: Partial<Lease>): Promise<Lease> {
    try {
      const existingLease = await this.getLease(id);
      if (!existingLease) {
        throw new Error('Lease not found');
      }

      this.validateLeaseUpdateData(data, existingLease);

      const updatedLease = {
        ...existingLease,
        ...data,
        lastUpdated: new Date()
      };

      const savedLease = await this.saveLease(updatedLease);
      this.cache.set(id, savedLease);

      this.emit('leaseUpdated', {
        type: 'LEASE_UPDATED',
        entityType: 'LEASE',
        entityId: id,
        data: savedLease,
        timestamp: new Date(),
        userId: this.context.userId,
        organizationId: this.context.organizationId
      });

      logger.info('Lease updated', { leaseId: id });
      return savedLease;
      
    } catch (error) {
      logger.error('Failed to update lease', { leaseId: id, error });
      throw new Error(`Failed to update lease: ${(error as Error).message}`);
    }
  }

  async deleteLease(id: string): Promise<boolean> {
    try {
      const lease = await this.getLease(id);
      if (!lease) {
        throw new Error('Lease not found');
      }

      if (lease.status === 'ACTIVE') {
        throw new Error('Cannot delete active lease');
      }

      await this.removeLease(id);
      this.cache.delete(id);

      this.emit('leaseDeleted', {
        type: 'LEASE_DELETED',
        entityType: 'LEASE',
        entityId: id,
        data: { leaseId: id },
        timestamp: new Date(),
        userId: this.context.userId,
        organizationId: this.context.organizationId
      });

      logger.info('Lease deleted', { leaseId: id });
      return true;
      
    } catch (error) {
      logger.error('Failed to delete lease', { leaseId: id, error });
      throw new Error(`Failed to delete lease: ${(error as Error).message}`);
    }
  }

  async searchLeases(criteria: any): Promise<Lease[]> {
    try {
      const {
        leaseType,
        status,
        propertyId,
        startDateAfter,
        startDateBefore,
        endDateAfter,
        endDateBefore,
        rentableAreaMin,
        rentableAreaMax,
        searchText,
        limit = 100,
        offset = 0
      } = criteria;

      const searchParams = {
        organizationId: this.context.organizationId,
        ...(leaseType && { leaseType }),
        ...(status && { status }),
        ...(propertyId && { propertyId }),
        ...(startDateAfter && { startDate: { gte: new Date(startDateAfter) } }),
        ...(startDateBefore && { startDate: { lte: new Date(startDateBefore) } }),
        ...(endDateAfter && { endDate: { gte: new Date(endDateAfter) } }),
        ...(endDateBefore && { endDate: { lte: new Date(endDateBefore) } }),
        ...(rentableAreaMin && { rentableArea: { gte: rentableAreaMin } }),
        ...(rentableAreaMax && { rentableArea: { lte: rentableAreaMax } })
      };

      const leases = await this.searchLeasesInDatabase(searchParams, limit, offset);

      let filteredLeases = leases;
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        filteredLeases = leases.filter(lease =>
          lease.leaseNumber.toLowerCase().includes(searchLower) ||
          lease.propertyId.toLowerCase().includes(searchLower)
        );
      }

      logger.info('Lease search completed', {
        criteria: Object.keys(criteria),
        resultCount: filteredLeases.length
      });

      return filteredLeases;
      
    } catch (error) {
      logger.error('Failed to search leases', error);
      throw new Error(`Failed to search leases: ${(error as Error).message}`);
    }
  }

  async getExpiringLeases(days: number): Promise<Lease[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + days);

      return await this.searchLeases({
        status: 'ACTIVE',
        endDateBefore: cutoffDate.toISOString()
      });
      
    } catch (error) {
      logger.error('Failed to get expiring leases', { days, error });
      throw new Error(`Failed to get expiring leases: ${(error as Error).message}`);
    }
  }

  async calculateRent(leaseId: string, date: Date): Promise<number> {
    try {
      const lease = await this.getLease(leaseId);
      if (!lease) {
        throw new Error('Lease not found');
      }

      const rentSchedule = lease.rentDetails.rentSchedule;
      const applicableSchedule = rentSchedule.find(schedule =>
        date >= schedule.startDate && date <= schedule.endDate
      );

      if (!applicableSchedule) {
        throw new Error('No applicable rent schedule found for the given date');
      }

      let totalRent = applicableSchedule.monthlyRent;

      // Add additional rent items
      lease.rentDetails.additionalRent.forEach(additional => {
        if (additional.billingFrequency === 'MONTHLY') {
          totalRent += additional.amount;
        } else if (additional.billingFrequency === 'QUARTERLY') {
          totalRent += additional.amount / 3;
        } else if (additional.billingFrequency === 'ANNUALLY') {
          totalRent += additional.amount / 12;
        }
      });

      logger.info('Rent calculated', { leaseId, date, totalRent });
      return totalRent;
      
    } catch (error) {
      logger.error('Failed to calculate rent', { leaseId, date, error });
      throw new Error(`Failed to calculate rent: ${(error as Error).message}`);
    }
  }

  async renewLease(leaseId: string, optionNumber: number): Promise<Lease> {
    try {
      const lease = await this.getLease(leaseId);
      if (!lease) {
        throw new Error('Lease not found');
      }

      const renewalOption = lease.renewalOptions.find(option => option.optionNumber === optionNumber);
      if (!renewalOption) {
        throw new Error(`Renewal option ${optionNumber} not found`);
      }

      // Calculate new end date
      const newEndDate = new Date(lease.endDate);
      if (renewalOption.termUnit === 'MONTHS') {
        newEndDate.setMonth(newEndDate.getMonth() + renewalOption.term);
      } else if (renewalOption.termUnit === 'YEARS') {
        newEndDate.setFullYear(newEndDate.getFullYear() + renewalOption.term);
      }

      // Update rent if renewal has new rate
      let updatedRentDetails = lease.rentDetails;
      if (renewalOption.rentValue) {
        const newScheduleEntry = {
          startDate: new Date(lease.endDate),
          endDate: newEndDate,
          monthlyRent: renewalOption.rentValue,
          annualRent: renewalOption.rentValue * 12,
          psf: renewalOption.rentValue / lease.rentableArea
        };
        updatedRentDetails.rentSchedule.push(newScheduleEntry);
      }

      const updatedLease = await this.updateLease(leaseId, {
        endDate: newEndDate,
        status: 'ACTIVE',
        rentDetails: updatedRentDetails
      });

      this.emit('leaseRenewed', {
        type: 'LEASE_RENEWED',
        entityType: 'LEASE',
        entityId: leaseId,
        data: {
          leaseId,
          optionNumber,
          oldEndDate: lease.endDate,
          newEndDate,
          renewalOption
        },
        timestamp: new Date(),
        userId: this.context.userId,
        organizationId: this.context.organizationId
      });

      logger.info('Lease renewed', { leaseId, optionNumber, newEndDate });
      return updatedLease;
      
    } catch (error) {
      logger.error('Failed to renew lease', { leaseId, optionNumber, error });
      throw new Error(`Failed to renew lease: ${(error as Error).message}`);
    }
  }

  async terminateLease(leaseId: string, reason: string): Promise<Lease> {
    try {
      const lease = await this.getLease(leaseId);
      if (!lease) {
        throw new Error('Lease not found');
      }

      if (lease.status === 'TERMINATED' || lease.status === 'EXPIRED') {
        throw new Error('Lease is already terminated or expired');
      }

      const updatedLease = await this.updateLease(leaseId, {
        status: 'TERMINATED'
      });

      this.emit('leaseTerminated', {
        type: 'LEASE_TERMINATED',
        entityType: 'LEASE',
        entityId: leaseId,
        data: {
          leaseId,
          reason,
          terminatedBy: this.context.userId,
          terminatedDate: new Date()
        },
        timestamp: new Date(),
        userId: this.context.userId,
        organizationId: this.context.organizationId
      });

      logger.info('Lease terminated', { leaseId, reason });
      return updatedLease;
      
    } catch (error) {
      logger.error('Failed to terminate lease', { leaseId, error });
      throw new Error(`Failed to terminate lease: ${(error as Error).message}`);
    }
  }

  async generateLeaseAbstract(leaseId: string): Promise<any> {
    try {
      const lease = await this.getLease(leaseId);
      if (!lease) {
        throw new Error('Lease not found');
      }

      const abstract = {
        leaseId,
        leaseNumber: lease.leaseNumber,
        property: {
          propertyId: lease.propertyId,
          spaces: lease.spaceIds,
          rentableArea: lease.rentableArea,
          usableArea: lease.usableArea
        },
        term: {
          startDate: lease.startDate,
          endDate: lease.endDate,
          durationMonths: this.calculateMonthsBetween(lease.startDate, lease.endDate)
        },
        rent: {
          currentMonthlyRent: this.getCurrentRent(lease),
          escalations: lease.rentDetails.escalations,
          additionalRent: lease.rentDetails.additionalRent,
          securityDeposit: lease.rentDetails.securityDeposit
        },
        renewalOptions: lease.renewalOptions,
        expansionOptions: lease.expansionOptions,
        assignmentRights: lease.assignmentRights,
        subleaseRights: lease.subleaseRights,
        criticalDates: lease.criticalDates,
        status: lease.status,
        generatedAt: new Date(),
        generatedBy: this.context.userId
      };

      logger.info('Lease abstract generated', { leaseId });
      return abstract;
      
    } catch (error) {
      logger.error('Failed to generate lease abstract', { leaseId, error });
      throw new Error(`Failed to generate abstract: ${(error as Error).message}`);
    }
  }

  async processRentPayment(leaseId: string, paymentData: Partial<LeasePayment>): Promise<LeasePayment> {
    try {
      const lease = await this.getLease(leaseId);
      if (!lease) {
        throw new Error('Lease not found');
      }

      const payment: LeasePayment = {
        id: this.generatePaymentId(),
        leaseId,
        paymentType: paymentData.paymentType!,
        amount: paymentData.amount!,
        dueDate: paymentData.dueDate!,
        paidDate: paymentData.paidDate,
        paidAmount: paymentData.paidAmount,
        status: paymentData.paidDate ? 'PAID' : 'PENDING',
        paymentMethod: paymentData.paymentMethod,
        reference: paymentData.reference
      };

      lease.payments.push(payment);
      await this.saveLease(lease);

      this.emit('paymentProcessed', {
        type: 'LEASE_PAYMENT_PROCESSED',
        entityType: 'LEASE_PAYMENT',
        entityId: payment.id,
        data: { leaseId, payment },
        timestamp: new Date(),
        userId: this.context.userId,
        organizationId: this.context.organizationId
      });

      logger.info('Lease payment processed', { leaseId, paymentId: payment.id });
      return payment;
      
    } catch (error) {
      logger.error('Failed to process lease payment', { leaseId, error });
      throw new Error(`Failed to process payment: ${(error as Error).message}`);
    }
  }

  // === PRIVATE HELPER METHODS ===

  private validateLeaseData(data: Partial<Lease>): void {
    if (!data.propertyId) throw new Error('Property ID is required');
    if (!data.leaseType) throw new Error('Lease type is required');
    if (!data.startDate || !data.endDate) throw new Error('Start and end dates are required');
    if (!data.rentableArea) throw new Error('Rentable area is required');
    if (!data.usableArea) throw new Error('Usable area is required');
    if (!data.rentDetails) throw new Error('Rent details are required');
    if (!data.assignmentRights) throw new Error('Assignment rights are required');
    if (!data.subleaseRights) throw new Error('Sublease rights are required');

    if (new Date(data.endDate) <= new Date(data.startDate)) {
      throw new Error('End date must be after start date');
    }
  }

  private validateLeaseUpdateData(data: Partial<Lease>, existing: Lease): void {
    if (existing.status === 'TERMINATED') {
      throw new Error('Cannot modify terminated lease');
    }

    if (data.startDate && data.endDate && new Date(data.endDate) <= new Date(data.startDate)) {
      throw new Error('End date must be after start date');
    }
  }

  private async generateLeaseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `LSE-${year}-${sequence}`;
  }

  private generatePaymentId(): string {
    return `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async generateCriticalDates(lease: Lease): Promise<void> {
    const criticalDates: LeaseCriticalDate[] = [];

    // Lease expiration
    criticalDates.push({
      id: this.generateCriticalDateId(),
      leaseId: lease.id,
      dateType: 'LEASE_EXPIRATION',
      date: lease.endDate,
      description: `Lease ${lease.leaseNumber} expires`,
      notificationPeriod: 180,
      notificationPeriodUnit: 'DAYS',
      status: 'UPCOMING',
      responsible: this.context.userId
    });

    // Rent commencement
    criticalDates.push({
      id: this.generateCriticalDateId(),
      leaseId: lease.id,
      dateType: 'RENT_COMMENCEMENT',
      date: lease.startDate,
      description: `Rent commencement for lease ${lease.leaseNumber}`,
      notificationPeriod: 30,
      notificationPeriodUnit: 'DAYS',
      status: 'UPCOMING',
      responsible: this.context.userId
    });

    // Renewal option exercises
    lease.renewalOptions.forEach((option, index) => {
      if (option.noticeRequired && option.noticePeriod) {
        const noticeDate = new Date(lease.endDate);
        if (option.noticePeriodUnit === 'DAYS') {
          noticeDate.setDate(noticeDate.getDate() - option.noticePeriod);
        } else if (option.noticePeriodUnit === 'MONTHS') {
          noticeDate.setMonth(noticeDate.getMonth() - option.noticePeriod);
        }

        criticalDates.push({
          id: this.generateCriticalDateId(),
          leaseId: lease.id,
          dateType: 'OPTION_EXERCISE',
          date: noticeDate,
          description: `Renewal option ${option.optionNumber} exercise deadline`,
          notificationPeriod: 30,
          notificationPeriodUnit: 'DAYS',
          status: 'UPCOMING',
          responsible: this.context.userId
        });
      }
    });

    lease.criticalDates = criticalDates;
  }

  private generateCriticalDateId(): string {
    return `criticaldate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateMonthsBetween(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  }

  private getCurrentRent(lease: Lease): number {
    const today = new Date();
    const currentSchedule = lease.rentDetails.rentSchedule.find(schedule =>
      today >= schedule.startDate && today <= schedule.endDate
    );
    return currentSchedule ? currentSchedule.monthlyRent : 0;
  }

  // Database operations (simplified for demo)
  private async saveLease(lease: Lease): Promise<Lease> {
    lease.id = lease.id || `lease_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return lease;
  }

  private async loadLease(id: string): Promise<Lease | null> {
    return null;
  }

  private async removeLease(id: string): Promise<void> {
    // Would delete from database
  }

  private async searchLeasesInDatabase(params: any, limit: number, offset: number): Promise<Lease[]> {
    return [];
  }
}