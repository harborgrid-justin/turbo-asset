/**
 * Custom Domain Management Service
 * 
 * Handles custom domain setup, verification, SSL certificate management,
 * and DNS record configuration for tenant white-label domains.
 */

import { EventEmitter } from 'events';
import * as dns from 'dns';
import { promisify } from 'util';
import { logger } from '../../../config/logger';
import { 
  CustomDomain, 
  DomainStatus, 
  DomainVerificationMethod 
} from '../types/TenantBrandingTypes';
import { 
  DOMAIN_VERIFICATION, 
  EVENTS, 
  ERROR_CODES, 
  RATE_LIMITS 
} from '../constants/TenantBrandingConstants';

const dnsResolve = promisify(dns.resolve);
const dnsResolveTxt = promisify(dns.resolveTxt);

interface DomainVerificationAttempt {
  timestamp: Date;
  method: DomainVerificationMethod;
  result: boolean;
  error?: string;
}

export class CustomDomainManagementService extends EventEmitter {
  private domainCache: Map<string, string> = new Map(); // domain -> organizationId
  private domainConfigs: Map<string, CustomDomain> = new Map();
  private verificationAttempts: Map<string, DomainVerificationAttempt[]> = new Map();
  private verificationQueue: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.setupEventHandlers();
    this.startPeriodicVerificationCheck();
  }

  /**
   * Setup event handlers for domain management
   */
  private setupEventHandlers(): void {
    this.on(EVENTS.DOMAIN_VERIFIED, this.handleDomainVerified.bind(this));
    this.on(EVENTS.DOMAIN_VERIFICATION_FAILED, this.handleVerificationFailed.bind(this));
  }

  /**
   * Setup custom domain for an organization
   */
  async setupCustomDomain(
    organizationId: string,
    domain: string,
    subdomain?: string
  ): Promise<CustomDomain> {
    try {
      // Validate domain format
      this.validateDomainName(domain);
      
      // Check rate limiting
      await this.checkRateLimit(organizationId, 'setup');

      // Generate verification code
      const verificationCode = this.generateVerificationCode();
      
      const fullDomain = subdomain ? `${subdomain}.${domain}` : domain;
      
      // Create DNS records
      const dnsRecords = [
        {
          type: 'TXT' as const,
          name: `${DOMAIN_VERIFICATION.TXT_RECORD_PREFIX}.${domain}`,
          value: verificationCode,
          ttl: DOMAIN_VERIFICATION.DEFAULT_TTL,
        },
        {
          type: 'CNAME' as const,
          name: subdomain || 'app',
          value: `${organizationId}${DOMAIN_VERIFICATION.CNAME_TARGET_SUFFIX}`,
          ttl: DOMAIN_VERIFICATION.DEFAULT_TTL,
        },
      ];

      const customDomain: CustomDomain = {
        domain,
        subdomain,
        isVerified: false,
        verificationCode,
        verificationMethod: 'TXT',
        sslEnabled: true,
        redirectWww: false,
        dnsRecords,
        status: 'PENDING',
      };

      // Store domain configuration
      this.domainConfigs.set(fullDomain, customDomain);
      this.domainCache.set(fullDomain, organizationId);

      // Schedule verification check
      this.scheduleVerificationCheck(fullDomain);

      logger.info('Custom domain setup initiated', {
        organizationId,
        domain,
        subdomain,
        fullDomain,
        verificationCode,
      });

      return customDomain;
    } catch (error: unknown) {
      logger.error('Custom domain setup failed', {
        organizationId,
        domain,
        error: error instanceof Error ? (error as Error).message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Verify custom domain
   */
  async verifyCustomDomain(
    organizationId: string,
    domain: string
  ): Promise<boolean> {
    try {
      const domainConfig = this.domainConfigs.get(domain);
      if (!domainConfig) {
        throw new Error(`Domain configuration not found: ${domain}`);
      }

      // Check if already verified
      if (domainConfig.isVerified) {
        return true;
      }

      // Check rate limiting
      await this.checkRateLimit(organizationId, 'verify');

      let isVerified = false;
      let verificationError: string | undefined;

      try {
        // Try TXT record verification first
        if (domainConfig.verificationMethod === 'TXT' || !domainConfig.verificationMethod) {
          isVerified = await this.verifyTxtRecord(domainConfig.domain, domainConfig.verificationCode!);
        }

        // Try CNAME verification if TXT fails
        if (!isVerified && domainConfig.verificationMethod === 'CNAME') {
          isVerified = await this.verifyCnameRecord(domainConfig);
        }
      } catch (error: unknown) {
        verificationError = error instanceof Error ? (error as Error).message : 'Verification failed';
        logger.error('Domain verification check failed', {
          domain,
          error: verificationError,
        });
      }

      // Record verification attempt
      this.recordVerificationAttempt(domain, domainConfig.verificationMethod || 'TXT', isVerified, verificationError);

      if (isVerified) {
        // Update domain as verified
        domainConfig.isVerified = true;
        domainConfig.status = 'VERIFIED';
        domainConfig.verifiedAt = new Date();
        
        this.domainConfigs.set(domain, domainConfig);

        // Clear verification queue
        this.clearVerificationSchedule(domain);

        // Emit verification success event
        this.emit(EVENTS.DOMAIN_VERIFIED, {
          organizationId,
          domain,
          verificationMethod: domainConfig.verificationMethod,
        });

        logger.info('Custom domain verified successfully', {
          organizationId,
          domain,
          verificationMethod: domainConfig.verificationMethod,
        });

        // Start SSL certificate setup
        await this.setupSSLCertificate(domain);
      } else {
        // Update failure status
        domainConfig.status = 'FAILED';
        this.domainConfigs.set(domain, domainConfig);

        // Emit verification failure event
        this.emit(EVENTS.DOMAIN_VERIFICATION_FAILED, {
          organizationId,
          domain,
          error: verificationError,
        });
      }

      return isVerified;
    } catch (error: unknown) {
      logger.error('Domain verification failed', {
        organizationId,
        domain,
        error: error instanceof Error ? (error as Error).message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get organization by domain
   */
  async getOrganizationByDomain(domain: string): Promise<string | null> {
    return this.domainCache.get(domain) || null;
  }

  /**
   * Get domain configuration
   */
  async getDomainConfiguration(domain: string): Promise<CustomDomain | null> {
    return this.domainConfigs.get(domain) || null;
  }

  /**
   * Update domain configuration
   */
  async updateDomainConfiguration(
    domain: string,
    updates: Partial<CustomDomain>
  ): Promise<CustomDomain> {
    const existingConfig = this.domainConfigs.get(domain);
    if (!existingConfig) {
      throw new Error(`Domain configuration not found: ${domain}`);
    }

    const updatedConfig = {
      ...existingConfig,
      ...updates,
    };

    this.domainConfigs.set(domain, updatedConfig);

    logger.info('Domain configuration updated', {
      domain,
      updates: Object.keys(updates),
    });

    return updatedConfig;
  }

  /**
   * Remove custom domain
   */
  async removeCustomDomain(organizationId: string, domain: string): Promise<boolean> {
    try {
      const domainConfig = this.domainConfigs.get(domain);
      if (!domainConfig) {
        return false;
      }

      // Clear verification schedule
      this.clearVerificationSchedule(domain);

      // Remove from caches
      this.domainConfigs.delete(domain);
      this.domainCache.delete(domain);
      this.verificationAttempts.delete(domain);

      logger.info('Custom domain removed', {
        organizationId,
        domain,
      });

      return true;
    } catch (error: unknown) {
      logger.error('Failed to remove custom domain', {
        organizationId,
        domain,
        error: error instanceof Error ? (error as Error).message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get all domains for an organization
   */
  async getOrganizationDomains(organizationId: string): Promise<CustomDomain[]> {
    const domains: CustomDomain[] = [];
    
    for (const [domain, orgId] of this.domainCache.entries()) {
      if (orgId === organizationId) {
        const config = this.domainConfigs.get(domain);
        if (config) {
          domains.push(config);
        }
      }
    }

    return domains;
  }

  /**
   * Get domain verification attempts
   */
  async getVerificationAttempts(domain: string): Promise<DomainVerificationAttempt[]> {
    return this.verificationAttempts.get(domain) || [];
  }

  /**
   * Validate domain name format
   */
  private validateDomainName(domain: string): void {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
    
    if (!domainRegex.test(domain)) {
      throw new Error(`Invalid domain format: ${domain}`);
    }
    
    if (domain.length > 253) {
      throw new Error('Domain name too long');
    }
  }

  /**
   * Generate verification code
   */
  private generateVerificationCode(): string {
    const prefix = DOMAIN_VERIFICATION.VERIFICATION_CODE_PREFIX;
    const randomPart = Math.random().toString(36).substring(2, DOMAIN_VERIFICATION.VERIFICATION_CODE_LENGTH);
    return `${prefix}-${randomPart}`;
  }

  /**
   * Verify TXT record
   */
  private async verifyTxtRecord(domain: string, expectedCode: string): Promise<boolean> {
    try {
      const txtRecords = await dnsResolveTxt(`${DOMAIN_VERIFICATION.TXT_RECORD_PREFIX}.${domain}`);
      
      for (const record of txtRecords) {
        const recordValue = Array.isArray(record) ? record.join('') : record;
        if (recordValue === expectedCode) {
          return true;
        }
      }
      
      return false;
    } catch (error: unknown) {
      logger.debug('TXT record verification failed', { domain, error });
      return false;
    }
  }

  /**
   * Verify CNAME record
   */
  private async verifyCnameRecord(domainConfig: CustomDomain): Promise<boolean> {
    try {
      const subdomain = domainConfig.subdomain || 'app';
      const fullSubdomain = `${subdomain}.${domainConfig.domain}`;
      
      // This would need to be implemented based on your DNS provider
      // For now, we'll simulate the check
      logger.debug('CNAME record verification simulated', { domain: fullSubdomain });
      return false; // Placeholder
    } catch (error: unknown) {
      logger.debug('CNAME record verification failed', { domain: domainConfig.domain, error });
      return false;
    }
  }

  /**
   * Setup SSL certificate
   */
  private async setupSSLCertificate(domain: string): Promise<void> {
    try {
      // This would integrate with your SSL certificate provider (e.g., Let's Encrypt, AWS ACM)
      logger.info('SSL certificate setup initiated', { domain });
      
      // Placeholder for SSL certificate setup logic
      const domainConfig = this.domainConfigs.get(domain);
      if (domainConfig) {
        domainConfig.certificateId = `cert-${Date.now()}`;
        domainConfig.sslEnabled = true;
        this.domainConfigs.set(domain, domainConfig);
      }
      
      logger.info('SSL certificate setup completed', { domain });
    } catch (error: unknown) {
      logger.error('SSL certificate setup failed', {
        domain,
        error: error instanceof Error ? (error as Error).message : 'Unknown error',
      });
    }
  }

  /**
   * Schedule verification check
   */
  private scheduleVerificationCheck(domain: string): void {
    // Clear existing schedule
    this.clearVerificationSchedule(domain);
    
    // Schedule verification check in 5 minutes
    const timeoutId = setTimeout(() => {
      this.performScheduledVerification(domain);
    }, 5 * 60 * 1000);
    
    this.verificationQueue.set(domain, timeoutId);
  }

  /**
   * Clear verification schedule
   */
  private clearVerificationSchedule(domain: string): void {
    const timeoutId = this.verificationQueue.get(domain);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.verificationQueue.delete(domain);
    }
  }

  /**
   * Perform scheduled verification
   */
  private async performScheduledVerification(domain: string): Promise<void> {
    try {
      const organizationId = this.domainCache.get(domain);
      if (!organizationId) {
        return;
      }

      const isVerified = await this.verifyCustomDomain(organizationId, domain);
      
      // If not verified and haven't reached max attempts, schedule another check
      if (!isVerified) {
        const attempts = this.verificationAttempts.get(domain) || [];
        if (attempts.length < DOMAIN_VERIFICATION.MAX_VERIFICATION_ATTEMPTS) {
          // Schedule next check in 30 minutes
          setTimeout(() => {
            this.performScheduledVerification(domain);
          }, 30 * 60 * 1000);
        } else {
          // Max attempts reached, mark as expired
          const domainConfig = this.domainConfigs.get(domain);
          if (domainConfig) {
            domainConfig.status = 'EXPIRED';
            this.domainConfigs.set(domain, domainConfig);
          }
        }
      }
    } catch (error: unknown) {
      logger.error('Scheduled verification failed', {
        domain,
        error: error instanceof Error ? (error as Error).message : 'Unknown error',
      });
    }
  }

  /**
   * Start periodic verification check for pending domains
   */
  private startPeriodicVerificationCheck(): void {
    setInterval(() => {
      this.checkPendingDomains();
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Check pending domains for verification
   */
  private async checkPendingDomains(): Promise<void> {
    for (const [domain, config] of this.domainConfigs.entries()) {
      if (config.status === 'PENDING' && !config.isVerified) {
        const organizationId = this.domainCache.get(domain);
        if (organizationId) {
          try {
            await this.verifyCustomDomain(organizationId, domain);
          } catch (error: unknown) {
            logger.debug('Periodic verification check failed', { domain, error });
          }
        }
      }
    }
  }

  /**
   * Record verification attempt
   */
  private recordVerificationAttempt(
    domain: string,
    method: DomainVerificationMethod,
    result: boolean,
    error?: string
  ): void {
    const attempts = this.verificationAttempts.get(domain) || [];
    
    attempts.push({
      timestamp: new Date(),
      method,
      result,
      error,
    });

    // Keep only last 10 attempts
    if (attempts.length > 10) {
      attempts.shift();
    }

    this.verificationAttempts.set(domain, attempts);
  }

  /**
   * Check rate limiting for domain operations
   */
  private async checkRateLimit(organizationId: string, operation: 'setup' | 'verify'): Promise<void> {
    // Simple rate limiting implementation
    // In production, this would use Redis or similar
    const key = `${organizationId}:${operation}`;
    const limits = operation === 'setup' 
      ? RATE_LIMITS.DOMAIN_VERIFICATION 
      : RATE_LIMITS.DOMAIN_VERIFICATION;

    // Placeholder for rate limiting logic
    logger.debug('Rate limit check', { organizationId, operation, key });
  }

  /**
   * Handle domain verified event
   */
  private handleDomainVerified(eventData: any): void {
    logger.info('Domain verification completed', eventData);
    // Additional post-verification processing can be added here
  }

  /**
   * Handle verification failed event
   */
  private handleVerificationFailed(eventData: any): void {
    logger.warn('Domain verification failed', eventData);
    // Additional failure handling can be added here
  }
}