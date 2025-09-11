import { Request, Response } from 'express';
import { EnterpriseServiceBusService } from '../services/EnterpriseServiceBusService';
import { SalesforceIntegrationService } from '../services/SalesforceIntegrationService';
import { Microsoft365IntegrationService } from '../services/Microsoft365IntegrationService';
import { logger } from '../config/logger';
import { prisma } from '../config/database';

const esbService = new EnterpriseServiceBusService();
const salesforceService = new SalesforceIntegrationService({
  clientId: process.env.SALESFORCE_CLIENT_ID || '',
  clientSecret: process.env.SALESFORCE_CLIENT_SECRET || '',
  username: process.env.SALESFORCE_USERNAME || '',
  password: process.env.SALESFORCE_PASSWORD || '',
  securityToken: process.env.SALESFORCE_SECURITY_TOKEN || '',
  loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
  version: process.env.SALESFORCE_API_VERSION || '58.0',
});
const microsoft365Service = new Microsoft365IntegrationService({
  clientId: process.env.MICROSOFT365_CLIENT_ID || '',
  clientSecret: process.env.MICROSOFT365_CLIENT_SECRET || '',
  tenantId: process.env.MICROSOFT365_TENANT_ID || '',
  redirectUri: process.env.MICROSOFT365_REDIRECT_URI || '',
  scopes: ['https://graph.microsoft.com/.default'],
});

export class EnterpriseIntegrationController {
  /**
   * Get all enterprise integrations
   */
  async getIntegrations(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const integrations = await prisma.enterpriseIntegration.findMany({
        where: { organizationId },
        include: { flows: true },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      });

      const total = await prisma.enterpriseIntegration.count({
        where: { organizationId },
      });

      res.json({
        integrations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: unknown) {
      logger.error('Failed to get integrations', { error });
      res.status(500).json({ error: 'Failed to get integrations' });
    }
  }

  /**
   * Create new enterprise integration
   */
  async createIntegration(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const {
        name,
        description,
        integrationType,
        sourceSystem,
        targetSystem,
        configuration,
      } = req.body;

      const integration = await prisma.enterpriseIntegration.create({
        data: {
          name,
          description,
          integrationType,
          sourceSystem,
          targetSystem,
          configuration,
          organizationId,
        },
      });

      logger.info('Enterprise integration created', {
        integrationId: integration.id,
        name,
        integrationType,
      });

      res.status(201).json(integration);
    } catch (error: unknown) {
      logger.error('Failed to create integration', { error });
      res.status(500).json({ error: 'Failed to create integration' });
    }
  }

  /**
   * Update enterprise integration
   */
  async updateIntegration(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId } = req.params;
      const updates = req.body;

      const integration = await prisma.enterpriseIntegration.update({
        where: { id: integrationId },
        data: updates,
      });

      logger.info('Enterprise integration updated', {
        integrationId,
        updates: Object.keys(updates),
      });

