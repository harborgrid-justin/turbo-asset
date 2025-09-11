import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { config } from '../config';
import axios, { AxiosInstance } from 'axios';
import xml2js from 'xml2js';

export interface IntegrationConfig {
  apiUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
  authType: 'api_key' | 'basic' | 'oauth2';
  timeout?: number;
}

export interface SyncOperation {
  entityType: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  entityId: string;
  data: Record<string, any>;
  externalId?: string;
}

export class IntegrationService {
  private sapClient: AxiosInstance;
  private oracleClient: AxiosInstance;
  private workdayClient: AxiosInstance;
  private serviceNowClient: AxiosInstance;

  constructor() {
    this.sapClient = this.createAxiosInstance(config.external.sap);
    this.oracleClient = this.createAxiosInstance(config.external.oracle);
    this.workdayClient = this.createAxiosInstance(config.external.workday);
    this.serviceNowClient = this.createAxiosInstance(config.external.serviceNow);
  }

  /**
   * Create axios instance for integration
   */
  private createAxiosInstance(integrationConfig: { apiUrl: string; apiKey: string }): AxiosInstance {
    return axios.create({
      baseURL: integrationConfig.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${integrationConfig.apiKey}`,
      },
    });
  }

  /**
   * Sync data with SAP
   */
  async syncWithSAP(operation: SyncOperation): Promise<void> {
    try {
      const integrationRecord = await this.createIntegrationRecord('SAP', operation);

      await prisma.integrationRecord.update({
        where: { id: integrationRecord },
        data: { syncStatus: 'IN_PROGRESS' },
      });

      let response;
      switch (operation.operation) {
        case 'CREATE':
          response = await this.sapClient.post('/assets', this.transformDataForSAP(operation.data));
          break;
        case 'UPDATE':
          response = await this.sapClient.put(`/assets/${operation.externalId}`, this.transformDataForSAP(operation.data));
          break;
        case 'DELETE':
          response = await this.sapClient.delete(`/assets/${operation.externalId}`);
          break;
      }

      await this.updateIntegrationRecord(integrationRecord, 'SUCCESS', response.data);

      logger.info('SAP sync completed', { 
        operation: operation.operation, 
        entityId: operation.entityId 
      });
    } catch (error: unknown) {
      await this.handleIntegrationError('SAP', operation, error);
    }
  }

  /**
   * Sync data with Oracle
   */
  async syncWithOracle(operation: SyncOperation): Promise<void> {
    try {
      const integrationRecord = await this.createIntegrationRecord('ORACLE', operation);

      await prisma.integrationRecord.update({
        where: { id: integrationRecord },
        data: { syncStatus: 'IN_PROGRESS' },
      });

      let response;
      switch (operation.operation) {
        case 'CREATE':
          response = await this.oracleClient.post('/facilities', this.transformDataForOracle(operation.data));
          break;
        case 'UPDATE':
          response = await this.oracleClient.put(`/facilities/${operation.externalId}`, this.transformDataForOracle(operation.data));
          break;
        case 'DELETE':
          response = await this.oracleClient.delete(`/facilities/${operation.externalId}`);
          break;
      }

      await this.updateIntegrationRecord(integrationRecord, 'SUCCESS', response.data);

      logger.info('Oracle sync completed', { 
        operation: operation.operation, 
        entityId: operation.entityId 
      });
    } catch (error: unknown) {
      await this.handleIntegrationError('ORACLE', operation, error);
    }
  }

  /**
   * Sync data with Workday
   */
  async syncWithWorkday(operation: SyncOperation): Promise<void> {
    try {
      const integrationRecord = await this.createIntegrationRecord('WORKDAY', operation);

      await prisma.integrationRecord.update({
        where: { id: integrationRecord },
        data: { syncStatus: 'IN_PROGRESS' },
      });

      // Workday typically uses SOAP/XML
      const xmlData = this.transformDataToXML(operation.data);
      
      const response = await this.workdayClient.post('/HumanResources', xmlData, {
        headers: { 'Content-Type': 'text/xml' },
      });

      await this.updateIntegrationRecord(integrationRecord, 'SUCCESS', response.data);

      logger.info('Workday sync completed', { 
        operation: operation.operation, 
        entityId: operation.entityId 
      });
    } catch (error: unknown) {
      await this.handleIntegrationError('WORKDAY', operation, error);
    }
  }

  /**
   * Sync data with ServiceNow
   */
  async syncWithServiceNow(operation: SyncOperation): Promise<void> {
    try {
      const integrationRecord = await this.createIntegrationRecord('SERVICENOW', operation);

      await prisma.integrationRecord.update({
        where: { id: integrationRecord },
        data: { syncStatus: 'IN_PROGRESS' },
      });

      let response;
      const endpoint = this.getServiceNowEndpoint(operation.entityType);
      
      switch (operation.operation) {
        case 'CREATE':
          response = await this.serviceNowClient.post(endpoint, this.transformDataForServiceNow(operation.data));
          break;
        case 'UPDATE':
          response = await this.serviceNowClient.put(`${endpoint}/${operation.externalId}`, this.transformDataForServiceNow(operation.data));
          break;
        case 'DELETE':
          response = await this.serviceNowClient.delete(`${endpoint}/${operation.externalId}`);
          break;
      }

      await this.updateIntegrationRecord(integrationRecord, 'SUCCESS', response.data);

      logger.info('ServiceNow sync completed', { 
        operation: operation.operation, 
        entityId: operation.entityId 
      });
    } catch (error: unknown) {
      await this.handleIntegrationError('SERVICENOW', operation, error);
    }
  }

  /**
   * Generic API sync
   */
  async syncWithGenericAPI(
    config: IntegrationConfig,
    operation: SyncOperation
  ): Promise<void> {
    try {
      const client = this.createCustomAxiosInstance(config);
      const integrationRecord = await this.createIntegrationRecord('GENERIC_API', operation);

      await prisma.integrationRecord.update({
        where: { id: integrationRecord },
        data: { syncStatus: 'IN_PROGRESS' },
      });

      let response;
      switch (operation.operation) {
        case 'CREATE':
          response = await client.post('/api/entities', operation.data);
          break;
        case 'UPDATE':
          response = await client.put(`/api/entities/${operation.externalId}`, operation.data);
          break;
        case 'DELETE':
          response = await client.delete(`/api/entities/${operation.externalId}`);
          break;
      }

      await this.updateIntegrationRecord(integrationRecord, 'SUCCESS', response.data);

      logger.info('Generic API sync completed', { 
        operation: operation.operation, 
        entityId: operation.entityId 
      });
    } catch (error: unknown) {
      await this.handleIntegrationError('GENERIC_API', operation, error);
    }
  }

  /**
   * Create integration record
   */
  private async createIntegrationRecord(
    system: 'SAP' | 'ORACLE' | 'WORKDAY' | 'SERVICENOW' | 'GENERIC_API',
    operation: SyncOperation
  ): Promise<string> {
    const record = await prisma.integrationRecord.create({
      data: {
        system,
        entityType: operation.entityType,
        entityId: operation.entityId,
        externalId: operation.externalId || '',
        syncStatus: 'PENDING',
        syncData: operation.data as any,
      },
    });

    return record.id;
  }

  /**
   * Update integration record
   */
  private async updateIntegrationRecord(
    recordId: string,
    status: 'SUCCESS' | 'FAILED' | 'PARTIAL',
    responseData?: any
  ): Promise<void> {
    await prisma.integrationRecord.update({
      where: { id: recordId },
      data: {
        syncStatus: status,
        lastSyncAt: new Date(),
        syncData: responseData as any,
      },
    });
  }

  /**
   * Handle integration error
   */
  private async handleIntegrationError(
    system: string,
    operation: SyncOperation,
    error: any
  ): Promise<void> {
    logger.error(`${system} sync failed`, {
      operation: operation.operation,
      entityId: operation.entityId,
      error: error.message,
    });

    // Update integration record with error
    const record = await prisma.integrationRecord.findFirst({
      where: {
        system: system as any,
        entityId: operation.entityId,
        syncStatus: 'IN_PROGRESS',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (record) {
      await prisma.integrationRecord.update({
        where: { id: record.id },
        data: {
          syncStatus: 'FAILED',
          errorMessage: error.message,
          retryCount: record.retryCount + 1,
        },
      });
    }
  }

  /**
   * Transform data for SAP format
   */
  private transformDataForSAP(data: Record<string, any>): Record<string, any> {
    return {
      Asset: {
        AssetNumber: data.assetTag,
        AssetDescription: data.name,
        AssetType: data.type,
        AcquisitionCost: data.purchasePrice,
        AcquisitionDate: data.purchaseDate,
        Location: data.location,
      },
    };
  }

  /**
   * Transform data for Oracle format
   */
  private transformDataForOracle(data: Record<string, any>): Record<string, any> {
    return {
      facility_id: data.id,
      facility_name: data.name,
      facility_type: data.type,
      address: data.address,
      total_area: data.totalArea,
      status: data.isActive ? 'ACTIVE' : 'INACTIVE',
    };
  }

  /**
   * Transform data to XML for Workday
   */
  private transformDataToXML(data: Record<string, any>): string {
    const builder = new xml2js.Builder();
    return builder.buildObject({
      'wd:Employee': {
        '@xmlns:wd': 'urn:com.workday/bsvc',
        'wd:Employee_Data': {
          'wd:Personal_Data': {
            'wd:Name_Data': {
              'wd:First_Name': data.firstName,
              'wd:Last_Name': data.lastName,
            },
          },
        },
      },
    });
  }

  /**
   * Transform data for ServiceNow format
   */
  private transformDataForServiceNow(data: Record<string, any>): Record<string, any> {
    return {
      name: data.name,
      asset_tag: data.assetTag,
      model: data.model,
      serial_number: data.serialNumber,
      location: data.location,
      state: data.status,
    };
  }

  /**
   * Get ServiceNow endpoint based on entity type
   */
  private getServiceNowEndpoint(entityType: string): string {
    switch (entityType) {
      case 'asset':
        return '/api/now/table/alm_asset';
      case 'user':
        return '/api/now/table/sys_user';
      case 'location':
        return '/api/now/table/cmn_location';
      default:
        return '/api/now/table/sys_dictionary';
    }
  }

  /**
   * Create custom axios instance
   */
  private createCustomAxiosInstance(config: IntegrationConfig): AxiosInstance {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.authType === 'api_key' && config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    } else if (config.authType === 'basic' && config.username && config.password) {
      const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    return axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout || 30000,
      headers,
    });
  }
}