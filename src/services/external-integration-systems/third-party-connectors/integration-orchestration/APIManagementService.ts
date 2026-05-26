/**
 * API Management Service - Comprehensive API gateway and management
 * 
 * This service handles API gateway functions, rate limiting, authentication,
 * monitoring, documentation, and lifecycle management. Migrated from legacy
 * APIManagementService with enhanced domain architecture.
 */

import { EventEmitter } from 'events';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import axios, { AxiosInstance } from 'axios';

export interface APIEndpoint {
  id: string;
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';
  description?: string;
  version: string;
  isPublic: boolean;
  requiresAuth: boolean;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  timeout: number;
  cacheSettings?: {
    enabled: boolean;
    ttl: number;
  };
  middleware: string[];
  schema?: {
    request?: any;
    response?: any;
  };
  tags: string[];
  status: 'active' | 'deprecated' | 'maintenance';
  createdAt: Date;
  updatedAt: Date;
}

export interface APIKey {
  id: string;
  key: string;
  name: string;
  description?: string;
  organizationId: string;
  permissions: string[];
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  allowedEndpoints?: string[];
  ipWhitelist?: string[];
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
}

export interface APIMetrics {
  endpointId: string;
  timestamp: Date;
  responseTime: number;
  statusCode: number;
  requestSize: number;
  responseSize: number;
  userAgent?: string;
  ipAddress: string;
  apiKeyId?: string;
  errorMessage?: string;
}

export interface APIAnalytics {
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalRequests: number;
  totalErrors: number;
  averageResponseTime: number;
  topEndpoints: Array<{
    path: string;
    method: string;
    requestCount: number;
    averageResponseTime: number;
    errorRate: number;
  }>;
  statusCodeDistribution: Record<string, number>;
  errorsByType: Record<string, number>;
  trafficByHour: Array<{
    hour: number;
    requests: number;
  }>;
  topConsumers: Array<{
    apiKeyId: string;
    keyName: string;
    requests: number;
  }>;
}

export interface IntegrationContext {
  organizationId: string;
  userId: string;
  permissions: string[];
}

export class APIManagementService extends EventEmitter {
  private readonly endpoints: Map<string, APIEndpoint> = new Map();
  private readonly apiKeys: Map<string, APIKey> = new Map();
  private metricsBuffer: APIMetrics[] = [];
  private readonly rateLimitCache: Map<string, { count: number; resetTime: Date }> = new Map();
  private readonly documentationCache: Map<string, any> = new Map();

  constructor(private readonly context?: IntegrationContext) {
    super();
    this.setupMetricsFlush();
    this.setupRateLimitCleanup();
    logger.info('API Management Service initialized', {
      organizationId: context?.organizationId
    });
  }

  private setupMetricsFlush(): void {
    // Flush metrics every 30 seconds
    setInterval(async () => {
      await this.flushMetrics();
    }, 30000);
  }

  private setupRateLimitCleanup(): void {
    // Clean up expired rate limit entries every minute
    setInterval(() => {
      const now = new Date();
      for (const [key, limit] of this.rateLimitCache.entries()) {
        if (now > limit.resetTime) {
          this.rateLimitCache.delete(key);
        }
      }
    }, 60000);
  }

