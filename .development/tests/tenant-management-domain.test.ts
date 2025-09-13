/**
 * Quick validation test for Tenant Management Domain
 */

import { TenantBrandingOperationsManager } from '../src/services/tenant-management/branding-operations/tenant-branding';
import { TENANT_BRANDING_CONSTANTS } from '../src/services/tenant-management/branding-operations/tenant-branding/constants/TenantBrandingConstants';

describe('Tenant Management Domain Validation', () => {
  let manager: TenantBrandingOperationsManager;

  beforeEach(() => {
    manager = new TenantBrandingOperationsManager();
  });

  afterEach(() => {
    // Cleanup any event listeners
    manager.removeAllListeners();
  });

  it('should initialize tenant branding operations manager', () => {
    expect(manager).toBeDefined();
    expect(typeof manager.provisionTenant).toBe('function');
    expect(typeof manager.updateTenantBranding).toBe('function');
    expect(typeof manager.getTenantBranding).toBe('function');
  });

  it('should provide access to sub-services', () => {
    const services = manager.getServices();
    
    expect(services.whiteLabelService).toBeDefined();
    expect(services.domainService).toBeDefined();
    expect(services.i18nService).toBeDefined();
    expect(services.customFieldService).toBeDefined();
  });

  it('should load tenant branding constants', () => {
    expect(TENANT_BRANDING_CONSTANTS.DEFAULT_COLORS.PRIMARY).toBe('#007bff');
    expect(TENANT_BRANDING_CONSTANTS.LOCALIZATION.DEFAULT_LANGUAGE).toBe('en');
    expect(TENANT_BRANDING_CONSTANTS.EVENTS.BRANDING_UPDATED).toBe('branding:updated');
  });

  it('should provision tenant with default configuration', async () => {
    const tenantSettings = await manager.provisionTenant({
      organizationId: 'test-org-123',
      name: 'test-tenant',
      displayName: 'Test Organization',
      createdBy: 'test-admin@example.com',
    });

    expect(tenantSettings).toBeDefined();
    expect(tenantSettings.organizationId).toBe('test-org-123');
    expect(tenantSettings.name).toBe('test-tenant');
    expect(tenantSettings.displayName).toBe('Test Organization');
    expect(tenantSettings.status).toBe('ACTIVE');
    expect(tenantSettings.configuration.branding).toBeDefined();
    expect(tenantSettings.configuration.theme).toBeDefined();
    expect(tenantSettings.configuration.localization).toBeDefined();
  });

  it('should create tenant context', async () => {
    // First provision a tenant
    await manager.provisionTenant({
      organizationId: 'context-test-org',
      name: 'context-test',
      displayName: 'Context Test Org',
      createdBy: 'admin@example.com',
    });

    const context = await manager.createTenantContext(
      'context-test-org',
      'user123',
      ['admin', 'user'],
      ['read', 'write']
    );

    expect(context.organizationId).toBe('context-test-org');
    expect(context.userId).toBe('user123');
    expect(context.roles).toEqual(['admin', 'user']);
    expect(context.permissions).toEqual(['read', 'write']);
    expect(context.branding).toBeDefined();
    expect(context.localization).toBeDefined();
  });

  it('should handle white-label configuration creation', async () => {
    const services = manager.getServices();
    
    const config = await services.whiteLabelService.createConfiguration(
      'test-wl-org',
      'Test Config',
      'Test white-label configuration',
      'GLOBAL',
      {
        primaryColor: '#ff6b35',
        secondaryColor: '#004e89',
        logoUrl: 'https://example.com/logo.png',
      },
      {
        name: 'Test Theme',
        colors: {
          primary: '#ff6b35',
          secondary: '#004e89',
          success: '#28a745',
          warning: '#ffc107',
          error: '#dc3545',
          info: '#17a2b8',
        },
        typography: {
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          lineHeight: '1.5',
        },
        layout: {
          sidebar: 'left',
          navigation: 'both',
          contentWidth: 'contained',
        },
        components: {},
      },
      'admin@test.com'
    );

    expect(config).toBeDefined();
    expect(config.name).toBe('Test Config');
    expect(config.branding.primaryColor).toBe('#ff6b35');
    expect(config.organizationId).toBe('test-wl-org');
  });

  it('should handle custom domain setup', async () => {
    const services = manager.getServices();
    
    const domain = await services.domainService.setupCustomDomain(
      'domain-test-org',
      'example.com',
      'app'
    );

    expect(domain).toBeDefined();
    expect(domain.domain).toBe('example.com');
    expect(domain.subdomain).toBe('app');
    expect(domain.isVerified).toBe(false);
    expect(domain.status).toBe('PENDING');
    expect(domain.dnsRecords).toBeDefined();
    expect(domain.dnsRecords.length).toBeGreaterThan(0);
  });

  it('should generate PWA manifest', async () => {
    // First provision a tenant
    await manager.provisionTenant({
      organizationId: 'pwa-test-org',
      name: 'pwa-test',
      displayName: 'PWA Test Organization',
      branding: {
        primaryColor: '#ff6b35',
        secondaryColor: '#004e89',
        logoUrl: 'https://example.com/logo.png',
      },
      createdBy: 'admin@example.com',
    });

    const context = await manager.createTenantContext(
      'pwa-test-org',
      'user123',
      ['user'],
      ['read']
    );

    const manifest = await manager.generatePWAManifest(
      context,
      'https://app.example.com'
    );

    expect(manifest).toBeDefined();
    expect(manifest.name).toBe('PWA Test Organization');
    expect(manifest.short_name).toBe('pwa-test');
    expect(manifest.theme_color).toBe('#ff6b35');
    expect(manifest.start_url).toBe('https://app.example.com');
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });
});