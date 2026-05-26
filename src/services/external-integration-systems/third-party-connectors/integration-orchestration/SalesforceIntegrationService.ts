/**
 * Salesforce Integration Service - CRM and sales data synchronization
 * 
 * This service handles comprehensive Salesforce integration including accounts,
 * contacts, opportunities, leads, and custom objects. Migrated from legacy
 * SalesforceIntegrationService with enhanced domain architecture.
 */

import { EventEmitter } from 'events';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import axios, { AxiosInstance } from 'axios';

export interface SalesforceConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  securityToken: string;
  loginUrl: string;
  version: string;
  sandboxMode?: boolean;
}

export interface SalesforceRecord {
  Id?: string;
  Name?: string;
  Type?: string;
  [key: string]: any;
}

export interface SalesforceQuery {
  soqlQuery: string;
  objectType: string;
  includeDeleted?: boolean;
}

export interface SalesforceAccount {
  Id?: string;
  Name: string;
  Type?: string;
  Industry?: string;
  AnnualRevenue?: number;
  NumberOfEmployees?: number;
  Phone?: string;
  Website?: string;
  BillingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  Description?: string;
  OwnerId?: string;
  CreatedDate?: Date;
  LastModifiedDate?: Date;
}

export interface SalesforceContact {
  Id?: string;
  FirstName?: string;
  LastName: string;
  Email?: string;
  Phone?: string;
  Title?: string;
  AccountId?: string;
  Department?: string;
  MailingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  OwnerId?: string;
  CreatedDate?: Date;
  LastModifiedDate?: Date;
}

export interface SalesforceOpportunity {
  Id?: string;
  Name: string;
  AccountId?: string;
  Amount?: number;
  CloseDate: Date;
  StageName: string;
  Probability?: number;
  Type?: string;
  LeadSource?: string;
  Description?: string;
  OwnerId?: string;
  CreatedDate?: Date;
  LastModifiedDate?: Date;
}

export interface SalesforceLead {
  Id?: string;
  FirstName?: string;
  LastName: string;
  Company: string;
  Email?: string;
  Phone?: string;
  Status: string;
  Source?: string;
  Industry?: string;
  Title?: string;
  Street?: string;
  City?: string;
  State?: string;
  PostalCode?: string;
  Country?: string;
  OwnerId?: string;
  CreatedDate?: Date;
  LastModifiedDate?: Date;
}

export interface SalesforceCase {
  Id?: string;
  Subject: string;
  Description?: string;
  Status: string;
  Priority: string;
  Origin: string;
  Type?: string;
  AccountId?: string;
  ContactId?: string;
  OwnerId?: string;
  CreatedDate?: Date;
  LastModifiedDate?: Date;
}

export interface IntegrationContext {
  organizationId: string;
  userId: string;
  permissions: string[];
}

export interface SyncOperation {
  syncId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';
  objectType: string;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: string[];
}

export class SalesforceIntegrationService extends EventEmitter {
  private readonly client: AxiosInstance;
  private accessToken: string | null = null;
  private instanceUrl: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private readonly integrationCache: Map<string, any> = new Map();
  private readonly schemaCache: Map<string, any> = new Map();

  constructor(
    private readonly config: SalesforceConfig,
    private readonly context?: IntegrationContext
  ) {
    super();
    
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.setupCacheManagement();
    
    logger.info('Salesforce Integration Service initialized', {
      organizationId: context?.organizationId,
      loginUrl: config.loginUrl,
      sandboxMode: config.sandboxMode
    });
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          logger.warn('Salesforce token expired, attempting re-authentication');
          await this.authenticate();
          
          // Retry the original request
          const originalRequest = error.config;
          if (!originalRequest._retry) {
            originalRequest._retry = true;
            return await this.client.request(originalRequest);
          }
        }
        
        logger.error('Salesforce API error', {
          status: error.response?.status,
          message: (error as Error).message,
          url: error.config?.url
        });
        