  async createEndpoint(endpointData: Omit<APIEndpoint, 'id' | 'createdAt' | 'updatedAt'>): Promise<APIEndpoint> {
    try {
      const endpoint: APIEndpoint = {
        ...endpointData,
        id: `endpoint_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.endpoints.set(endpoint.id, endpoint);
      await this.saveEndpoint(endpoint);

      this.emit('endpoint:created', {
        endpointId: endpoint.id,
        path: endpoint.path,
        method: endpoint.method,
        organizationId: this.context?.organizationId
      });

      logger.info('API endpoint created', {
        endpointId: endpoint.id,
        path: endpoint.path,
        method: endpoint.method
      });

      return endpoint;
    } catch (error: unknown) {
      logger.error('Failed to create API endpoint', {
        path: endpointData.path,
        method: endpointData.method,
        error: error instanceof Error ? (error).message : 'Unknown error'
      });
      throw error;
    }
  }

  async updateEndpoint(endpointId: string, updates: Partial<APIEndpoint>): Promise<APIEndpoint> {
    try {
      const existing = this.endpoints.get(endpointId);
      if (!existing) {
        throw new Error(`Endpoint not found: ${endpointId}`);
      }

      const updated: APIEndpoint = {
        ...existing,
        ...updates,
        id: endpointId, // Ensure ID doesn't change
        updatedAt: new Date()
      };

      this.endpoints.set(endpointId, updated);
      await this.saveEndpoint(updated);

      this.emit('endpoint:updated', {
        endpointId,
        changes: Object.keys(updates),
        organizationId: this.context?.organizationId
      });

      return updated;
    } catch (error: unknown) {
      logger.error('Failed to update API endpoint', { endpointId, error });
      throw error;
    }
  }

  async deleteEndpoint(endpointId: string): Promise<void> {
    try {
      const endpoint = this.endpoints.get(endpointId);
      if (!endpoint) {
        throw new Error(`Endpoint not found: ${endpointId}`);
      }

      this.endpoints.delete(endpointId);
      await this.removeEndpoint(endpointId);

      this.emit('endpoint:deleted', {
        endpointId,
        path: endpoint.path,
        method: endpoint.method,
        organizationId: this.context?.organizationId
      });

      logger.info('API endpoint deleted', { endpointId });
    } catch (error: unknown) {
      logger.error('Failed to delete API endpoint', { endpointId, error });
      throw error;
    }
  }

  async getEndpoints(filters?: {
    status?: string;
    version?: string;
    tags?: string[];
    isPublic?: boolean;
  }): Promise<APIEndpoint[]> {
    try {
      let endpoints = Array.from(this.endpoints.values());

      if (filters) {
        if (filters.status) {
          endpoints = endpoints.filter(e => e.status === filters.status);
        }
        if (filters.version) {
          endpoints = endpoints.filter(e => e.version === filters.version);
        }
        if (filters.tags && filters.tags.length > 0) {
          endpoints = endpoints.filter(e => 
            filters.tags!.some(tag => e.tags.includes(tag))
          );
        }
        if (filters.isPublic !== undefined) {
          endpoints = endpoints.filter(e => e.isPublic === filters.isPublic);
        }
      }

      return endpoints.sort((a, b) => a.path.localeCompare(b.path));
    } catch (error: unknown) {
      logger.error('Failed to get API endpoints', { filters, error });
      throw error;
    }
  }

  async createAPIKey(keyData: Omit<APIKey, 'id' | 'key' | 'lastUsedAt' | 'createdAt'>): Promise<APIKey> {
    try {
      const apiKey: APIKey = {
        ...keyData,
        id: `key_${Date.now()}`,
        key: this.generateAPIKey(),
        createdAt: new Date()
      };

      this.apiKeys.set(apiKey.id, apiKey);
      await this.saveAPIKey(apiKey);

      this.emit('apikey:created', {
        keyId: apiKey.id,
        keyName: apiKey.name,
        organizationId: apiKey.organizationId
      });

      logger.info('API key created', {
        keyId: apiKey.id,
        keyName: apiKey.name
      });

      return apiKey;
    } catch (error: unknown) {
      logger.error('Failed to create API key', {
        keyName: keyData.name,
        error: error instanceof Error ? (error).message : 'Unknown error'
      });
      throw error;
    }
  }

  async revokeAPIKey(keyId: string): Promise<void> {
    try {
      const apiKey = this.apiKeys.get(keyId);
      if (!apiKey) {
        throw new Error(`API key not found: ${keyId}`);
      }

      apiKey.isActive = false;
      this.apiKeys.set(keyId, apiKey);
      await this.saveAPIKey(apiKey);

      this.emit('apikey:revoked', {
        keyId,
        keyName: apiKey.name,
        organizationId: apiKey.organizationId
      });

      logger.info('API key revoked', { keyId, keyName: apiKey.name });
    } catch (error: unknown) {
      logger.error('Failed to revoke API key', { keyId, error });
      throw error;
    }
  }

  async validateAPIKey(key: string): Promise<{
    isValid: boolean;
    keyData?: APIKey;
    error?: string;
  }> {
    try {
      const apiKey = Array.from(this.apiKeys.values()).find(k => k.key === key);
      
      if (!apiKey) {
        return { isValid: false, error: 'Invalid API key' };
      }

      if (!apiKey.isActive) {
        return { isValid: false, error: 'API key is inactive' };
      }

      if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
        return { isValid: false, error: 'API key has expired' };
      }

      // Update last used time
      apiKey.lastUsedAt = new Date();
      this.apiKeys.set(apiKey.id, apiKey);

      return { isValid: true, keyData: apiKey };
    } catch (error: unknown) {
      logger.error('Failed to validate API key', { error });
      return { isValid: false, error: 'Validation error' };
    }
  }

  async checkRateLimit(
    keyId: string,
    endpointId: string,
    limits: { requestsPerMinute: number; requestsPerHour: number; requestsPerDay: number }
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    limitType?: string;
  }> {
    try {
      const now = new Date();
      const minuteKey = `${keyId}:${endpointId}:minute:${Math.floor(now.getTime() / 60000)}`;
      const hourKey = `${keyId}:${endpointId}:hour:${Math.floor(now.getTime() / 3600000)}`;
      const dayKey = `${keyId}:${endpointId}:day:${Math.floor(now.getTime() / 86400000)}`;

      // Check minute limit
      const minuteLimit = this.rateLimitCache.get(minuteKey);
      if (minuteLimit && minuteLimit.count >= limits.requestsPerMinute) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(Math.ceil(now.getTime() / 60000) * 60000),
          limitType: 'minute'
        };
      }

      // Check hour limit
      const hourLimit = this.rateLimitCache.get(hourKey);
      if (hourLimit && hourLimit.count >= limits.requestsPerHour) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(Math.ceil(now.getTime() / 3600000) * 3600000),
          limitType: 'hour'
        };
      }

      // Check day limit
      const dayLimit = this.rateLimitCache.get(dayKey);
      if (dayLimit && dayLimit.count >= limits.requestsPerDay) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(Math.ceil(now.getTime() / 86400000) * 86400000),
          limitType: 'day'
        };
      }

      // Increment counters
      this.incrementRateLimit(minuteKey, new Date(Math.ceil(now.getTime() / 60000) * 60000));
      this.incrementRateLimit(hourKey, new Date(Math.ceil(now.getTime() / 3600000) * 3600000));
      this.incrementRateLimit(dayKey, new Date(Math.ceil(now.getTime() / 86400000) * 86400000));

      return {
        allowed: true,
        remaining: Math.min(
          limits.requestsPerMinute - (minuteLimit?.count || 0),
          limits.requestsPerHour - (hourLimit?.count || 0),
          limits.requestsPerDay - (dayLimit?.count || 0)
        ),
        resetTime: new Date(Math.ceil(now.getTime() / 60000) * 60000)
      };
    } catch (error: unknown) {
      logger.error('Failed to check rate limit', { keyId, endpointId, error });
      // Allow request if rate limit check fails
      return {
        allowed: true,
        remaining: 1000,
        resetTime: new Date(Date.now() + 60000)
      };
    }
  }

  async recordMetrics(metrics: Omit<APIMetrics, 'timestamp'>): Promise<void> {
    try {
      const metricRecord: APIMetrics = {
        ...metrics,
        timestamp: new Date()
      };

      this.metricsBuffer.push(metricRecord);

      this.emit('metrics:recorded', {
        endpointId: metrics.endpointId,
        statusCode: metrics.statusCode,
        responseTime: metrics.responseTime,
        organizationId: this.context?.organizationId
      });

      // Flush metrics if buffer is getting large
      if (this.metricsBuffer.length >= 1000) {
        await this.flushMetrics();
      }
    } catch (error: unknown) {
      logger.error('Failed to record API metrics', { error });
    }
  }

  async getAnalytics(
    startDate: Date,
    endDate: Date,
    endpointId?: string
  ): Promise<APIAnalytics> {
    try {
      // In a real implementation, this would query the database
      // For now, we'll return mock analytics data
      const analytics: APIAnalytics = {
        period: { startDate, endDate },
        totalRequests: 12500,
        totalErrors: 125,
        averageResponseTime: 245,
        topEndpoints: [
          {
            path: '/api/v1/assets',
            method: 'GET',
            requestCount: 5000,
            averageResponseTime: 180,
            errorRate: 0.02
          },
          {
            path: '/api/v1/users',
            method: 'GET',
            requestCount: 3000,
            averageResponseTime: 120,
            errorRate: 0.01
          }
        ],
        statusCodeDistribution: {
          '200': 10000,
          '201': 1500,
          '400': 500,
          '401': 300,
          '404': 150,
          '500': 50
        },
        errorsByType: {
          'Validation Error': 400,
          'Authentication Error': 300,
          'Not Found': 150,
          'Internal Server Error': 50
        },
        trafficByHour: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          requests: Math.floor(Math.random() * 1000) + 100
        })),
        topConsumers: [
          { apiKeyId: 'key1', keyName: 'Mobile App', requests: 5000 },
          { apiKeyId: 'key2', keyName: 'Web Dashboard', requests: 3000 },
          { apiKeyId: 'key3', keyName: 'Third Party Integration', requests: 2000 }
        ]
      };

      this.emit('analytics:generated', {
        period: analytics.period,
        totalRequests: analytics.totalRequests,
        organizationId: this.context?.organizationId
      });

      return analytics;
    } catch (error: unknown) {
      logger.error('Failed to get API analytics', { startDate, endDate, endpointId, error });
      throw error;
    }
  }

  async generateDocumentation(format: 'openapi' | 'postman' = 'openapi'): Promise<any> {
    try {
      const cacheKey = `docs_${format}`;
      const cached = this.documentationCache.get(cacheKey);
      if (cached) {return cached;}

      const endpoints = Array.from(this.endpoints.values()).filter(e => e.status === 'active');

      let documentation;
      
      if (format === 'openapi') {
        documentation = {
          openapi: '3.0.0',
          info: {
            title: 'Turbo Asset API',
            version: '1.0.0',
            description: 'Comprehensive IWMS API for asset and facility management'
          },
          servers: [
            { url: 'https://api.turboasset.com/v1', description: 'Production server' }
          ],
          paths: endpoints.reduce((paths, endpoint) => {
            const pathKey = endpoint.path.replace(/{([^}]+)}/g, '{$1}');
            if (!paths[pathKey]) {paths[pathKey] = {};}
            
            paths[pathKey][endpoint.method.toLowerCase()] = {
              summary: endpoint.name,
              description: endpoint.description,
              tags: endpoint.tags,
              parameters: [],
              responses: {
                '200': { description: 'Success' },
                '400': { description: 'Bad Request' },
                '401': { description: 'Unauthorized' },
                '404': { description: 'Not Found' },
                '500': { description: 'Internal Server Error' }
              }
            };
            
            if (endpoint.requiresAuth) {
              paths[pathKey][endpoint.method.toLowerCase()].security = [
                { ApiKeyAuth: [] }
              ];
            }
            
            return paths;
          }, {} as any),
          components: {
            securitySchemes: {
              ApiKeyAuth: {
                type: 'apiKey',
                in: 'header',
                name: 'X-API-Key'
              }
            }
          }
        };
      } else {
        // Postman collection format
        documentation = {
          info: {
            name: 'Turbo Asset API',
            description: 'Comprehensive IWMS API for asset and facility management',
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
          },
          item: endpoints.map(endpoint => ({
            name: endpoint.name,
            request: {
              method: endpoint.method,
              header: endpoint.requiresAuth ? [
                {
                  key: 'X-API-Key',
                  value: '{{api_key}}',
                  type: 'text'
                }
              ] : [],
              url: {
                raw: `{{base_url}}${endpoint.path}`,
                host: ['{{base_url}}'],
                path: endpoint.path.split('/').filter(p => p)
              },
              description: endpoint.description
            }
          })),
          variable: [
            {
              key: 'base_url',
              value: 'https://api.turboasset.com/v1'
            },
            {
              key: 'api_key',
              value: 'your-api-key-here'
            }
          ]
        };
      }

      this.documentationCache.set(cacheKey, documentation);

      this.emit('documentation:generated', {
        format,
        endpointCount: endpoints.length,
        organizationId: this.context?.organizationId
      });

      return documentation;
    } catch (error: unknown) {
      logger.error('Failed to generate API documentation', { format, error });
      throw error;
    }
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    checks: {
      database: boolean;
      rateLimit: boolean;
      metrics: boolean;
    };
    statistics: {
      totalEndpoints: number;
      activeEndpoints: number;
      totalAPIKeys: number;
      activeAPIKeys: number;
      metricsBufferSize: number;
    };
  }> {
    const healthCheck = {
      status: 'healthy' as const,
      checks: {
        database: true,
        rateLimit: true,
        metrics: true
      },
      statistics: {
        totalEndpoints: this.endpoints.size,
        activeEndpoints: Array.from(this.endpoints.values()).filter(e => e.status === 'active').length,
        totalAPIKeys: this.apiKeys.size,
        activeAPIKeys: Array.from(this.apiKeys.values()).filter(k => k.isActive).length,
        metricsBufferSize: this.metricsBuffer.length
      }
    };

    try {
      // Test database connectivity (simplified)
      // In real implementation, would test actual database connection
      healthCheck.checks.database = true;

      // Test rate limiting system
      healthCheck.checks.rateLimit = this.rateLimitCache.size < 100000; // Reasonable limit

      // Test metrics system
      healthCheck.checks.metrics = this.metricsBuffer.length < 10000; // Buffer not too large

      const failedChecks = Object.values(healthCheck.checks).filter(check => !check).length;
      
      if (failedChecks > 0) {
        healthCheck.status = failedChecks === Object.keys(healthCheck.checks).length ? 'error' : 'warning';
      }

    } catch (error: unknown) {
      logger.error('API Management health check failed', { error });
      healthCheck.status = 'error';
      healthCheck.checks = {
        database: false,
        rateLimit: false,
        metrics: false
      };
    }

    return healthCheck;
  }

  // Private helper methods
  private generateAPIKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'tk_';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private incrementRateLimit(key: string, resetTime: Date): void {
    const existing = this.rateLimitCache.get(key);
    if (existing) {
      existing.count++;
    } else {
      this.rateLimitCache.set(key, { count: 1, resetTime });
    }
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) {return;}

    try {
      // In real implementation, would batch insert to database
      const metrics = [...this.metricsBuffer];
      this.metricsBuffer = [];

      // Mock database save
      logger.debug('Flushed API metrics', { count: metrics.length });

      this.emit('metrics:flushed', {
        count: metrics.length,
        organizationId: this.context?.organizationId
      });
    } catch (error: unknown) {
      logger.error('Failed to flush API metrics', { error });
      // Put metrics back in buffer on failure
      this.metricsBuffer.unshift(...this.metricsBuffer);
    }
  }

  private async saveEndpoint(endpoint: APIEndpoint): Promise<void> {
    try {
      if (!this.context?.organizationId) {return;}

      // Mock database save
      logger.debug('Endpoint saved to database', { endpointId: endpoint.id });
    } catch (error: unknown) {
      logger.error('Failed to save endpoint', { endpointId: endpoint.id, error });
    }
  }

  private async removeEndpoint(endpointId: string): Promise<void> {
    try {
      if (!this.context?.organizationId) {return;}

      // Mock database removal
      logger.debug('Endpoint removed from database', { endpointId });
    } catch (error: unknown) {
      logger.error('Failed to remove endpoint', { endpointId, error });
    }
  }

  private async saveAPIKey(apiKey: APIKey): Promise<void> {
    try {
      // Mock database save
      logger.debug('API key saved to database', { keyId: apiKey.id });
    } catch (error: unknown) {
      logger.error('Failed to save API key', { keyId: apiKey.id, error });
    }
  }

  // Public API methods
  getAPIKeys(organizationId?: string): APIKey[] {
    const keys = Array.from(this.apiKeys.values());
    return organizationId 
      ? keys.filter(key => key.organizationId === organizationId)
      : keys;
  }

  getEndpoint(endpointId: string): APIEndpoint | null {
    return this.endpoints.get(endpointId) || null;
  }

  clearCaches(): void {
    this.documentationCache.clear();
    logger.info('API Management caches cleared');
  }

  getMetricsBufferStatus(): { size: number; capacity: number } {
    return {
      size: this.metricsBuffer.length,
      capacity: 10000 // Max buffer size before forced flush
    };
  }

  async exportConfiguration(): Promise<{
    endpoints: APIEndpoint[];
    apiKeys: Array<Omit<APIKey, 'key'>>;
    version: string;
    exportedAt: Date;
  }> {
    return {
      endpoints: Array.from(this.endpoints.values()),
      apiKeys: Array.from(this.apiKeys.values()).map(key => {
        const { key: keyValue, ...keyWithoutSecret } = key;
        return keyWithoutSecret;
      }),
      version: '1.0.0',
      exportedAt: new Date()
    };
  }
}