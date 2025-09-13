/**
 * Domain Orchestrators Validation Test
 * 
 * Tests to ensure the main domain orchestrators are properly initialized
 * and can provide access to their sub-services.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

describe('Domain Orchestrators Validation', () => {
  describe('ComplianceManagementOperationsManager', () => {
    test('should initialize and provide sub-services access', async () => {
      const { ComplianceManagementOperationsManager } = await import('../src/services/compliance-governance/regulatory-operations/compliance-management');
      
      const manager = new ComplianceManagementOperationsManager();
      expect(manager).toBeDefined();
      
      const services = manager.getServices();
      expect(services).toBeDefined();
      expect(services.complianceService).toBeDefined();
      expect(services.dataGovernanceService).toBeDefined();
      expect(services.emergencyService).toBeDefined();
      
      // Cleanup
      manager.removeAllListeners();
    });

    test('should handle compliance health check', async () => {
      const { ComplianceManagementOperationsManager } = await import('../src/services/compliance-governance/regulatory-operations/compliance-management');
      
      const manager = new ComplianceManagementOperationsManager();
      
      const healthCheck = await manager.performComplianceHealthCheck('test-org');
      expect(healthCheck).toBeDefined();
      expect(healthCheck.overall).toMatch(/HEALTHY|WARNING|CRITICAL/);
      expect(healthCheck.scores).toBeDefined();
      expect(healthCheck.recommendations).toBeDefined();
      expect(Array.isArray(healthCheck.recommendations)).toBe(true);
      
      // Cleanup
      manager.removeAllListeners();
    });
  });

  describe('ExternalIntegrationSystemsManager', () => {
    test('should initialize and provide sub-services access', async () => {
      const { ExternalIntegrationSystemsManager } = await import('../src/services/external-integration-systems/third-party-connectors/integration-orchestration');
      
      const context = {
        organizationId: 'test-org',
        userId: 'test-user',
        permissions: ['integration:read', 'integration:write']
      };
      
      const manager = new ExternalIntegrationSystemsManager(context);
      expect(manager).toBeDefined();
      
      const services = manager.getServices();
      expect(services).toBeDefined();
      expect(services.microsoft365Service).toBeDefined();
      expect(services.salesforceService).toBeDefined();
      expect(services.calendarService).toBeDefined();
      expect(services.apiManagementService).toBeDefined();
      expect(services.phase3Service).toBeDefined();
      
      // Cleanup
      manager.removeAllListeners();
    });

    test('should perform integration health checks', async () => {
      const { ExternalIntegrationSystemsManager } = await import('../src/services/external-integration-systems/third-party-connectors/integration-orchestration');
      
      const context = {
        organizationId: 'test-org',
        userId: 'test-user',
        permissions: ['integration:read']
      };
      
      const manager = new ExternalIntegrationSystemsManager(context);
      
      const healthCheck = await manager.checkIntegrationsHealth();
      expect(healthCheck).toBeDefined();
      expect(healthCheck.overall).toMatch(/healthy|warning|critical/);
      expect(Array.isArray(healthCheck.services)).toBe(true);
      expect(healthCheck.lastChecked).toBeInstanceOf(Date);
      
      // Cleanup
      manager.removeAllListeners();
    });
  });

  describe('BusinessOperationsManager', () => {
    test('should initialize and provide sub-services access', async () => {
      const { BusinessOperationsManager } = await import('../src/services/business-operations/project-management/business-coordination');
      
      const context = {
        organizationId: 'test-org',
        userId: 'test-user',
        roles: ['admin'],
        permissions: ['project:read', 'contract:read', 'vendor:read']
      };
      
      const manager = new BusinessOperationsManager(context);
      expect(manager).toBeDefined();
      
      const services = manager.getServices();
      expect(services).toBeDefined();
      expect(services.capitalProjectService).toBeDefined();
      expect(services.contractLifecycleService).toBeDefined();
      expect(services.vendorBrokerService).toBeDefined();
      
      // Cleanup
      manager.removeAllListeners();
    });

    test('should generate dashboard data', async () => {
      const { BusinessOperationsManager } = await import('../src/services/business-operations/project-management/business-coordination');
      
      const context = {
        organizationId: 'test-org',
        userId: 'test-user',
        roles: ['admin'],
        permissions: ['project:read', 'contract:read', 'vendor:read']
      };
      
      const manager = new BusinessOperationsManager(context);
      
      const dashboard = await manager.generateDashboard();
      expect(dashboard).toBeDefined();
      expect(dashboard.projects).toBeDefined();
      expect(dashboard.contracts).toBeDefined();
      expect(dashboard.vendors).toBeDefined();
      expect(dashboard.brokers).toBeDefined();
      expect(dashboard.criticalDates).toBeDefined();
      expect(dashboard.financialSummary).toBeDefined();
      
      // Cleanup
      manager.removeAllListeners();
    });
  });

  describe('TenantBrandingOperationsManager', () => {
    test('should initialize and provide sub-services access', async () => {
      const { TenantBrandingOperationsManager } = await import('../src/services/tenant-management/branding-operations/tenant-branding');
      
      const manager = new TenantBrandingOperationsManager();
      expect(manager).toBeDefined();
      
      const services = manager.getServices();
      expect(services).toBeDefined();
      expect(services.whiteLabelService).toBeDefined();
      expect(services.domainService).toBeDefined();
      expect(services.i18nService).toBeDefined();
      expect(services.customFieldService).toBeDefined();
      
      // Cleanup
      manager.removeAllListeners();
    });
  });

  describe('InfrastructureTechnologyOperationsManager', () => {
    test('should initialize and provide sub-services access', async () => {
      const { InfrastructureTechnologyOperationsManager } = await import('../src/services/infrastructure-technology/smart-systems/infrastructure-operations');
      
      const manager = new InfrastructureTechnologyOperationsManager();
      expect(manager).toBeDefined();
      
      const services = manager.getServices();
      expect(services).toBeDefined();
      expect(services.iotDeviceService).toBeDefined();
      expect(services.energyManagementService).toBeDefined();
      
      // Cleanup
      manager.removeAllListeners();
    });

    test('should generate infrastructure dashboard', async () => {
      const { InfrastructureTechnologyOperationsManager } = await import('../src/services/infrastructure-technology/smart-systems/infrastructure-operations');
      
      const manager = new InfrastructureTechnologyOperationsManager();
      
      const dashboard = await manager.generateInfrastructureDashboard('test-org');
      expect(dashboard).toBeDefined();
      expect(dashboard.iotDeviceMetrics).toBeDefined();
      expect(dashboard.energyMetrics).toBeDefined();
      
      // Cleanup
      manager.removeAllListeners();
    });
  });

  describe('Domain Services Export Validation', () => {
    test('should export all domain orchestrators from main index', async () => {
      const services = await import('../src/services');
      
      // Check that all domain orchestrators are exported
      expect(services.TenantBrandingOperationsManager).toBeDefined();
      expect(services.ComplianceManagementOperationsManager).toBeDefined();
      expect(services.ExternalIntegrationSystemsManager).toBeDefined();
      expect(services.InfrastructureTechnologyOperationsManager).toBeDefined();
      expect(services.BusinessOperationsManager).toBeDefined();
      
      // Check that business operations sub-services are exported
      expect(services.CapitalProjectService).toBeDefined();
      expect(services.ContractLifecycleService).toBeDefined();
      expect(services.VendorBrokerService).toBeDefined();
      expect(services.LeaseManagementService).toBeDefined();
      expect(services.CAMReconciliationService).toBeDefined();
      expect(services.CriticalDateService).toBeDefined();
    });

    test('should export legacy services for backward compatibility', async () => {
      const services = await import('../src/services');
      
      // Check that important legacy services are still available during transition
      expect(services.InternationalizationService).toBeDefined();
      expect(services.CustomFieldService).toBeDefined();
      expect(services.Microsoft365IntegrationService).toBeDefined();
      expect(services.SalesforceIntegrationService).toBeDefined();
      expect(services.CalendarIntegrationService).toBeDefined();
    });
  });
});