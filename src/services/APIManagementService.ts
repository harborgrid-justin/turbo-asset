import { prisma } from '../config/database';
import { logger } from '@/config/logger';
import { EventEmitter } from 'events';
import Redis from 'redis';

export interface APIKey {
  id: string;
  name: string;
  key: string;
  organizationId: string;
  userId?: string;
  accessLevel: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE' | 'UNLIMITED';
  permissions: string[];
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface APIEndpoint {
  path: string;
  method: string;
  service: string;
  version: string;
  isPublic: boolean;
  requiresAuth: boolean;
  permissions: string[];
  rateLimitOverride?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };
  cacheSettings?: {
    enabled: boolean;
    ttlSeconds: number;
    varyBy?: string[];
  };
  documentation: {
    summary: string;
    description: string;
    parameters: Array<{
      name: string;
      type: string;
      required: boolean;
      description: string;
    }>;
    responses: Array<{
      statusCode: number;
      description: string;
      example?: any;
    }>;
  };
}

export interface UsageAnalytics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsByEndpoint: Record<string, number>;
  requestsByUser: Record<string, number>;
  requestsByTimeWindow: Array<{
    timestamp: Date;
    requests: number;
  }>;
  errorsByType: Record<string, number>;
  topEndpoints: Array<{
    endpoint: string;
    requests: number;
    avgResponseTime: number;
  }>;
  heaviestUsers: Array<{
    userId: string;
    apiKey: string;
    requests: number;
  }>;
}

export interface RateLimitStatus {
  apiKey: string;
  currentMinute: number;
  currentHour: number;
  currentDay: number;
  limitsMinute: number;
  limitsHour: number;
  limitsDay: number;
  resetTimeMinute: Date;
  resetTimeHour: Date;
  resetTimeDay: Date;
  isBlocked: boolean;
  remainingMinute: number;
  remainingHour: number;
  remainingDay: number;
}

export interface APIGatewayConfig {
  enableRateLimiting: boolean;
  enableCaching: boolean;
  enableAnalytics: boolean;
  enableAuthentication: boolean;
  defaultCacheTTL: number;
  maxRequestSize: number;
  timeout: number;
  corsEnabled: boolean;
  corsOrigins: string[];
  compressionEnabled: boolean;
}

export class APIManagementService extends EventEmitter {
  private redis: any;
  private apiKeysCache: Map<string, APIKey> = new Map();
  private endpointsCache: Map<string, APIEndpoint> = new Map();
  private rateLimitCache: Map<string, RateLimitStatus> = new Map();
  private usageBuffer: any[] = [];

  constructor() {
    super();
    this.setupRedis();
    this.setupEventHandlers();
    this.loadAPIKeys();
    this.loadEndpoints();
    this.startUsageProcessing();
  }

