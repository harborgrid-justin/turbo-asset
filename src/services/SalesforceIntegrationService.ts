import { prisma } from '../config/database';
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
}

export class SalesforceIntegrationService {
  private readonly client: AxiosInstance;
  private accessToken: string | null = null;
  private instanceUrl: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(private readonly config: SalesforceConfig) {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
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

      logger.info('Salesforce authentication successful', {
        instanceUrl: this.instanceUrl,
        expiresAt: this.tokenExpiresAt,
      });
    } catch (error: unknown) {
      logger.error('Salesforce authentication failed', { error });
      throw error;
    }
  }

  /**
   * Execute SOQL query
   */
  async query(soqlQuery: string): Promise<any> {
    await this.authenticate();

    try {
      const response = await this.client.get(
        `/services/data/v${this.config.version}/query`,
        {
          params: { q: soqlQuery },
        }
      );

      return response.data;
    } catch (error: unknown) {
      logger.error('Salesforce query failed', { soqlQuery, error });
      throw error;
    }
  }

  /**
   * Create record in Salesforce
   */
  async createRecord(objectType: string, record: SalesforceRecord): Promise<SalesforceRecord> {
    await this.authenticate();

    try {
      const response = await this.client.post(
        `/services/data/v${this.config.version}/sobjects/${objectType}`,
        record
      );

      logger.info('Salesforce record created', {
        objectType,
        recordId: response.data.id,
      });

      return { ...record, Id: response.data.id };
    } catch (error: unknown) {
      logger.error('Salesforce record creation failed', { objectType, record, error });
      throw error;
    }
  }

  /**
   * Update record in Salesforce
   */
  async updateRecord(
    objectType: string,
    recordId: string,
    record: Partial<SalesforceRecord>
  ): Promise<void> {
    await this.authenticate();

    try {
      await this.client.patch(
        `/services/data/v${this.config.version}/sobjects/${objectType}/${recordId}`,
        record
      );

      logger.info('Salesforce record updated', {
        objectType,
        recordId,
      });
    } catch (error: unknown) {
      logger.error('Salesforce record update failed', {
        objectType,
        recordId,
        record,
        error,
      });
      throw error;
    }
  }

  /**
   * Delete record from Salesforce
   */
  async deleteRecord(objectType: string, recordId: string): Promise<void> {
    await this.authenticate();

    try {
      await this.client.delete(
        `/services/data/v${this.config.version}/sobjects/${objectType}/${recordId}`
      );

      logger.info('Salesforce record deleted', {
        objectType,
        recordId,
      });
    } catch (error: unknown) {
      logger.error('Salesforce record deletion failed', {
        objectType,
        recordId,
        error,
      });
      throw error;
    }
  }

  /**
   * Get record by ID
   */
  async getRecord(objectType: string, recordId: string, fields?: string[]): Promise<SalesforceRecord> {
    await this.authenticate();

    try {
      const url = `/services/data/v${this.config.version}/sobjects/${objectType}/${recordId}`;
      const params = fields ? { fields: fields.join(',') } : {};

      const response = await this.client.get(url, { params });
      return response.data;
    } catch (error: unknown) {
      logger.error('Salesforce record retrieval failed', {
        objectType,
        recordId,
        error,
      });
      throw error;
    }
  }

  /**
   * Sync properties to Salesforce accounts
   */
  async syncPropertyToAccount(propertyData: any): Promise<void> {
    try {
      const accountRecord = this.transformPropertyToAccount(propertyData);

      if (propertyData.salesforceAccountId) {
        await this.updateRecord('Account', propertyData.salesforceAccountId, accountRecord);
      } else {
        const created = await this.createRecord('Account', accountRecord);

        // Update local property with Salesforce ID
        await prisma.property.update({
          where: { id: propertyData.id },
          data: {
            externalIntegrations: {
              ...propertyData.externalIntegrations,
              salesforceAccountId: created.Id,
            },
          },
        });
      }
    } catch (error: unknown) {
      logger.error('Property to Salesforce sync failed', { propertyData, error });
      throw error;
    }
  }

  /**
   * Sync spaces to Salesforce opportunities
   */
  async syncSpaceToOpportunity(spaceData: any): Promise<void> {
    try {
      const opportunityRecord = this.transformSpaceToOpportunity(spaceData);

      if (spaceData.salesforceOpportunityId) {
        await this.updateRecord('Opportunity', spaceData.salesforceOpportunityId, opportunityRecord);
      } else {
        const created = await this.createRecord('Opportunity', opportunityRecord);

        // Update local space with Salesforce ID
        await prisma.space.update({
          where: { id: spaceData.id },
          data: {
            externalIntegrations: {
              ...spaceData.externalIntegrations,
              salesforceOpportunityId: created.Id,
            },
          },
        });
      }
    } catch (error: unknown) {
      logger.error('Space to Salesforce sync failed', { spaceData, error });
      throw error;
    }
  }

  /**
   * Sync users to Salesforce contacts
   */
  async syncUserToContact(userData: any): Promise<void> {
    try {
      const contactRecord = this.transformUserToContact(userData);

      if (userData.salesforceContactId) {
        await this.updateRecord('Contact', userData.salesforceContactId, contactRecord);
      } else {
        const created = await this.createRecord('Contact', contactRecord);

        // Update local user with Salesforce ID
        await prisma.user.update({
          where: { id: userData.id },
          data: {
            externalIntegrations: {
              ...userData.externalIntegrations,
              salesforceContactId: created.Id,
            },
          },
        });
      }
    } catch (error: unknown) {
      logger.error('User to Salesforce sync failed', { userData, error });
      throw error;
    }
  }

  /**
   * Get Salesforce reports data
   */
  async getReportData(reportId: string): Promise<any> {
    await this.authenticate();

    try {
      const response = await this.client.get(
        `/services/data/v${this.config.version}/analytics/reports/${reportId}`
      );

      return response.data;
    } catch (error: unknown) {
      logger.error('Salesforce report data retrieval failed', { reportId, error });
      throw error;
    }
  }

  /**
   * Execute custom Apex REST endpoint
   */
  async executeApexRest(endpoint: string, method: string, data?: any): Promise<any> {
    await this.authenticate();

    try {
      const response = await this.client.request({
        method: method.toLowerCase() as any,
        url: `/services/apexrest/${endpoint}`,
        data,
      });

      return response.data;
    } catch (error: unknown) {
      logger.error('Salesforce Apex REST execution failed', { endpoint, method, error });
      throw error;
    }
  }

  /**
   * Transform property data to Salesforce account format
   */
  private transformPropertyToAccount(property: any): SalesforceRecord {
    return {
      Name: property.name,
      Type: 'Customer',
      Industry: 'Real Estate',
      BillingStreet: property.address?.street,
      BillingCity: property.address?.city,
      BillingState: property.address?.state,
      BillingPostalCode: property.address?.postalCode,
      BillingCountry: property.address?.country,
      Phone: property.contactInfo?.phone,
      Website: property.website,
      Description: property.description,
      Property_Type__c: property.type,
      Total_Square_Footage__c: property.totalSquareFootage,
      Number_of_Buildings__c: property.buildings?.length || 0,
    };
  }

  /**
   * Transform space data to Salesforce opportunity format
   */
  private transformSpaceToOpportunity(space: any): SalesforceRecord {
    return {
      Name: `${space.property?.name} - ${space.name}`,
      StageName: space.isAvailable ? 'Available' : 'Occupied',
      CloseDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
      Type: 'New Business',
      Space_Type__c: space.type,
      Square_Footage__c: space.squareFootage,
      Floor__c: space.floor?.name,
      Building__c: space.building?.name,
      Property__c: space.property?.name,
      Monthly_Rate__c: space.monthlyRate,
      Is_Available__c: space.isAvailable,
    };
  }

  /**
   * Transform user data to Salesforce contact format
   */
  private transformUserToContact(user: any): SalesforceRecord {
    return {
      FirstName: user.firstName,
      LastName: user.lastName,
      Email: user.email,
      Phone: user.phone,
      Title: user.title,
      Department: user.department?.name,
      MailingStreet: user.address?.street,
      MailingCity: user.address?.city,
      MailingState: user.address?.state,
      MailingPostalCode: user.address?.postalCode,
      MailingCountry: user.address?.country,
      Employee_ID__c: user.employeeId,
      Is_Active__c: user.isActive,
    };
  }

  /**
   * Bulk sync multiple records
   */
  async bulkSync(operations: Array<{
    type: 'CREATE' | 'UPDATE' | 'DELETE';
    objectType: string;
    record: SalesforceRecord;
    recordId?: string;
  }>): Promise<void> {
    await this.authenticate();

    try {
      const batches = this.chunkArray(operations, 200); // Salesforce bulk API limit

      for (const batch of batches) {
        const promises = batch.map(async (operation) => {
          switch (operation.type) {
            case 'CREATE':
              return await this.createRecord(operation.objectType, operation.record);
            case 'UPDATE':
              { await this.updateRecord(operation.objectType, operation.recordId!, operation.record); return; }
            case 'DELETE':
              { await this.deleteRecord(operation.objectType, operation.recordId!); return; }
          }
        });

        await Promise.allSettled(promises);
      }

      logger.info('Salesforce bulk sync completed', { operationCount: operations.length });
    } catch (error: unknown) {
      logger.error('Salesforce bulk sync failed', { operations, error });
      throw error;
    }
  }

  /**
   * Utility method to chunk arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}