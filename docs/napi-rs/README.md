# NAPI-RS Modules Documentation

This directory contains complete documentation for all 42 NAPI-RS modules in the Turbo Asset platform. Each module provides high-performance Rust implementations exposed to Node.js through NAPI-RS.

## 📋 Module Overview

The Turbo Asset platform includes the following NAPI-RS modules:

### Core Services
- **[portfolio-service](./modules/portfolio-service.md)** - Portfolio analytics and performance tracking
- **[notification-service](./modules/notification-service.md)** - Multi-channel notification delivery
- **[reporting-service](./modules/reporting-service.md)** - Advanced reporting and analytics
- **[workflow-engine](./modules/workflow-engine.md)** - Configurable workflow automation

### Space & Asset Management
- **[space-standards-service](./modules/space-standards-service.md)** - Space planning and standards management
- **[space-utilization-service](./modules/space-utilization-service.md)** - Space utilization analytics
- **[asset-lifecycle-service](./modules/asset-lifecycle-service.md)** - Asset lifecycle management
- **[maintenance-service](./modules/maintenance-service.md)** - Maintenance operations and scheduling
- **[work-order-service](./modules/work-order-service.md)** - Work order management
- **[preventive-maintenance-service](./modules/preventive-maintenance-service.md)** - Preventive maintenance scheduling
- **[move-management-service](./modules/move-management-service.md)** - Space move operations

### Financial Management
- **[chargeback-service](./modules/chargeback-service.md)** - Cost allocation and chargeback
- **[budget-forecast-service](./modules/budget-forecast-service.md)** - Budget planning and forecasting
- **[financial-consolidation-service](./modules/financial-consolidation-service.md)** - Financial consolidation
- **[lease-management-service](./modules/lease-management-service.md)** - Lease contract management
- **[contract-lifecycle-service](./modules/contract-lifecycle-service.md)** - Contract lifecycle management

### Data & Analytics
- **[data-warehouse-service](./modules/data-warehouse-service.md)** - Data warehousing operations
- **[data-governance-service](./modules/data-governance-service.md)** - Data governance and quality
- **[business-intelligence-service](./modules/business-intelligence-service.md)** - Business intelligence analytics
- **[advanced-intelligence-service](./modules/advanced-intelligence-service.md)** - AI/ML intelligence services

### Integration & API Management
- **[api-documentation-service](./modules/api-documentation-service.md)** - API documentation generation
- **[api-management-service](./modules/api-management-service.md)** - API lifecycle management
- **[integration-service](./modules/integration-service.md)** - System integration orchestration
- **[enterprise-service-bus-service](./modules/enterprise-service-bus-service.md)** - Enterprise service bus
- **[bulk-data-service](./modules/bulk-data-service.md)** - Bulk data processing

### External Integrations
- **[cad-integration-service](./modules/cad-integration-service.md)** - CAD system integration
- **[calendar-integration-service](./modules/calendar-integration-service.md)** - Calendar system integration
- **[vendor-broker-service](./modules/vendor-broker-service.md)** - Vendor management integration

### Compliance & Governance
- **[compliance-service](./modules/compliance-service.md)** - Regulatory compliance management
- **[emergency-planning-service](./modules/emergency-planning-service.md)** - Emergency planning and response

### Infrastructure & Technology
- **[energy-management-service](./modules/energy-management-service.md)** - Energy monitoring and management
- **[iot-device-service](./modules/iot-device-service.md)** - IoT device management
- **[technician-mobile-service](./modules/technician-mobile-service.md)** - Mobile technician operations

### Workflow & Operations
- **[workflow-service](./modules/workflow-service.md)** - Advanced workflow operations
- **[critical-date-service](./modules/critical-date-service.md)** - Critical date tracking

### Document & Content Management
- **[document-service](./modules/document-service.md)** - Document management operations

### Customization & Branding
- **[custom-field-service](./modules/custom-field-service.md)** - Dynamic custom field management
- **[white-label-service](./modules/white-label-service.md)** - White label customization

### Development Tools
- **[sdk-generator-service](./modules/sdk-generator-service.md)** - SDK generation utilities
- **[inventory-service](./modules/inventory-service.md)** - Inventory management operations

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Rust 1.70+
- PostgreSQL 13+

### Installation

```bash
# Install all NAPI-RS modules
npm install

# Build all modules
npm run build:napi

# Test all modules
npm run test:napi
```

### Basic Usage

```javascript
import { PortfolioService } from '@turbo-asset/portfolio-service';
import { NotificationService } from '@turbo-asset/notification-service';

// Initialize services
const portfolio = new PortfolioService();
const notifications = new NotificationService();

// Configure services
await portfolio.initialize({ database_url: "postgres://..." });
await notifications.initialize({ smtp_host: "smtp.example.com" });

// Use services
const serviceInfo = portfolio.getServiceInfo();
console.log('Portfolio Service:', serviceInfo);
```

## 📚 Documentation Structure

Each module documentation includes:

1. **Overview** - Purpose and capabilities
2. **Installation** - Setup and configuration
3. **API Reference** - Complete TypeScript definitions
4. **Usage Examples** - Practical implementation examples
5. **Configuration** - Environment and runtime configuration
6. **Error Handling** - Error codes and troubleshooting
7. **Performance** - Optimization and benchmarks
8. **Testing** - Unit and integration test examples

## 🔧 Architecture

All NAPI-RS modules follow a consistent architecture:

- **Rust Core** - High-performance business logic
- **NAPI-RS Bindings** - TypeScript-safe Node.js interface
- **Universal Data Model** - Consistent entity structures
- **Standard Response Format** - Unified response patterns
- **Error Handling** - Comprehensive error management
- **Configuration** - Environment-based configuration
- **Logging** - Structured logging with tracing
- **Testing** - Unit and integration test coverage

## 🏗️ Development Guide

### Building Modules

```bash
# Build specific module
cd packages/portfolio-service
npm run build

# Build all modules
npm run build:napi

# Development build (debug)
npm run build:debug
```

### Testing

```bash
# Test specific module
cd packages/portfolio-service
npm test

# Test all modules
npm run test:napi
```

### Adding New Modules

1. Use the scaffold generator:
   ```bash
   npm run napi:generate
   ```

2. Follow the [Module Development Guide](./development/module-development.md)

## 📊 Performance

NAPI-RS modules provide significant performance benefits:

- **10-50x faster** than pure JavaScript implementations
- **Memory efficient** with zero-copy operations
- **Concurrent processing** with Tokio async runtime
- **Type safety** with compile-time guarantees

## 🔍 Troubleshooting

### Common Issues

1. **Build Failures**: Ensure Rust toolchain is properly installed
2. **Runtime Errors**: Check module initialization and configuration
3. **Performance Issues**: Review async usage patterns

### Health Checks

```bash
# Check all module health
npm run napi:health
```

## 📖 Additional Resources

- [NAPI-RS Official Documentation](https://napi.rs/)
- [Rust Programming Language](https://www.rust-lang.org/)
- [Tokio Async Runtime](https://tokio.rs/)
- [Turbo Asset Platform Guide](../../README.md)

## 🤝 Contributing

See [Contributing Guide](./development/contributing.md) for development guidelines.

## 📄 License

MIT License - see [LICENSE](../../LICENSE) for details.