  /**
   * Setup Redis connection for caching and rate limiting
   */
  private async setupRedis(): Promise<void> {
    try {
      this.redis = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      await this.redis.connect();

      logger.info('API Management Redis connection established');
    } catch (error: unknown) {
      logger.error('Failed to setup Redis for API Management', { error });
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('api:request', this.handleAPIRequest.bind(this));
    this.on('rate:limit:exceeded', this.handleRateLimitExceeded.bind(this));
    this.on('api:error', this.handleAPIError.bind(this));
    this.on('quota:exceeded', this.handleQuotaExceeded.bind(this));
  }

  /**
   * Create API key
   */
  async createAPIKey(
    organizationId: string,
    name: string,
    accessLevel: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE' | 'UNLIMITED',
    permissions: string[],
    userId?: string,
    expiresAt?: Date
  ): Promise<APIKey> {
    try {
      const apiKey: APIKey = {
        id: this.generateId(),
        name,
        key: this.generateAPIKey(),
        organizationId,
        userId,
        accessLevel,
        permissions,
        rateLimits: this.getDefaultRateLimits(accessLevel),
        isActive: true,
        expiresAt,
        createdAt: new Date(),
      };

      // Store in database
      await prisma.aPIQuota.create({
        data: {
          name,
          apiKey: apiKey.key,
          accessLevel,
          requestsPerMinute: apiKey.rateLimits.requestsPerMinute,
          requestsPerHour: apiKey.rateLimits.requestsPerHour,
          requestsPerDay: apiKey.rateLimits.requestsPerDay,
          organizationId,
        },
      });

      // Cache the API key
      this.apiKeysCache.set(apiKey.key, apiKey);

      logger.info('API key created', {
        keyId: apiKey.id,
        name,
        accessLevel,
        organizationId,
      });

      return apiKey;
    } catch (error: unknown) {
      logger.error('API key creation failed', { name, error });
      throw error;
    }
  }

  /**
   * Validate API key
   */
  async validateAPIKey(apiKey: string): Promise<APIKey | null> {
    try {
      if (this.apiKeysCache.has(apiKey)) {
        const key = this.apiKeysCache.get(apiKey)!;
        
        // Check if key is still valid
        if (key.isActive && (!key.expiresAt || new Date() < key.expiresAt)) {
          return key;
        }
      }

      // Load from database if not in cache
      const keyData = await prisma.aPIQuota.findUnique({
        where: { apiKey },
      });

      if (keyData && keyData.isActive) {
        const key: APIKey = {
          id: keyData.id,
          name: keyData.name,
          key: keyData.apiKey,
          organizationId: keyData.organizationId,
          accessLevel: keyData.accessLevel as any,
          permissions: [], // Would load from separate table
          rateLimits: {
            requestsPerMinute: keyData.requestsPerMinute,
            requestsPerHour: keyData.requestsPerHour,
            requestsPerDay: keyData.requestsPerDay,
          },
          isActive: keyData.isActive,
          createdAt: keyData.createdAt,
        };

        this.apiKeysCache.set(apiKey, key);
        return key;
      }

      return null;
    } catch (error: unknown) {
      logger.error('API key validation failed', { apiKey: apiKey.substring(0, 8) + '...', error });
      return null;
    }
  }

  /**
   * Check rate limits
   */
  async checkRateLimit(apiKey: string): Promise<RateLimitStatus> {
    try {
      const now = new Date();
      const minuteKey = `rate:${apiKey}:${now.getFullYear()}:${now.getMonth()}:${now.getDate()}:${now.getHours()}:${now.getMinutes()}`;
      const hourKey = `rate:${apiKey}:${now.getFullYear()}:${now.getMonth()}:${now.getDate()}:${now.getHours()}`;
      const dayKey = `rate:${apiKey}:${now.getFullYear()}:${now.getMonth()}:${now.getDate()}`;

      const keyData = this.apiKeysCache.get(apiKey);
      if (!keyData) {
        throw new Error('Invalid API key');
      }

      // Get current counts from Redis
      const [currentMinute, currentHour, currentDay] = await Promise.all([
        this.redis.get(minuteKey).then((val: string) => parseInt(val) || 0),
        this.redis.get(hourKey).then((val: string) => parseInt(val) || 0),
        this.redis.get(dayKey).then((val: string) => parseInt(val) || 0),
      ]);

      const status: RateLimitStatus = {
        apiKey,
        currentMinute,
        currentHour,
        currentDay,
        limitsMinute: keyData.rateLimits.requestsPerMinute,
        limitsHour: keyData.rateLimits.requestsPerHour,
        limitsDay: keyData.rateLimits.requestsPerDay,
        resetTimeMinute: new Date(now.getTime() + (60 - now.getSeconds()) * 1000),
        resetTimeHour: new Date(now.getTime() + (3600 - (now.getMinutes() * 60 + now.getSeconds())) * 1000),
        resetTimeDay: new Date(now.getTime() + (86400 - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds())) * 1000),
        isBlocked: false,
        remainingMinute: Math.max(0, keyData.rateLimits.requestsPerMinute - currentMinute),
        remainingHour: Math.max(0, keyData.rateLimits.requestsPerHour - currentHour),
        remainingDay: Math.max(0, keyData.rateLimits.requestsPerDay - currentDay),
      };

      // Check if any limits are exceeded
      status.isBlocked = currentMinute >= keyData.rateLimits.requestsPerMinute ||
                        currentHour >= keyData.rateLimits.requestsPerHour ||
                        currentDay >= keyData.rateLimits.requestsPerDay;

      this.rateLimitCache.set(apiKey, status);

      return status;
    } catch (error: unknown) {
      logger.error('Rate limit check failed', { apiKey: apiKey.substring(0, 8) + '...', error });
      throw error;
    }
  }