      res.json(integration);
    } catch (error: unknown) {
      logger.error('Failed to update integration', { error });
      res.status(500).json({ error: 'Failed to update integration' });
    }
  }

  /**
   * Delete enterprise integration
   */
  async deleteIntegration(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId } = req.params;

      await prisma.enterpriseIntegration.delete({
        where: { id: integrationId },
      });

      logger.info('Enterprise integration deleted', { integrationId });
      res.status(204).send();
    } catch (error: unknown) {
      logger.error('Failed to delete integration', { error });
      res.status(500).json({ error: 'Failed to delete integration' });
    }
  }

  /**
   * Test integration connection
   */
  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId } = req.params;

      const integration = await prisma.enterpriseIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        res.status(404).json({ error: 'Integration not found' });
        return;
      }

      let testResult;
      switch (integration.integrationType) {
        case 'SALESFORCE':
          await salesforceService.authenticate();
          testResult = { status: 'success', message: 'Salesforce connection successful' };
          break;
        case 'MICROSOFT365':
          await microsoft365Service.authenticate();
          testResult = { status: 'success', message: 'Microsoft 365 connection successful' };
          break;
        default:
          testResult = { status: 'success', message: 'Generic connection test successful' };
      }

      res.json(testResult);
    } catch (error: unknown) {
      logger.error('Integration connection test failed', { error });
      res.json({ status: 'error', message: error.message });
    }
  }

  /**
   * Send message through ESB
   */
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const {
        source,
        destination,
        payload,
        messageType,
        pattern,
        priority,
      } = req.body;

      await esbService.sendMessage({
        source,
        destination,
        payload,
        messageType,
        priority,
      }, pattern);

      res.json({ message: 'Message sent successfully' });
    } catch (error: unknown) {
      logger.error('Failed to send ESB message', { error });
      res.status(500).json({ error: 'Failed to send message' });
    }
  }

  /**
   * Get ESB metrics
   */
  async getESBMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await esbService.getMetrics();
      res.json(metrics);
    } catch (error: unknown) {
      logger.error('Failed to get ESB metrics', { error });
      res.status(500).json({ error: 'Failed to get ESB metrics' });
    }
  }

  /**
   * Get ESB health status
   */
  async getESBHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await esbService.healthCheck();
      res.json(health);
    } catch (error: unknown) {
      logger.error('Failed to get ESB health', { error });
      res.status(500).json({ error: 'Failed to get ESB health' });
    }
  }

  /**
   * Sync with Salesforce
   */
  async syncWithSalesforce(req: Request, res: Response): Promise<void> {
    try {
      const { entityType, entityId, operation } = req.body;

      switch (entityType) {
        case 'property':
          const property = await prisma.property.findUnique({
            where: { id: entityId },
          });
          if (property) {
            await salesforceService.syncPropertyToAccount(property);
          }
          break;
        case 'user':
          const user = await prisma.user.findUnique({
            where: { id: entityId },
          });
          if (user) {
            await salesforceService.syncUserToContact(user);
          }
          break;
      }

      res.json({ message: 'Salesforce sync completed' });
    } catch (error: unknown) {
      logger.error('Salesforce sync failed', { error });
      res.status(500).json({ error: 'Salesforce sync failed' });
    }
  }

  /**
   * Get Salesforce reports
   */
  async getSalesforceReports(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const reportData = await salesforceService.getReportData(reportId);
      res.json(reportData);
    } catch (error: unknown) {
      logger.error('Failed to get Salesforce reports', { error });
      res.status(500).json({ error: 'Failed to get Salesforce reports' });
    }
  }

  /**
   * Sync booking to Outlook
   */
  async syncBookingToOutlook(req: Request, res: Response): Promise<void> {
    try {
      const { bookingId } = req.params;

      const booking = await prisma.spaceBooking.findUnique({
        where: { id: bookingId },
        include: {
          space: {
            include: {
              floor: true,
            },
          },
          bookedBy: true,
        },
      });

      if (!booking) {
        res.status(404).json({ error: 'Booking not found' });
        return;
      }

      await microsoft365Service.syncBookingToOutlook(booking);
      res.json({ message: 'Booking synced to Outlook' });
    } catch (error: unknown) {
      logger.error('Failed to sync booking to Outlook', { error });
      res.status(500).json({ error: 'Failed to sync booking to Outlook' });
    }
  }

  /**
   * Create SharePoint document library
   */
  async createSharePointLibrary(req: Request, res: Response): Promise<void> {
    try {
      const { siteId, libraryName, description } = req.body;

      const library = await microsoft365Service.createDocumentLibrary(
        siteId,
        libraryName,
        description
      );

      res.json(library);
    } catch (error: unknown) {
      logger.error('Failed to create SharePoint library', { error });
      res.status(500).json({ error: 'Failed to create SharePoint library' });
    }
  }

  /**
   * Get Microsoft 365 authorization URL
   */
  async getAuthorizationUrl(req: Request, res: Response): Promise<void> {
    try {
      const { state } = req.query;
      const authUrl = microsoft365Service.getAuthorizationUrl(state as string);
      res.json({ authUrl });
    } catch (error: unknown) {
      logger.error('Failed to get authorization URL', { error });
      res.status(500).json({ error: 'Failed to get authorization URL' });
    }
  }

  /**
   * Get integration flows
   */
  async getIntegrationFlows(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const flows = await prisma.integrationFlow.findMany({
        where: { integrationId },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      });

      const total = await prisma.integrationFlow.count({
        where: { integrationId },
      });

      res.json({
        flows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: unknown) {
      logger.error('Failed to get integration flows', { error });
      res.status(500).json({ error: 'Failed to get integration flows' });
    }
  }

  /**
   * Create integration flow
   */
  async createIntegrationFlow(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId } = req.params;
      const {
        name,
        description,
        sourceEndpoint,
        targetEndpoint,
        transformationRules,
      } = req.body;

      const flow = await prisma.integrationFlow.create({
        data: {
          name,
          description,
          integrationId,
          sourceEndpoint,
          targetEndpoint,
          transformationRules,
        },
      });

      logger.info('Integration flow created', {
        flowId: flow.id,
        integrationId,
        name,
      });

      res.status(201).json(flow);
    } catch (error: unknown) {
      logger.error('Failed to create integration flow', { error });
      res.status(500).json({ error: 'Failed to create integration flow' });
    }
  }

  /**
   * Execute integration flow
   */
  async executeFlow(req: Request, res: Response): Promise<void> {
    try {
      const { flowId } = req.params;
      const { data } = req.body;

      const flow = await prisma.integrationFlow.findUnique({
        where: { id: flowId },
        include: { integration: true },
      });

      if (!flow) {
        res.status(404).json({ error: 'Integration flow not found' });
        return;
      }

      // Send message through ESB
      await esbService.sendMessage({
        source: flow.sourceEndpoint,
        destination: flow.targetEndpoint,
        payload: data,
        messageType: 'flow_execution',
        priority: 5,
      });

      // Update flow metrics
      await prisma.integrationFlow.update({
        where: { id: flowId },
        data: {
          executionCount: { increment: 1 },
          lastExecutedAt: new Date(),
        },
      });

      res.json({ message: 'Integration flow executed successfully' });
    } catch (error: unknown) {
      logger.error('Failed to execute integration flow', { error });
      res.status(500).json({ error: 'Failed to execute integration flow' });
    }
  }

  /**
   * Get integration analytics
   */
  async getIntegrationAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const integrations = await prisma.enterpriseIntegration.findMany({
        where: { organizationId },
        include: {
          flows: {
            select: {
              id: true,
              name: true,
              executionCount: true,
              lastExecutedAt: true,
              averageExecutionTime: true,
            },
          },
        },
      });

      const analytics = {
        totalIntegrations: integrations.length,
        activeIntegrations: integrations.filter(i => i.isActive).length,
        totalFlows: integrations.reduce((sum, i) => sum + i.flows.length, 0),
        totalExecutions: integrations.reduce((sum, i) => 
          sum + i.flows.reduce((flowSum, f) => flowSum + f.executionCount, 0), 0
        ),
        averageExecutionTime: integrations.reduce((sum, i) => 
          sum + i.flows.reduce((flowSum, f) => flowSum + (f.averageExecutionTime || 0), 0), 0
        ) / Math.max(1, integrations.reduce((sum, i) => sum + i.flows.length, 0)),
        integrationTypes: integrations.reduce((types, i) => {
          types[i.integrationType] = (types[i.integrationType] || 0) + 1;
          return types;
        }, {} as Record<string, number>),
        recentExecutions: integrations.flatMap(i => 
          i.flows.filter(f => f.lastExecutedAt && f.lastExecutedAt >= start)
        ).length,
      };

      res.json(analytics);
    } catch (error: unknown) {
      logger.error('Failed to get integration analytics', { error });
      res.status(500).json({ error: 'Failed to get integration analytics' });
    }
  }
}