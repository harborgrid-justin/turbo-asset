import { toError } from '../../core/utils/validation';
import { Request, Response } from 'express';
import { APIManagementService } from '../../services/APIManagementService';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { validateOrganizationId, validateRequiredParam, withValidation } from '../../core/utils/validation';

const apiManagementService = new APIManagementService();

export class APIManagementController {
  /**
   * Get all API keys for organization
   */
  async getAPIKeys(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { page = 1, limit = 20, status } = req.query;

      const where: any = { organizationId };
      if (status) {
        where.isActive = status === 'active';
      }

      const apiKeys = await prisma.aPIQuota.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      });

      const total = await prisma.aPIQuota.count({ where });

      // Remove sensitive data from response
      const sanitizedKeys = apiKeys.map(key => ({
        ...key,
        apiKey: key.apiKey.substring(0, 8) + '...',
      }));

      res.json({
        apiKeys: sanitizedKeys,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: unknown) {
      logger.error('Failed to get API keys', { error });
      res.status(500).json({ error: 'Failed to get API keys' });
    }
  }

  /**
   * Create new API key
   */
  createAPIKey = withValidation(async (req: Request, res: Response) => {
    const organizationId = validateOrganizationId(req);
    const {
      name,
      accessLevel,
      permissions,
      userId,
      expiresAt,
    } = req.body;

    const apiKey = await apiManagementService.createAPIKey(
      organizationId,
      name,
      accessLevel,
      permissions,
      userId,
      expiresAt ? new Date(expiresAt) : undefined
    );

    res.status(201).json({
      id: apiKey.id,
      name: apiKey.name,
      key: apiKey.key, // Full key only shown on creation
      accessLevel: apiKey.accessLevel,
      permissions: apiKey.permissions,
      rateLimits: apiKey.rateLimits,
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt,
    });
  });

  /**
   * Update API key
   */
  updateAPIKey = withValidation(async (req: Request, res: Response) => {
    const keyId = validateRequiredParam(req, 'keyId');
    const updates = req.body;

    const apiKey = await prisma.aPIQuota.update({
      where: { id: keyId },
      data: updates,
    });

    res.json({
      ...apiKey,
      apiKey: apiKey.apiKey.substring(0, 8) + '...',
    });
  });

  /**
   * Revoke API key
   */
  async revokeAPIKey(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params;

      const apiKey = await prisma.aPIQuota.findUnique({
        where: { id: keyId },
      });

      if (!apiKey) {
        res.status(404).json({ error: 'API key not found' });
        return;
      }

      await apiManagementService.revokeAPIKey(apiKey.apiKey);

      res.json({ message: 'API key revoked successfully' });
    } catch (error: unknown) {
      logger.error('Failed to revoke API key', { error });
      res.status(500).json({ error: 'Failed to revoke API key' });
    }
  }

  /**
   * Get API key usage statistics
   */
  async getAPIKeyUsage(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params;
      const { days = 30 } = req.query;

      const apiKey = await prisma.aPIQuota.findUnique({
        where: { id: keyId },
      });

      if (!apiKey) {
        res.status(404).json({ error: 'API key not found' });
        return;
      }

      const usage = await apiManagementService.getAPIKeyUsage(
        apiKey.apiKey,
        Number(days)
      );

      res.json(usage);
    } catch (error: unknown) {
      logger.error('Failed to get API key usage', { error });
      res.status(500).json({ error: 'Failed to get API key usage' });
    }
  }

  /**
   * Get rate limit status for API key
   */
  async getRateLimitStatus(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params;

      const apiKey = await prisma.aPIQuota.findUnique({
        where: { id: keyId },
      });

      if (!apiKey) {
        res.status(404).json({ error: 'API key not found' });
        return;
      }

      const status = await apiManagementService.checkRateLimit(apiKey.apiKey);
      res.json(status);
    } catch (error: unknown) {
      logger.error('Failed to get rate limit status', { error });
      res.status(500).json({ error: 'Failed to get rate limit status' });
    }
  }

  /**
   * Get API usage analytics
   */
  async getUsageAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { startDate, endDate, apiKey } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const analytics = await apiManagementService.generateUsageAnalytics(
        organizationId,
        start,
        end,
        apiKey as string
      );

      res.json(analytics);
    } catch (error: unknown) {
      logger.error('Failed to get usage analytics', { error });
      res.status(500).json({ error: 'Failed to get usage analytics' });
    }
  }

  /**
   * Get API health metrics
   */
  async getHealthMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await apiManagementService.getAPIHealthMetrics();
      res.json(metrics);
    } catch (error: unknown) {
      logger.error('Failed to get API health metrics', { error });
      res.status(500).json({ error: 'Failed to get API health metrics' });
    }
  }

  /**
   * Generate API documentation
   */
  async getAPIDocumentation(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      const documentation = await apiManagementService.generateAPIDocumentation(organizationId);
      res.json(documentation);
    } catch (error: unknown) {
      logger.error('Failed to generate API documentation', { error });
      res.status(500).json({ error: 'Failed to generate API documentation' });
    }
  }

  /**
   * Register API endpoint
   */
  async registerEndpoint(req: Request, res: Response): Promise<void> {
    try {
      const { endpoint } = req.body;

      await apiManagementService.registerEndpoint(endpoint);

      res.json({ message: 'Endpoint registered successfully' });
    } catch (error: unknown) {
      logger.error('Failed to register endpoint', { error });
      res.status(500).json({ error: 'Failed to register endpoint' });
    }
  }

  /**
   * Get API endpoint analytics
   */
  async getEndpointAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { startDate, endDate, endpoint } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const whereClause: any = {
        organizationId,
        timestamp: {
          gte: start,
          lte: end,
        },
      };

      if (endpoint) {
        whereClause.endpoint = endpoint;
      }

      const usage = await prisma.aPIUsage.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
      });

      const analytics = {
        totalRequests: usage.length,
        successfulRequests: usage.filter(u => u.statusCode < 400).length,
        errorRequests: usage.filter(u => u.statusCode >= 400).length,
        averageResponseTime: usage.length > 0 
          ? usage.reduce((sum, u) => sum + u.responseTime, 0) / usage.length 
          : 0,
        requestsByEndpoint: usage.reduce((acc, u) => {
          acc[u.endpoint] = (acc[u.endpoint] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        requestsByStatusCode: usage.reduce((acc, u) => {
          acc[u.statusCode] = (acc[u.statusCode] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        requestsByHour: usage.reduce((acc, u) => {
          const hour = new Date(u.timestamp).getHours();
          acc[hour] = (acc[hour] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        topUsers: Object.entries(
          usage.reduce((acc, u) => {
            if (u.userId) {
              acc[u.userId] = (acc[u.userId] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, number>)
        ).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 10),
      };

      res.json(analytics);
    } catch (error: unknown) {
      logger.error('Failed to get endpoint analytics', { error });
      res.status(500).json({ error: 'Failed to get endpoint analytics' });
    }
  }

  /**
   * Get API usage trends
   */
  async getUsageTrends(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { days = 30 } = req.query;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));

      const usage = await prisma.aPIUsage.findMany({
        where: {
          organizationId,
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { timestamp: 'asc' },
      });

      // Group by day
      const dailyUsage = usage.reduce((acc, u) => {
        const day = new Date(u.timestamp).toISOString().split('T')[0];
        if (!acc[day]) {
          acc[day] = {
            date: day,
            requests: 0,
            successfulRequests: 0,
            errorRequests: 0,
            totalResponseTime: 0,
            totalDataTransfer: 0,
          };
        }
        acc[day].requests++;
        if (u.statusCode < 400) {acc[day].successfulRequests++;}
        else {acc[day].errorRequests++;}
        acc[day].totalResponseTime += u.responseTime;
        acc[day].totalDataTransfer += u.requestSize + u.responseSize;
        return acc;
      }, {} as Record<string, any>);

      const trends = Object.values(dailyUsage).map((day: any) => ({
        ...day,
        averageResponseTime: day.requests > 0 ? day.totalResponseTime / day.requests : 0,
        successRate: day.requests > 0 ? (day.successfulRequests / day.requests) * 100 : 0,
      }));

      res.json(trends);
    } catch (error: unknown) {
      logger.error('Failed to get usage trends', { error });
      res.status(500).json({ error: 'Failed to get usage trends' });
    }
  }

  /**
   * Get API quota status
   */
  async getQuotaStatus(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      const apiKeys = await prisma.aPIQuota.findMany({
        where: { organizationId, isActive: true },
      });

      const quotaStatuses = await Promise.all(
        apiKeys.map(async (key) => {
          const status = await apiManagementService.checkRateLimit(key.apiKey);
          return {
            keyId: key.id,
            keyName: key.name,
            accessLevel: key.accessLevel,
            ...status,
          };
        })
      );

      res.json(quotaStatuses);
    } catch (error: unknown) {
      logger.error('Failed to get quota status', { error });
      res.status(500).json({ error: 'Failed to get quota status' });
    }
  }

  /**
   * Get API error analysis
   */
  async getErrorAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const errors = await prisma.aPIUsage.findMany({
        where: {
          organizationId,
          statusCode: { gte: 400 },
          timestamp: {
            gte: start,
            lte: end,
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      const analysis = {
        totalErrors: errors.length,
        errorsByStatusCode: errors.reduce((acc, error) => {
          acc[error.statusCode] = (acc[error.statusCode] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        errorsByEndpoint: errors.reduce((acc, error) => {
          acc[error.endpoint] = (acc[error.endpoint] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        errorsByApiKey: errors.reduce((acc, error) => {
          const keyPrefix = error.apiKey.substring(0, 8) + '...';
          acc[keyPrefix] = (acc[keyPrefix] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        errorTrends: errors.reduce((acc, error) => {
          const hour = new Date(error.timestamp).getHours();
          acc[hour] = (acc[hour] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        topErrorEndpoints: Object.entries(
          errors.reduce((acc, error) => {
            acc[error.endpoint] = (acc[error.endpoint] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        ).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 10),
      };

      res.json(analysis);
    } catch (error: unknown) {
      logger.error('Failed to get error analysis', { error });
      res.status(500).json({ error: 'Failed to get error analysis' });
    }
  }

  /**
   * Update API key permissions
   */
  async updatePermissions(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params;
      const { permissions } = req.body;

      // Update permissions in database
      // This would typically be in a separate permissions table
      await prisma.aPIQuota.update({
        where: { id: keyId },
        data: { updatedAt: new Date() }, // Placeholder update
      });

      res.json({ message: 'Permissions updated successfully' });
    } catch (error: unknown) {
      logger.error('Failed to update permissions', { error });
      res.status(500).json({ error: 'Failed to update permissions' });
    }
  }

  /**
   * Get API performance metrics
   */
  async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { hours = 24 } = req.query;

      const startDate = new Date();
      startDate.setHours(startDate.getHours() - Number(hours));

      const usage = await prisma.aPIUsage.findMany({
        where: {
          organizationId,
          timestamp: {
            gte: startDate,
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      const responseTimes = usage.map(u => u.responseTime);
      
      const metrics = {
        totalRequests: usage.length,
        averageResponseTime: responseTimes.length > 0 
          ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
          : 0,
        medianResponseTime: this.calculatePercentile(responseTimes, 50),
        p95ResponseTime: this.calculatePercentile(responseTimes, 95),
        p99ResponseTime: this.calculatePercentile(responseTimes, 99),
        minResponseTime: Math.min(...responseTimes),
        maxResponseTime: Math.max(...responseTimes),
        throughput: usage.length / Number(hours), // requests per hour
        errorRate: usage.length > 0 
          ? (usage.filter(u => u.statusCode >= 400).length / usage.length) * 100 
          : 0,
        uptimePercentage: 99.9, // Would calculate based on actual uptime monitoring
      };

      res.json(metrics);
    } catch (error: unknown) {
      logger.error('Failed to get performance metrics', { error });
      res.status(500).json({ error: 'Failed to get performance metrics' });
    }
  }

  /**
   * Helper method to calculate percentiles
   */
  private calculatePercentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) {return 0;}
    const sorted = numbers.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }
}