  /**
   * Increment rate limit counters
   */
  async incrementRateLimit(apiKey: string): Promise<void> {
    try {
      const now = new Date();
      const minuteKey = `rate:${apiKey}:${now.getFullYear()}:${now.getMonth()}:${now.getDate()}:${now.getHours()}:${now.getMinutes()}`;
      const hourKey = `rate:${apiKey}:${now.getFullYear()}:${now.getMonth()}:${now.getDate()}:${now.getHours()}`;
      const dayKey = `rate:${apiKey}:${now.getFullYear()}:${now.getMonth()}:${now.getDate()}`;

      const pipeline = this.redis.multi();
      
      // Increment counters
      pipeline.incr(minuteKey);
      pipeline.incr(hourKey);
      pipeline.incr(dayKey);
      
      // Set expiration times
      pipeline.expire(minuteKey, 60);
      pipeline.expire(hourKey, 3600);
      pipeline.expire(dayKey, 86400);

      await pipeline.exec();
    } catch (error: unknown) {
      logger.error('Rate limit increment failed', { apiKey: apiKey.substring(0, 8) + '...', error });
    }
  }

  /**
   * Log API usage
   */
  async logAPIUsage(
    apiKey: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    requestSize: number,
    responseSize: number,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const usageRecord = {
        apiKey,
        endpoint,
        method,
        responseTime,
        statusCode,
        requestSize,
        responseSize,
        userId,
        ipAddress,
        userAgent,
        timestamp: new Date(),
      };

      // Add to buffer for batch processing
      this.usageBuffer.push(usageRecord);

      // Store in database
      const keyData = this.apiKeysCache.get(apiKey);
      if (keyData) {
        await prisma.aPIUsage.create({
          data: {
            apiKey,
            endpoint,
            method,
            responseTime,
            statusCode,
            requestSize,
            responseSize,
            userId,
            ipAddress,
            userAgent,
            organizationId: keyData.organizationId,
          },
        });

        // Update last used timestamp
        keyData.lastUsedAt = new Date();
      }

      this.emit('api:request', usageRecord);
    } catch (error: unknown) {
      logger.error('API usage logging failed', { apiKey: apiKey.substring(0, 8) + '...', error });
    }
  }

  /**
   * Generate usage analytics
   */
  async generateUsageAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    apiKey?: string
  ): Promise<UsageAnalytics> {
    try {
      const whereClause: any = {
        organizationId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (apiKey) {
        whereClause.apiKey = apiKey;
      }

      const usageRecords = await prisma.aPIUsage.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
      });

      const analytics = this.calculateAnalytics(usageRecords);

      logger.info('Usage analytics generated', {
        organizationId,
        period: { startDate, endDate },
        totalRequests: analytics.totalRequests,
      });

      return analytics;
    } catch (error: unknown) {
      logger.error('Usage analytics generation failed', { organizationId, error });
      throw error;
    }
  }

  /**
   * Get API key usage summary
   */
  async getAPIKeyUsage(apiKey: string, days: number = 30): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const keyData = this.apiKeysCache.get(apiKey);
      if (!keyData) {
        throw new Error('API key not found');
      }

      const usageRecords = await prisma.aPIUsage.findMany({
        where: {
          apiKey,
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const usage = {
        apiKey,
        period: { startDate, endDate },
        totalRequests: usageRecords.length,
        successfulRequests: usageRecords.filter(r => r.statusCode < 400).length,
        failedRequests: usageRecords.filter(r => r.statusCode >= 400).length,
        averageResponseTime: this.calculateAverage(usageRecords.map(r => r.responseTime)),
        totalDataTransfer: usageRecords.reduce((sum, r) => sum + r.requestSize + r.responseSize, 0),
        dailyUsage: this.groupByDay(usageRecords),
        topEndpoints: this.getTopEndpoints(usageRecords, 10),
        errorRates: this.calculateErrorRates(usageRecords),
      };

      return usage;
    } catch (error: unknown) {
      logger.error('API key usage retrieval failed', { apiKey: apiKey.substring(0, 8) + '...', error });
      throw error;
    }
  }

  /**
   * Register API endpoint
   */
  async registerEndpoint(
    endpoint: APIEndpoint
  ): Promise<void> {
    try {
      const endpointKey = `${endpoint.method}:${endpoint.path}`;
      this.endpointsCache.set(endpointKey, endpoint);

      // Store endpoint metadata (would typically be in a separate table)
      await this.storeEndpointMetadata(endpoint);

      logger.info('API endpoint registered', {
        method: endpoint.method,
        path: endpoint.path,
        service: endpoint.service,
      });
    } catch (error: unknown) {
      logger.error('API endpoint registration failed', { endpoint: endpoint.path, error });
      throw error;
    }
  }

  /**
   * Check endpoint permissions
   */
  async checkEndpointPermissions(
    apiKey: string,
    method: string,
    path: string
  ): Promise<boolean> {
    try {
      const keyData = this.apiKeysCache.get(apiKey);
      const endpointKey = `${method}:${path}`;
      const endpoint = this.endpointsCache.get(endpointKey);

      if (!keyData || !endpoint) {
        return false;
      }

      // Check if endpoint is public
      if (endpoint.isPublic) {
        return true;
      }

      // Check if API key has required permissions
      return endpoint.permissions.every(permission => 
        keyData.permissions.includes(permission)
      );
    } catch (error: unknown) {
      logger.error('Endpoint permission check failed', {
        apiKey: apiKey.substring(0, 8) + '...',
        method,
        path,
        error,
      });
      return false;
    }
  }

  /**
   * Generate API documentation
   */
  async generateAPIDocumentation(organizationId: string): Promise<any> {
    try {
      const endpoints = Array.from(this.endpointsCache.values());
      
      const documentation = {
        organizationId,
        generatedAt: new Date(),
        version: '1.0.0',
        title: 'Turbo Asset API',
        description: 'Enterprise IWMS Platform API',
        baseURL: process.env.API_BASE_URL || 'https://api.turboasset.com',
        authentication: {
          type: 'API Key',
          header: 'X-API-Key',
          description: 'Include your API key in the X-API-Key header',
        },
        endpoints: endpoints.map(endpoint => ({
          path: endpoint.path,
          method: endpoint.method,
          service: endpoint.service,
          version: endpoint.version,
          summary: endpoint.documentation.summary,
          description: endpoint.documentation.description,
          parameters: endpoint.documentation.parameters,
          responses: endpoint.documentation.responses,
          permissions: endpoint.permissions,
          rateLimits: endpoint.rateLimitOverride || 'Default rate limits apply',
          caching: endpoint.cacheSettings || 'No caching',
        })),
        rateLimits: {
          BASIC: this.getDefaultRateLimits('BASIC'),
          STANDARD: this.getDefaultRateLimits('STANDARD'),
          PREMIUM: this.getDefaultRateLimits('PREMIUM'),
          ENTERPRISE: this.getDefaultRateLimits('ENTERPRISE'),
          UNLIMITED: this.getDefaultRateLimits('UNLIMITED'),
        },
      };

      return documentation;
    } catch (error: unknown) {
      logger.error('API documentation generation failed', { organizationId, error });
      throw error;
    }
  }

  /**
   * Revoke API key
   */
  async revokeAPIKey(apiKey: string): Promise<void> {
    try {
      await prisma.aPIQuota.update({
        where: { apiKey },
        data: { isActive: false },
      });

      this.apiKeysCache.delete(apiKey);
      this.rateLimitCache.delete(apiKey);

      logger.info('API key revoked', { apiKey: apiKey.substring(0, 8) + '...' });
    } catch (error: unknown) {
      logger.error('API key revocation failed', { apiKey: apiKey.substring(0, 8) + '...', error });
      throw error;
    }
  }

  /**
   * Get API health metrics
   */
  async getAPIHealthMetrics(): Promise<any> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const recentUsage = await prisma.aPIUsage.findMany({
        where: {
          timestamp: {
            gte: oneHourAgo,
            lte: now,
          },
        },
      });

      const metrics = {
        timestamp: now,
        totalRequests: recentUsage.length,
        successRate: recentUsage.length > 0 
          ? (recentUsage.filter(r => r.statusCode < 400).length / recentUsage.length) * 100 
          : 100,
        averageResponseTime: this.calculateAverage(recentUsage.map(r => r.responseTime)),
        p95ResponseTime: this.calculatePercentile(recentUsage.map(r => r.responseTime), 95),
        errorRate: recentUsage.length > 0 
          ? (recentUsage.filter(r => r.statusCode >= 500).length / recentUsage.length) * 100 
          : 0,
        activeAPIKeys: this.apiKeysCache.size,
        registeredEndpoints: this.endpointsCache.size,
        rateLimitedRequests: recentUsage.filter(r => r.statusCode === 429).length,
      };

      return metrics;
    } catch (error: unknown) {
      logger.error('API health metrics retrieval failed', { error });
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private generateAPIKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'ta_';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultRateLimits(accessLevel: string): { requestsPerMinute: number; requestsPerHour: number; requestsPerDay: number } {
    const limits = {
      'BASIC': { requestsPerMinute: 60, requestsPerHour: 1000, requestsPerDay: 10000 },
      'STANDARD': { requestsPerMinute: 120, requestsPerHour: 5000, requestsPerDay: 50000 },
      'PREMIUM': { requestsPerMinute: 300, requestsPerHour: 15000, requestsPerDay: 200000 },
      'ENTERPRISE': { requestsPerMinute: 600, requestsPerHour: 50000, requestsPerDay: 1000000 },
      'UNLIMITED': { requestsPerMinute: 10000, requestsPerHour: 1000000, requestsPerDay: 10000000 },
    };

    return limits[accessLevel] || limits['BASIC'];
  }

  private calculateAnalytics(usageRecords: any[]): UsageAnalytics {
    const totalRequests = usageRecords.length;
    const successfulRequests = usageRecords.filter(r => r.statusCode < 400).length;
    const failedRequests = totalRequests - successfulRequests;
    const responseTimes = usageRecords.map(r => r.responseTime);

    const requestsByEndpoint = usageRecords.reduce((acc, record) => {
      acc[record.endpoint] = (acc[record.endpoint] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const requestsByUser = usageRecords.reduce((acc, record) => {
      if (record.userId) {
        acc[record.userId] = (acc[record.userId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const errorsByType = usageRecords.reduce((acc, record) => {
      if (record.statusCode >= 400) {
        const errorType = Math.floor(record.statusCode / 100) * 100;
        acc[`${errorType}xx`] = (acc[`${errorType}xx`] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topEndpoints = Object.entries(requestsByEndpoint)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([endpoint, requests]) => ({
        endpoint,
        requests: requests as number,
        avgResponseTime: this.calculateAverage(
          usageRecords.filter(r => r.endpoint === endpoint).map(r => r.responseTime)
        ),
      }));

    const heaviestUsers = Object.entries(requestsByUser)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([userId, requests]) => {
        const userRecord = usageRecords.find(r => r.userId === userId);
        return {
          userId,
          apiKey: userRecord?.apiKey || 'unknown',
          requests: requests as number,
        };
      });

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: this.calculateAverage(responseTimes),
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(responseTimes, 99),
      requestsByEndpoint,
      requestsByUser,
      requestsByTimeWindow: this.groupByTimeWindow(usageRecords, 60), // 1-hour windows
      errorsByType,
      topEndpoints,
      heaviestUsers,
    };
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) {return 0;}
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  private calculatePercentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) {return 0;}
    const sorted = numbers.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  private groupByDay(records: any[]): Record<string, number> {
    return records.reduce((acc, record) => {
      const day = new Date(record.timestamp).toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});
  }

  private groupByTimeWindow(records: any[], windowMinutes: number): Array<{ timestamp: Date; requests: number }> {
    const windows: Record<string, number> = {};
    
    records.forEach(record => {
      const timestamp = new Date(record.timestamp);
      const windowStart = new Date(
        timestamp.getFullYear(),
        timestamp.getMonth(),
        timestamp.getDate(),
        timestamp.getHours(),
        Math.floor(timestamp.getMinutes() / windowMinutes) * windowMinutes
      );
      const key = windowStart.toISOString();
      windows[key] = (windows[key] || 0) + 1;
    });

    return Object.entries(windows).map(([timestamp, requests]) => ({
      timestamp: new Date(timestamp),
      requests,
    }));
  }

  private getTopEndpoints(records: any[], limit: number): Array<{ endpoint: string; requests: number; avgResponseTime: number }> {
    const endpointStats = records.reduce((acc, record) => {
      if (!acc[record.endpoint]) {
        acc[record.endpoint] = { requests: 0, totalResponseTime: 0 };
      }
      acc[record.endpoint].requests++;
      acc[record.endpoint].totalResponseTime += record.responseTime;
      return acc;
    }, {} as Record<string, { requests: number; totalResponseTime: number }>);

    return Object.entries(endpointStats)
      .sort(([, a], [, b]) => (b as any).requests - (a as any).requests)
      .slice(0, limit)
      .map(([endpoint, stats]) => ({
        endpoint,
        requests: (stats as any).requests,
        avgResponseTime: (stats as any).totalResponseTime / (stats as any).requests,
      }));
  }

  private calculateErrorRates(records: any[]): Record<string, number> {
    const total = records.length;
    if (total === 0) {return {};}

    const errorCounts = records.reduce((acc, record) => {
      if (record.statusCode >= 400) {
        const range = `${Math.floor(record.statusCode / 100)}xx`;
        acc[range] = (acc[range] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(errorCounts).reduce((acc, [range, count]) => {
      acc[range] = ((count as number) / total) * 100;
      return acc;
    }, {} as Record<string, number>);
  }

  private startUsageProcessing(): void {
    // Process usage buffer every 10 seconds
    setInterval(() => {
      if (this.usageBuffer.length > 0) {
        const batch = this.usageBuffer.splice(0, 100); // Process in batches
        this.processBatchedUsage(batch);
      }
    }, 10000);
  }

  private async processBatchedUsage(batch: any[]): Promise<void> {
    try {
      // Process batched usage data (e.g., analytics, alerting)
      logger.debug('Processed usage batch', { count: batch.length });
    } catch (error: unknown) {
      logger.error('Batch usage processing failed', { error });
    }
  }

  private async loadAPIKeys(): Promise<void> {
    try {
      const keys = await prisma.aPIQuota.findMany({
        where: { isActive: true },
      });

      keys.forEach(key => {
        const apiKey: APIKey = {
          id: key.id,
          name: key.name,
          key: key.apiKey,
          organizationId: key.organizationId,
          accessLevel: key.accessLevel as any,
          permissions: [], // Would load from separate table
          rateLimits: {
            requestsPerMinute: key.requestsPerMinute,
            requestsPerHour: key.requestsPerHour,
            requestsPerDay: key.requestsPerDay,
          },
          isActive: key.isActive,
          createdAt: key.createdAt,
        };

        this.apiKeysCache.set(key.apiKey, apiKey);
      });

      logger.info(`Loaded ${keys.length} API keys`);
    } catch (error: unknown) {
      logger.error('Failed to load API keys', { error });
    }
  }

  private async loadEndpoints(): Promise<void> {
    // Load registered endpoints (would be from database)
    // For now, register some default endpoints
    const defaultEndpoints: APIEndpoint[] = [
      {
        path: '/api/properties',
        method: 'GET',
        service: 'property-service',
        version: 'v1',
        isPublic: false,
        requiresAuth: true,
        permissions: ['properties:read'],
        documentation: {
          summary: 'List properties',
          description: 'Get a list of properties for the organization',
          parameters: [
            { name: 'page', type: 'integer', required: false, description: 'Page number' },
            { name: 'limit', type: 'integer', required: false, description: 'Items per page' },
          ],
          responses: [
            { statusCode: 200, description: 'Success', example: { properties: [] } },
            { statusCode: 401, description: 'Unauthorized' },
            { statusCode: 403, description: 'Forbidden' },
          ],
        },
      },
    ];

    for (const endpoint of defaultEndpoints) {
      const key = `${endpoint.method}:${endpoint.path}`;
      this.endpointsCache.set(key, endpoint);
    }

    logger.info(`Loaded ${defaultEndpoints.length} API endpoints`);
  }

  private async storeEndpointMetadata(endpoint: APIEndpoint): Promise<void> {
    // Store endpoint metadata in database
    logger.debug('Endpoint metadata stored', { path: endpoint.path, method: endpoint.method });
  }

  // Event handlers
  private async handleAPIRequest(data: any): Promise<void> {
    // Process API request event
    logger.debug('API request processed', { endpoint: data.endpoint, statusCode: data.statusCode });
  }

  private async handleRateLimitExceeded(data: any): Promise<void> {
    logger.warn('Rate limit exceeded', data);
  }

  private async handleAPIError(data: any): Promise<void> {
    logger.error('API error occurred', data);
  }

  private async handleQuotaExceeded(data: any): Promise<void> {
    logger.warn('API quota exceeded', data);
  }

  /**
   * Shutdown method
   */
  async shutdown(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.disconnect();
      }

      logger.info('API Management service shutdown completed');
    } catch (error: unknown) {
      logger.error('Error during shutdown', { error });
    }
  }
}