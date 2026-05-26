# Tenant Management Domain - Migration Guide

## Overview

The Tenant Management Domain consolidates white-label configuration, custom domains, internationalization, and custom field management into a cohesive, orchestrated service domain.

## Migrated Services

### From Flat Services to Domain Architecture

| Legacy Service | New Domain Service | Migration Path |
|---|---|---|
| `WhiteLabelService` | `TenantBrandingOperationsManager.whiteLabelService` | Direct replacement with enhanced functionality |
| `InternationalizationService` | `TenantBrandingOperationsManager.i18nService` | Enhanced with multi-tenant context |
| `CustomFieldService` | `TenantBrandingOperationsManager.customFieldService` | Extended with tenant-aware validation |

## Migration Examples

### WhiteLabelService Migration

**Before:**
```typescript
import { WhiteLabelService } from '../services/WhiteLabelService';

const whiteLabelService = new WhiteLabelService();
await whiteLabelService.createWhiteLabelConfig(orgId, name, description, scope, branding);
```

**After:**
```typescript
import { TenantBrandingOperationsManager } from '../services/tenant-management/branding-operations/tenant-branding';

const tenantManager = new TenantBrandingOperationsManager();
const { whiteLabelService } = tenantManager.getServices();
await whiteLabelService.createConfiguration(orgId, name, description, scope, branding, theme, createdBy);
```

**Orchestrated Approach (Recommended):**
```typescript
import { TenantBrandingOperationsManager } from '../services/tenant-management/branding-operations/tenant-branding';

const tenantManager = new TenantBrandingOperationsManager();
await tenantManager.provisionTenant({
  organizationId: orgId,
  name,
  displayName,
  branding,
  localization,
  createdBy
});
```

### InternationalizationService Migration

**Before:**
```typescript
import { InternationalizationService } from '../services/InternationalizationService';

const i18nService = new InternationalizationService();
const text = await i18nService.getLocalizedText(key, language, variables);
```

**After:**
```typescript
import { TenantBrandingOperationsManager } from '../services/tenant-management/branding-operations/tenant-branding';

const tenantManager = new TenantBrandingOperationsManager();
const context = await tenantManager.createTenantContext(orgId, userId, roles, permissions);
const { i18nService } = tenantManager.getServices();
const text = await i18nService.getLocalizedText(context, key, variables);
```

### CustomFieldService Migration

**Before:**
```typescript
import { CustomFieldService } from '../services/CustomFieldService';

const customFieldService = new CustomFieldService();
await customFieldService.createField(fieldDef);
```

**After:**
```typescript
import { TenantBrandingOperationsManager } from '../services/tenant-management/branding-operations/tenant-branding';

const tenantManager = new TenantBrandingOperationsManager();
const { customFieldService } = tenantManager.getServices();
await customFieldService.createCustomField(orgId, fieldDef, createdBy);
```

## New Capabilities

### Tenant Provisioning
```typescript
const tenantSettings = await tenantManager.provisionTenant({
  organizationId: 'org123',
  name: 'acme-corp',
  displayName: 'ACME Corporation',
  branding: {
    primaryColor: '#ff6b35',
    secondaryColor: '#004e89',
    logoUrl: 'https://example.com/logo.png'
  },
  customDomain: 'acme.example.com',
  createdBy: 'admin@acme.com'
});
```

### Comprehensive Branding Updates
```typescript
await tenantManager.updateTenantBranding(orgId, {
  colors: { primaryColor: '#new-color' },
  theme: { layout: { sidebar: 'right' } },
  customDomain: { domain: 'new-domain.com' },
  localization: { defaultLanguage: 'es' }
}, updatedBy);
```

### PWA Manifest Generation
```typescript
const context = await tenantManager.createTenantContext(orgId, userId, roles, permissions);
const manifest = await tenantManager.generatePWAManifest(context, 'https://app.example.com');
```

## Breaking Changes

### API Changes

1. **Constructor Parameters**: Services now require organization context for most operations
2. **Method Signatures**: Enhanced with tenant context and additional metadata
3. **Return Types**: Extended with additional tenant-specific information

### Event Changes

1. **Event Names**: Updated to use consistent naming from `TENANT_BRANDING_CONSTANTS.EVENTS`
2. **Event Data**: Enhanced with tenant context and cross-service correlation IDs

## Backward Compatibility

### Legacy Service Support

The original services remain available during transition:

```typescript
// Still available for backward compatibility
export { InternationalizationService } from './InternationalizationService';
export { CustomFieldService } from './CustomFieldService';

// Legacy WhiteLabelService has been moved to domain but can be accessed via:
// TenantBrandingOperationsManager.getServices().whiteLabelService
```

### Migration Timeline

1. **Phase 1**: New domain services available alongside legacy services
2. **Phase 2**: Update all new code to use domain services
3. **Phase 3**: Migrate existing usage to domain services
4. **Phase 4**: Deprecate and remove legacy services

## Performance Improvements

### Caching Enhancements
- **Branding Cache**: Improved caching with automatic invalidation
- **Domain Mapping**: Faster domain-to-organization lookups
- **Translation Cache**: Multi-tenant translation caching

### Resource Optimization
- **Service Coordination**: Reduced redundant operations across services
- **Event-Driven Updates**: Efficient cross-service communication
- **Lazy Loading**: Services initialized only when needed

## Testing Guide

### Unit Tests
```typescript
import { TenantBrandingOperationsManager } from './tenant-management/branding-operations/tenant-branding';

describe('TenantBrandingOperationsManager', () => {
  let manager: TenantBrandingOperationsManager;
  
  beforeEach(() => {
    manager = new TenantBrandingOperationsManager();
  });
  
  it('should provision tenant with complete setup', async () => {
    const result = await manager.provisionTenant({
      organizationId: 'test-org',
      name: 'test-tenant',
      displayName: 'Test Tenant',
      createdBy: 'test-user'
    });
    
    expect(result.status).toBe('ACTIVE');
    expect(result.configuration.branding).toBeDefined();
  });
});
```

### Integration Tests
```typescript
describe('Cross-Service Integration', () => {
  it('should coordinate domain verification with branding updates', async () => {
    const manager = new TenantBrandingOperationsManager();
    const { domainService } = manager.getServices();
    
    // Setup domain
    const domain = await domainService.setupCustomDomain('org123', 'example.com');
    
    // Verify coordination with other services
    expect(domain.isVerified).toBe(false);
    
    // Simulate verification
    const verified = await domainService.verifyCustomDomain('org123', 'example.com');
    expect(verified).toBe(true);
  });
});
```

## Troubleshooting

### Common Issues

1. **Service Not Found**: Ensure you're using the orchestrated manager instead of direct service access
2. **Context Missing**: Always create tenant context before calling service methods
3. **Cache Issues**: Use cache invalidation events or restart services if seeing stale data

### Debug Logging

Enable debug logging for tenant services:

```typescript
process.env.LOG_LEVEL = 'debug';
process.env.DEBUG_TENANT_SERVICES = 'true';
```

## Support

For migration assistance or questions about the new domain architecture, please:

1. Review the comprehensive type definitions in `TenantBrandingTypes.ts`
2. Check the constants file for configuration options
3. Refer to the integration tests for usage examples
4. Contact the development team for specific migration scenarios