        throw error;
      }
    );
  }

  /**
   * Setup cache management with appropriate TTLs
   */
  private setupCacheManagement(): void {
    // Clear integration cache every 30 minutes
    setInterval(() => {
      this.integrationCache.clear();
      logger.debug('Salesforce integration cache cleared');
    }, 30 * 60 * 1000);

    // Clear schema cache every 4 hours (schemas change less frequently)
    setInterval(() => {
      this.schemaCache.clear();
      logger.debug('Salesforce schema cache cleared');
    }, 4 * 60 * 60 * 1000);
  }

  /**
   * Authenticate with Salesforce using OAuth2
   */
  async authenticate(): Promise<void> {
    try {
      if (this.accessToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
        return; // Token still valid
      }

      const response = await axios.post(`${this.config.loginUrl}/services/oauth2/token`, null, {
        params: {
          grant_type: 'password',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          username: this.config.username,
          password: `${this.config.password}${this.config.securityToken}`,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.accessToken = response.data.access_token;
      this.instanceUrl = response.data.instance_url;
      this.tokenExpiresAt = new Date(Date.now() + 1800 * 1000); // 30 minutes

      this.client.defaults.baseURL = this.instanceUrl;
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;

      // Store token securely
      await this.storeToken({
        accessToken: this.accessToken,
        instanceUrl: this.instanceUrl,
        expiresAt: this.tokenExpiresAt
      });

      this.emit('authenticated', {
        instanceUrl: this.instanceUrl,
        organizationId: this.context?.organizationId,
        expiresAt: this.tokenExpiresAt
      });

      logger.info('Salesforce authentication successful', {
        instanceUrl: this.instanceUrl,
        expiresAt: this.tokenExpiresAt,
        organizationId: this.context?.organizationId
      });
    } catch (error: unknown) {
      logger.error('Salesforce authentication failed', { 
        error: error instanceof Error ? (error).message : 'Unknown error',
        loginUrl: this.config.loginUrl
      });
      throw error;
    }
  }

  /**
   * Execute SOQL query
   */
  async query(soqlQuery: string, includeDeleted: boolean = false): Promise<any> {
    await this.authenticate();

    try {
      const endpoint = includeDeleted ? '/services/data/v{version}/queryAll' : '/services/data/v{version}/query';
      const url = endpoint.replace('{version}', this.config.version);

      const response = await this.client.get(url, {
        params: { q: soqlQuery },
      });

      this.emit('query:executed', {
        query: soqlQuery,
        recordCount: response.data.totalSize,
        organizationId: this.context?.organizationId
      });

      return response.data;
    } catch (error: unknown) {
      logger.error('Salesforce query failed', { soqlQuery, error });
      throw error;
    }
  }

  /**
   * Account Management
   */
  async getAccounts(limit: number = 100, offset: number = 0): Promise<SalesforceAccount[]> {
    try {
      const cacheKey = `accounts_${limit}_${offset}`;
      const cached = this.integrationCache.get(cacheKey);
      if (cached) {return cached;}

      const soql = `
        SELECT Id, Name, Type, Industry, AnnualRevenue, NumberOfEmployees, 
               Phone, Website, BillingStreet, BillingCity, BillingState, 
               BillingPostalCode, BillingCountry, Description, OwnerId,
               CreatedDate, LastModifiedDate
        FROM Account 
        ORDER BY LastModifiedDate DESC 
        LIMIT ${limit} OFFSET ${offset}
      `;

      const result = await this.query(soql);
      const accounts = result.records.map((record: any) => this.mapAccountRecord(record));

      this.integrationCache.set(cacheKey, accounts);

      this.emit('accounts:retrieved', {
        count: accounts.length,
        limit,
        offset,
        organizationId: this.context?.organizationId
      });

      return accounts;
    } catch (error: unknown) {
      logger.error('Failed to get Salesforce accounts', { limit, offset, error });
      throw error;
    }
  }

  async createAccount(account: Omit<SalesforceAccount, 'Id' | 'CreatedDate' | 'LastModifiedDate'>): Promise<SalesforceAccount> {
    await this.authenticate();

    try {
      const response = await this.client.post(`/services/data/v${this.config.version}/sobjects/Account/`, {
        Name: account.Name,
        Type: account.Type,
        Industry: account.Industry,
        AnnualRevenue: account.AnnualRevenue,
        NumberOfEmployees: account.NumberOfEmployees,
        Phone: account.Phone,
        Website: account.Website,
        BillingStreet: account.BillingAddress?.street,
        BillingCity: account.BillingAddress?.city,
        BillingState: account.BillingAddress?.state,
        BillingPostalCode: account.BillingAddress?.postalCode,
        BillingCountry: account.BillingAddress?.country,
        Description: account.Description,
        OwnerId: account.OwnerId
      });

      const createdAccount = await this.getAccountById(response.data.id);

      this.emit('account:created', {
        accountId: response.data.id,
        accountName: account.Name,
        organizationId: this.context?.organizationId
      });

      return createdAccount;
    } catch (error: unknown) {
      logger.error('Failed to create Salesforce account', { accountName: account.Name, error });
      throw error;
    }
  }

  async getAccountById(accountId: string): Promise<SalesforceAccount> {
    await this.authenticate();

    try {
      const response = await this.client.get(`/services/data/v${this.config.version}/sobjects/Account/${accountId}`);
      return this.mapAccountRecord(response.data);
    } catch (error: unknown) {
      logger.error('Failed to get Salesforce account by ID', { accountId, error });
      throw error;
    }
  }

  /**
   * Contact Management
   */
  async getContacts(accountId?: string, limit: number = 100, offset: number = 0): Promise<SalesforceContact[]> {
    try {
      const cacheKey = `contacts_${accountId || 'all'}_${limit}_${offset}`;
      const cached = this.integrationCache.get(cacheKey);
      if (cached) {return cached;}

      let soql = `
        SELECT Id, FirstName, LastName, Email, Phone, Title, AccountId, 
               Department, MailingStreet, MailingCity, MailingState, 
               MailingPostalCode, MailingCountry, OwnerId,
               CreatedDate, LastModifiedDate
        FROM Contact
      `;

      if (accountId) {
        soql += ` WHERE AccountId = '${accountId}'`;
      }

      soql += ` ORDER BY LastModifiedDate DESC LIMIT ${limit} OFFSET ${offset}`;

      const result = await this.query(soql);
      const contacts = result.records.map((record: any) => this.mapContactRecord(record));

      this.integrationCache.set(cacheKey, contacts);

      this.emit('contacts:retrieved', {
        count: contacts.length,
        accountId,
        limit,
        offset,
        organizationId: this.context?.organizationId
      });

      return contacts;
    } catch (error: unknown) {
      logger.error('Failed to get Salesforce contacts', { accountId, limit, offset, error });
      throw error;
    }
  }

  async createContact(contact: Omit<SalesforceContact, 'Id' | 'CreatedDate' | 'LastModifiedDate'>): Promise<SalesforceContact> {
    await this.authenticate();

    try {
      const response = await this.client.post(`/services/data/v${this.config.version}/sobjects/Contact/`, {
        FirstName: contact.FirstName,
        LastName: contact.LastName,
        Email: contact.Email,
        Phone: contact.Phone,
        Title: contact.Title,
        AccountId: contact.AccountId,
        Department: contact.Department,
        MailingStreet: contact.MailingAddress?.street,
        MailingCity: contact.MailingAddress?.city,
        MailingState: contact.MailingAddress?.state,
        MailingPostalCode: contact.MailingAddress?.postalCode,
        MailingCountry: contact.MailingAddress?.country,
        OwnerId: contact.OwnerId
      });

      const createdContact = await this.getContactById(response.data.id);

      this.emit('contact:created', {
        contactId: response.data.id,
        contactName: `${contact.FirstName} ${contact.LastName}`,
        accountId: contact.AccountId,
        organizationId: this.context?.organizationId
      });

      return createdContact;
    } catch (error: unknown) {
      logger.error('Failed to create Salesforce contact', { contact, error });
      throw error;
    }
  }

  async getContactById(contactId: string): Promise<SalesforceContact> {
    await this.authenticate();

    try {
      const response = await this.client.get(`/services/data/v${this.config.version}/sobjects/Contact/${contactId}`);
      return this.mapContactRecord(response.data);
    } catch (error: unknown) {
      logger.error('Failed to get Salesforce contact by ID', { contactId, error });
      throw error;
    }
  }

  /**
   * Opportunity Management
   */
  async getOpportunities(accountId?: string, limit: number = 100, offset: number = 0): Promise<SalesforceOpportunity[]> {
    try {
      const cacheKey = `opportunities_${accountId || 'all'}_${limit}_${offset}`;
      const cached = this.integrationCache.get(cacheKey);
      if (cached) {return cached;}

      let soql = `
        SELECT Id, Name, AccountId, Amount, CloseDate, StageName, 
               Probability, Type, LeadSource, Description, OwnerId,
               CreatedDate, LastModifiedDate
        FROM Opportunity
      `;

      if (accountId) {
        soql += ` WHERE AccountId = '${accountId}'`;
      }

      soql += ` ORDER BY LastModifiedDate DESC LIMIT ${limit} OFFSET ${offset}`;

      const result = await this.query(soql);
      const opportunities = result.records.map((record: any) => this.mapOpportunityRecord(record));

      this.integrationCache.set(cacheKey, opportunities);

      this.emit('opportunities:retrieved', {
        count: opportunities.length,
        accountId,
        limit,
        offset,
        organizationId: this.context?.organizationId
      });

      return opportunities;
    } catch (error: unknown) {
      logger.error('Failed to get Salesforce opportunities', { accountId, limit, offset, error });
      throw error;
    }
  }

  async createOpportunity(opportunity: Omit<SalesforceOpportunity, 'Id' | 'CreatedDate' | 'LastModifiedDate'>): Promise<SalesforceOpportunity> {
    await this.authenticate();

    try {
      const response = await this.client.post(`/services/data/v${this.config.version}/sobjects/Opportunity/`, {
        Name: opportunity.Name,
        AccountId: opportunity.AccountId,
        Amount: opportunity.Amount,
        CloseDate: opportunity.CloseDate.toISOString().split('T')[0],
        StageName: opportunity.StageName,
        Probability: opportunity.Probability,
        Type: opportunity.Type,
        LeadSource: opportunity.LeadSource,
        Description: opportunity.Description,
        OwnerId: opportunity.OwnerId
      });

      const createdOpportunity = await this.getOpportunityById(response.data.id);

      this.emit('opportunity:created', {
        opportunityId: response.data.id,
        opportunityName: opportunity.Name,
        amount: opportunity.Amount,
        accountId: opportunity.AccountId,
        organizationId: this.context?.organizationId
      });

      return createdOpportunity;
    } catch (error: unknown) {
      logger.error('Failed to create Salesforce opportunity', { opportunity, error });
      throw error;
    }
  }

  async getOpportunityById(opportunityId: string): Promise<SalesforceOpportunity> {
    await this.authenticate();

    try {
      const response = await this.client.get(`/services/data/v${this.config.version}/sobjects/Opportunity/${opportunityId}`);
      return this.mapOpportunityRecord(response.data);
    } catch (error: unknown) {
      logger.error('Failed to get Salesforce opportunity by ID', { opportunityId, error });
      throw error;
    }
  }

  /**
   * Lead Management
   */
  async getLeads(limit: number = 100, offset: number = 0): Promise<SalesforceLead[]> {
    try {
      const cacheKey = `leads_${limit}_${offset}`;
      const cached = this.integrationCache.get(cacheKey);
      if (cached) {return cached;}

      const soql = `
        SELECT Id, FirstName, LastName, Company, Email, Phone, Status, 
               Source, Industry, Title, Street, City, State, PostalCode, 
               Country, OwnerId, CreatedDate, LastModifiedDate
        FROM Lead 
        ORDER BY LastModifiedDate DESC 
        LIMIT ${limit} OFFSET ${offset}
      `;

      const result = await this.query(soql);
      const leads = result.records.map((record: any) => this.mapLeadRecord(record));

      this.integrationCache.set(cacheKey, leads);

      this.emit('leads:retrieved', {
        count: leads.length,
        limit,
        offset,
        organizationId: this.context?.organizationId
      });

      return leads;
    } catch (error: unknown) {
      logger.error('Failed to get Salesforce leads', { limit, offset, error });
      throw error;
    }
  }

  async createLead(lead: Omit<SalesforceLead, 'Id' | 'CreatedDate' | 'LastModifiedDate'>): Promise<SalesforceLead> {
    await this.authenticate();

    try {
      const response = await this.client.post(`/services/data/v${this.config.version}/sobjects/Lead/`, {
        FirstName: lead.FirstName,
        LastName: lead.LastName,
        Company: lead.Company,
        Email: lead.Email,
        Phone: lead.Phone,
        Status: lead.Status,
        Source: lead.Source,
        Industry: lead.Industry,
        Title: lead.Title,
        Street: lead.Street,
        City: lead.City,
        State: lead.State,
        PostalCode: lead.PostalCode,
        Country: lead.Country,
        OwnerId: lead.OwnerId
      });

      const createdLead = await this.getLeadById(response.data.id);

      this.emit('lead:created', {
        leadId: response.data.id,
        leadName: `${lead.FirstName} ${lead.LastName}`,
        company: lead.Company,
        organizationId: this.context?.organizationId
      });

      return createdLead;
    } catch (error: unknown) {
      logger.error('Failed to create Salesforce lead', { lead, error });
      throw error;
    }
  }

  async getLeadById(leadId: string): Promise<SalesforceLead> {
    await this.authenticate();

    try {
      const response = await this.client.get(`/services/data/v${this.config.version}/sobjects/Lead/${leadId}`);
      return this.mapLeadRecord(response.data);
    } catch (error: unknown) {
      logger.error('Failed to get Salesforce lead by ID', { leadId, error });
      throw error;
    }
  }

  /**
   * Case Management
   */
  async getCases(accountId?: string, limit: number = 100, offset: number = 0): Promise<SalesforceCase[]> {
    try {
      const cacheKey = `cases_${accountId || 'all'}_${limit}_${offset}`;
      const cached = this.integrationCache.get(cacheKey);
      if (cached) {return cached;}

      let soql = `
        SELECT Id, Subject, Description, Status, Priority, Origin, 
               Type, AccountId, ContactId, OwnerId,
               CreatedDate, LastModifiedDate
        FROM Case
      `;

      if (accountId) {
        soql += ` WHERE AccountId = '${accountId}'`;
      }

      soql += ` ORDER BY LastModifiedDate DESC LIMIT ${limit} OFFSET ${offset}`;

      const result = await this.query(soql);
      const cases = result.records.map((record: any) => this.mapCaseRecord(record));

      this.integrationCache.set(cacheKey, cases);

      this.emit('cases:retrieved', {
        count: cases.length,
        accountId,
        limit,
        offset,
        organizationId: this.context?.organizationId
      });

      return cases;
    } catch (error: unknown) {
      logger.error('Failed to get Salesforce cases', { accountId, limit, offset, error });
      throw error;
    }
  }

  async createCase(caseData: Omit<SalesforceCase, 'Id' | 'CreatedDate' | 'LastModifiedDate'>): Promise<SalesforceCase> {
    await this.authenticate();

    try {
      const response = await this.client.post(`/services/data/v${this.config.version}/sobjects/Case/`, {
        Subject: caseData.Subject,
        Description: caseData.Description,
        Status: caseData.Status,
        Priority: caseData.Priority,
        Origin: caseData.Origin,
        Type: caseData.Type,
        AccountId: caseData.AccountId,
        ContactId: caseData.ContactId,
        OwnerId: caseData.OwnerId
      });

      const createdCase = await this.getCaseById(response.data.id);

      this.emit('case:created', {
        caseId: response.data.id,
        subject: caseData.Subject,
        priority: caseData.Priority,
        accountId: caseData.AccountId,
        organizationId: this.context?.organizationId
      });

      return createdCase;
    } catch (error: unknown) {
      logger.error('Failed to create Salesforce case', { caseData, error });
      throw error;
    }
  }

  async getCaseById(caseId: string): Promise<SalesforceCase> {
    await this.authenticate();

    try {
      const response = await this.client.get(`/services/data/v${this.config.version}/sobjects/Case/${caseId}`);
      return this.mapCaseRecord(response.data);
    } catch (error: unknown) {
      logger.error('Failed to get Salesforce case by ID', { caseId, error });
      throw error;
    }
  }

  /**
   * Bulk Operations and Sync
   */
  async syncAllData(): Promise<{
    syncId: string;
    startedAt: Date;
    completedAt?: Date;
    status: 'running' | 'completed' | 'failed';
    results: {
      accounts: number;
      contacts: number;
      opportunities: number;
      leads: number;
      cases: number;
    };
    errors: string[];
  }> {
    const syncId = `salesforce-sync-${Date.now()}`;
    const syncOperation = {
      syncId,
      startedAt: new Date(),
      status: 'running' as const,
      results: {
        accounts: 0,
        contacts: 0,
        opportunities: 0,
        leads: 0,
        cases: 0
      },
      errors: [] as string[]
    };

    try {
      logger.info('Starting Salesforce data sync', { syncId });

      // Sync accounts
      try {
        const accounts = await this.getAccounts(1000);
        syncOperation.results.accounts = accounts.length;
      } catch (error: unknown) {
        syncOperation.errors.push(`Accounts sync failed: ${error instanceof Error ? (error).message : 'Unknown error'}`);
      }

      // Sync contacts
      try {
        const contacts = await this.getContacts(undefined, 1000);
        syncOperation.results.contacts = contacts.length;
      } catch (error: unknown) {
        syncOperation.errors.push(`Contacts sync failed: ${error instanceof Error ? (error).message : 'Unknown error'}`);
      }

      // Sync opportunities
      try {
        const opportunities = await this.getOpportunities(undefined, 1000);
        syncOperation.results.opportunities = opportunities.length;
      } catch (error: unknown) {
        syncOperation.errors.push(`Opportunities sync failed: ${error instanceof Error ? (error).message : 'Unknown error'}`);
      }

      // Sync leads
      try {
        const leads = await this.getLeads(1000);
        syncOperation.results.leads = leads.length;
      } catch (error: unknown) {
        syncOperation.errors.push(`Leads sync failed: ${error instanceof Error ? (error).message : 'Unknown error'}`);
      }

      // Sync cases
      try {
        const cases = await this.getCases(undefined, 1000);
        syncOperation.results.cases = cases.length;
      } catch (error: unknown) {
        syncOperation.errors.push(`Cases sync failed: ${error instanceof Error ? (error).message : 'Unknown error'}`);
      }

      syncOperation.completedAt = new Date();
      syncOperation.status = 'completed';

      this.emit('sync:completed', {
        syncId,
        results: syncOperation.results,
        errors: syncOperation.errors,
        organizationId: this.context?.organizationId
      });

      logger.info('Salesforce data sync completed', {
        syncId,
        results: syncOperation.results,
        errorCount: syncOperation.errors.length
      });

    } catch (error: unknown) {
      syncOperation.status = 'failed';
      syncOperation.completedAt = new Date();
      syncOperation.errors.push(`Sync failed: ${error instanceof Error ? (error).message : 'Unknown error'}`);

      logger.error('Salesforce data sync failed', { syncId, error });
    }

    return syncOperation;
  }

  /**
   * Schema and Metadata Operations
   */
  async getObjectSchema(objectType: string): Promise<any> {
    await this.authenticate();

    try {
      const cacheKey = `schema_${objectType}`;
      const cached = this.schemaCache.get(cacheKey);
      if (cached) {return cached;}

      const response = await this.client.get(`/services/data/v${this.config.version}/sobjects/${objectType}/describe`);
      
      this.schemaCache.set(cacheKey, response.data);
      
      return response.data;
    } catch (error: unknown) {
      logger.error('Failed to get Salesforce object schema', { objectType, error });
      throw error;
    }
  }

  async getAvailableObjects(): Promise<Array<{ name: string; label: string; custom: boolean }>> {
    await this.authenticate();

    try {
      const cacheKey = 'available_objects';
      const cached = this.schemaCache.get(cacheKey);
      if (cached) {return cached;}

      const response = await this.client.get(`/services/data/v${this.config.version}/sobjects`);
      
      const objects = response.data.sobjects.map((obj: any) => ({
        name: obj.name,
        label: obj.label,
        custom: obj.custom
      }));

      this.schemaCache.set(cacheKey, objects);
      
      return objects;
    } catch (error: unknown) {
      logger.error('Failed to get available Salesforce objects', { error });
      throw error;
    }
  }

  /**
   * Integration Health Check
   */
  async checkIntegrationHealth(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    lastChecked: Date;
    connectionStatus: 'connected' | 'disconnected';
    apiLimits?: {
      dailyLimit: number;
      dailyUsed: number;
      remaining: number;
    };
  }> {
    const healthCheck = {
      status: 'error' as const,
      lastChecked: new Date(),
      connectionStatus: 'disconnected' as const
    };

    try {
      await this.authenticate();
      
      // Test connection with a simple query
      await this.query('SELECT Id FROM Organization LIMIT 1');
      
      healthCheck.connectionStatus = 'connected';
      healthCheck.status = 'healthy';

      // Get API limits if available
      try {
        const limitsResponse = await this.client.get(`/services/data/v${this.config.version}/limits`);
        const dailyApiRequests = limitsResponse.data.DailyApiRequests;
        
        if (dailyApiRequests) {
          healthCheck.apiLimits = {
            dailyLimit: dailyApiRequests.Max,
            dailyUsed: dailyApiRequests.Remaining ? dailyApiRequests.Max - dailyApiRequests.Remaining : 0,
            remaining: dailyApiRequests.Remaining || 0
          };

          // Set warning if API usage is high
          if (healthCheck.apiLimits.remaining / healthCheck.apiLimits.dailyLimit < 0.1) {
            healthCheck.status = 'warning';
          }
        }
      } catch (error: unknown) {
        logger.warn('Failed to get Salesforce API limits', { error });
      }

    } catch (error: unknown) {
      logger.error('Salesforce health check failed', { error });
    }

    return healthCheck;
  }

  /**
   * Private helper methods for record mapping
   */
  private mapAccountRecord(record: any): SalesforceAccount {
    return {
      Id: record.Id,
      Name: record.Name,
      Type: record.Type,
      Industry: record.Industry,
      AnnualRevenue: record.AnnualRevenue,
      NumberOfEmployees: record.NumberOfEmployees,
      Phone: record.Phone,
      Website: record.Website,
      BillingAddress: {
        street: record.BillingStreet,
        city: record.BillingCity,
        state: record.BillingState,
        postalCode: record.BillingPostalCode,
        country: record.BillingCountry
      },
      Description: record.Description,
      OwnerId: record.OwnerId,
      CreatedDate: record.CreatedDate ? new Date(record.CreatedDate) : undefined,
      LastModifiedDate: record.LastModifiedDate ? new Date(record.LastModifiedDate) : undefined
    };
  }

  private mapContactRecord(record: any): SalesforceContact {
    return {
      Id: record.Id,
      FirstName: record.FirstName,
      LastName: record.LastName,
      Email: record.Email,
      Phone: record.Phone,
      Title: record.Title,
      AccountId: record.AccountId,
      Department: record.Department,
      MailingAddress: {
        street: record.MailingStreet,
        city: record.MailingCity,
        state: record.MailingState,
        postalCode: record.MailingPostalCode,
        country: record.MailingCountry
      },
      OwnerId: record.OwnerId,
      CreatedDate: record.CreatedDate ? new Date(record.CreatedDate) : undefined,
      LastModifiedDate: record.LastModifiedDate ? new Date(record.LastModifiedDate) : undefined
    };
  }

  private mapOpportunityRecord(record: any): SalesforceOpportunity {
    return {
      Id: record.Id,
      Name: record.Name,
      AccountId: record.AccountId,
      Amount: record.Amount,
      CloseDate: new Date(record.CloseDate),
      StageName: record.StageName,
      Probability: record.Probability,
      Type: record.Type,
      LeadSource: record.LeadSource,
      Description: record.Description,
      OwnerId: record.OwnerId,
      CreatedDate: record.CreatedDate ? new Date(record.CreatedDate) : undefined,
      LastModifiedDate: record.LastModifiedDate ? new Date(record.LastModifiedDate) : undefined
    };
  }

  private mapLeadRecord(record: any): SalesforceLead {
    return {
      Id: record.Id,
      FirstName: record.FirstName,
      LastName: record.LastName,
      Company: record.Company,
      Email: record.Email,
      Phone: record.Phone,
      Status: record.Status,
      Source: record.Source,
      Industry: record.Industry,
      Title: record.Title,
      Street: record.Street,
      City: record.City,
      State: record.State,
      PostalCode: record.PostalCode,
      Country: record.Country,
      OwnerId: record.OwnerId,
      CreatedDate: record.CreatedDate ? new Date(record.CreatedDate) : undefined,
      LastModifiedDate: record.LastModifiedDate ? new Date(record.LastModifiedDate) : undefined
    };
  }

  private mapCaseRecord(record: any): SalesforceCase {
    return {
      Id: record.Id,
      Subject: record.Subject,
      Description: record.Description,
      Status: record.Status,
      Priority: record.Priority,
      Origin: record.Origin,
      Type: record.Type,
      AccountId: record.AccountId,
      ContactId: record.ContactId,
      OwnerId: record.OwnerId,
      CreatedDate: record.CreatedDate ? new Date(record.CreatedDate) : undefined,
      LastModifiedDate: record.LastModifiedDate ? new Date(record.LastModifiedDate) : undefined
    };
  }

  private async storeToken(token: { accessToken: string; instanceUrl: string; expiresAt: Date }): Promise<void> {
    try {
      if (!this.context?.organizationId) {return;}

      await prisma.integrationToken.upsert({
        where: {
          organizationId_service: {
            organizationId: this.context.organizationId,
            service: 'SALESFORCE'
          }
        },
        update: {
          accessToken: token.accessToken,
          instanceUrl: token.instanceUrl,
          expiresAt: token.expiresAt,
          updatedAt: new Date()
        },
        create: {
          organizationId: this.context.organizationId,
          service: 'SALESFORCE',
          accessToken: token.accessToken,
          instanceUrl: token.instanceUrl,
          expiresAt: token.expiresAt
        }
      });
    } catch (error: unknown) {
      logger.error('Failed to store Salesforce token', { error });
    }
  }

  /**
   * Public API methods
   */
  clearCache(): void {
    this.integrationCache.clear();
    this.schemaCache.clear();
    logger.info('Salesforce integration cache cleared');
  }

  getConnectionStatus(): { connected: boolean; instanceUrl?: string; expiresAt?: Date } {
    return {
      connected: !!this.accessToken && !!this.tokenExpiresAt && new Date() < this.tokenExpiresAt,
      instanceUrl: this.instanceUrl || undefined,
      expiresAt: this.tokenExpiresAt || undefined
    };
  }

  async disconnect(): Promise<void> {
    this.accessToken = null;
    this.instanceUrl = null;
    this.tokenExpiresAt = null;
    
    delete this.client.defaults.baseURL;
    delete this.client.defaults.headers.common['Authorization'];

    // Remove from database
    if (this.context?.organizationId) {
      await prisma.integrationToken.deleteMany({
        where: {
          organizationId: this.context.organizationId,
          service: 'SALESFORCE'
        }
      });
    }

    this.emit('disconnected', {
      organizationId: this.context?.organizationId
    });

    logger.info('Salesforce integration disconnected');
  }
}