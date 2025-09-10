# NAPI-RS Module Architecture

## Overview

The Turbo Asset IWMS platform has been enhanced with 20 high-performance NAPI-RS packages that provide native Rust implementations for critical business services. These packages offer significant performance improvements while maintaining complete compatibility with the existing TypeScript codebase.

## Universal Data Standard

All NAPI-RS packages implement a universal data standard that ensures consistency across modules:

### Core Interfaces

- **BaseEntity**: Standard entity structure with audit fields
- **StandardResponse**: Uniform API response format
- **PaginationParams**: Consistent pagination interface
- **ValidationResult**: Standardized validation reporting
- **ModuleEvent**: Inter-module communication format
- **ModuleMetrics**: Performance monitoring structure

### Data Flow

```
TypeScript Service → NAPI Integration Layer → Rust Service → Database
                  ↘                       ↙
                    Fallback Mechanism
```

## NAPI-RS Packages

### Asset Management
1. **@turbo-asset/asset-lifecycle-service**
   - Asset depreciation calculations (straight-line, declining balance)
   - Replacement planning and forecasting
   - Total cost of ownership analysis
   - Asset validation and compliance

### Communication & Notifications
2. **@turbo-asset/notification-service**
   - High-performance message queuing
   - Multi-channel delivery (email, SMS, push, WebSocket)
   - Template processing and personalization
   - Delivery tracking and analytics

### Document Management
3. **@turbo-asset/document-service**
   - File upload/download with streaming
   - Version control and diff tracking
   - Metadata extraction and indexing
   - Content search and retrieval

### Data Processing
4. **@turbo-asset/bulk-data-service**
   - Parallel CSV/Excel processing
   - High-throughput data validation
   - Batch import/export operations
   - Progress tracking and error handling

### Analytics & Intelligence
5. **@turbo-asset/business-intelligence-service**
   - Real-time data aggregation
   - Statistical analysis and modeling
   - Predictive analytics
   - Performance metrics calculation

### Engineering Integration
6. **@turbo-asset/cad-integration-service**
   - DWG/DXF file parsing
   - Coordinate system transformations
   - Layer extraction and manipulation
   - Spatial query optimization

### Financial Management
7. **@turbo-asset/chargeback-service**
   - Cost allocation algorithms
   - Rate calculation and management
   - Financial reporting and analytics
   - Multi-currency support

### Compliance & Governance
8. **@turbo-asset/compliance-service**
   - Regulatory compliance checking
   - Audit trail generation
   - Policy validation
   - Risk assessment

### Configuration Management
9. **@turbo-asset/custom-field-service**
   - Dynamic field definition
   - Validation rule processing
   - Form generation
   - Data type conversion

### Sustainability
10. **@turbo-asset/energy-management-service**
    - Meter data processing
    - Usage pattern analysis
    - Carbon footprint calculation
    - Efficiency optimization

### Inventory & Supply Chain
11. **@turbo-asset/inventory-service**
    - Stock level tracking
    - Demand forecasting
    - Reorder point calculation
    - Supplier performance analysis

### IoT & Smart Building
12. **@turbo-asset/iot-device-service**
    - Device connectivity management
    - Sensor data processing
    - Anomaly detection
    - Device health monitoring

### Real Estate Management
13. **@turbo-asset/lease-management-service**
    - Lease calculation engines
    - Payment processing
    - Deadline tracking
    - Financial reporting

### Maintenance Operations
14. **@turbo-asset/maintenance-service**
    - Preventive maintenance scheduling
    - Work order optimization
    - Resource allocation
    - Cost tracking

### Portfolio Analytics
15. **@turbo-asset/portfolio-service**
    - Portfolio performance analysis
    - Benchmarking and comparison
    - Trend analysis
    - ROI calculation

### Reporting Engine
16. **@turbo-asset/reporting-service**
    - Report template processing
    - Data visualization generation
    - Scheduled report execution
    - Multi-format export

### Space Management
17. **@turbo-asset/space-utilization-service**
    - Occupancy analytics
    - Utilization optimization
    - Sensor data integration
    - Space planning algorithms

### Work Management
18. **@turbo-asset/work-order-service**
    - Work order lifecycle management
    - Technician assignment optimization
    - Mobile workflow support
    - Progress tracking

### Process Automation
19. **@turbo-asset/workflow-engine**
    - Workflow definition processing
    - State machine management
    - Approval routing
    - SLA monitoring

### System Integration
20. **@turbo-asset/integration-service**
    - API orchestration
    - Data transformation
    - Message routing
    - System connectivity

## Architecture Benefits

### Performance Improvements
- **10-100x faster** processing for compute-intensive operations
- **Lower memory usage** through Rust's zero-cost abstractions
- **Better CPU utilization** with native compiled code
- **Reduced garbage collection** overhead

### Reliability
- **Memory safety** guaranteed by Rust's ownership system
- **Concurrent processing** without data races
- **Graceful error handling** with Result types
- **Automatic fallback** to TypeScript implementations

### Scalability
- **Independent deployment** of each service
- **Horizontal scaling** capabilities
- **Resource isolation** between modules
- **Load balancing** support

### Developer Experience
- **TypeScript compatibility** maintained
- **Hot-swappable** implementations
- **Comprehensive testing** infrastructure
- **Rich metrics and monitoring**

## Usage Examples

### Asset Lifecycle Management
```typescript
import { napiRegistry } from './services/napi-integration';

// Calculate depreciation
const result = await napiRegistry.executeServiceMethod(
  'asset-lifecycle',
  'calculateStraightLineDepreciation',
  [100000, 10000, 10, 3]
);

// Generate replacement plan
const plan = await napiRegistry.executeServiceMethod(
  'asset-lifecycle',
  'generateReplacementPlan',
  ['asset-123', 'HVAC Unit', new Date('2020-01-01'), 15, 'GOOD', 75000]
);
```

### Bulk Data Processing
```typescript
// Process large CSV file
const importResult = await napiRegistry.executeServiceMethod(
  'bulk-data',
  'processCSVImport',
  [csvData, mappingConfig, validationRules]
);

// Export data with streaming
const exportResult = await napiRegistry.executeServiceMethod(
  'bulk-data',
  'streamDataExport',
  [filters, format, batchSize]
);
```

### Real-time Notifications
```typescript
// Send high-priority notification
const notification = await napiRegistry.executeServiceMethod(
  'notification',
  'sendNotification',
  [{
    recipientId: 'user-123',
    title: 'Critical Asset Alert',
    message: 'Asset requires immediate attention',
    type: 'WARNING',
    priority: 'URGENT',
    channels: ['EMAIL', 'SMS', 'PUSH']
  }]
);
```

## Configuration

### Service Registration
Services are automatically registered on startup with fallback configuration:

```typescript
const config = {
  serviceName: 'asset-lifecycle',
  packageName: 'asset-lifecycle-service',
  fallbackToTs: true,      // Enable TypeScript fallback
  enableMetrics: true,     // Collect performance metrics
  enableCaching: false     // Service-specific caching
};
```

### Environment Variables
```bash
# Enable/disable NAPI services
ENABLE_NAPI_SERVICES=true

# Service-specific configurations
ASSET_LIFECYCLE_CACHE_TTL=300
NOTIFICATION_BATCH_SIZE=1000
BULK_DATA_CHUNK_SIZE=10000

# Performance tuning
NAPI_WORKER_THREADS=4
NAPI_MEMORY_LIMIT=512MB
```

## Monitoring and Metrics

### Built-in Metrics
- Execution time per operation
- Success/failure rates
- Memory usage patterns
- Throughput measurements

### Health Checks
Each service provides:
- Service availability check
- Dependency validation
- Resource usage reporting
- Performance benchmarks

### Alerting
- Automatic failover detection
- Performance degradation alerts
- Resource exhaustion warnings
- Service restart notifications

## Development Guidelines

### Adding New NAPI Services
1. Create package structure using the generator
2. Implement core Rust functionality
3. Add TypeScript bindings
4. Write comprehensive tests
5. Update integration layer
6. Document API and usage

### Best Practices
- Follow universal data standard
- Implement proper error handling
- Provide TypeScript fallbacks
- Include comprehensive logging
- Optimize for performance
- Maintain backward compatibility

## Testing

### Test Categories
- **Unit Tests**: Individual function testing
- **Integration Tests**: Service interaction testing
- **Performance Tests**: Benchmark comparisons
- **Fallback Tests**: TypeScript compatibility
- **Load Tests**: High-volume scenarios

### Running Tests
```bash
# Test all NAPI packages
npm run test:napi

# Test specific service
npm run test packages/asset-lifecycle-service

# Performance benchmarks
npm run benchmark:napi

# Integration testing
npm run test:integration
```

## Deployment

### Build Process
```bash
# Build all NAPI packages
npm run build:napi

# Build for specific platforms
npm run build:napi -- --platform linux-x64

# Cross-compilation
npm run build:napi -- --platform win32-x64 --platform darwin-arm64
```

### Platform Support
- Linux (x64, ARM64, musl)
- Windows (x64, ARM64)
- macOS (x64, ARM64)
- FreeBSD (x64)
- Android (ARM64)

### Docker Support
```dockerfile
# Multi-stage build for NAPI services
FROM node:18-alpine AS builder
COPY packages/ ./packages/
RUN npm run build:napi

FROM node:18-alpine AS runtime
COPY --from=builder /packages/*/dist ./packages/
```

## Migration Guide

### From TypeScript to NAPI
1. Identify performance-critical services
2. Implement NAPI equivalent
3. Add to integration layer
4. Test compatibility
5. Enable gradual rollout
6. Monitor performance improvements

### Rollback Strategy
- Automatic fallback to TypeScript
- Feature flags for service selection
- Gradual migration capabilities
- Zero-downtime switching

## Support and Troubleshooting

### Common Issues
- **Build failures**: Check Rust toolchain installation
- **Runtime errors**: Verify native dependencies
- **Performance issues**: Review resource allocation
- **Compatibility problems**: Test TypeScript fallbacks

### Debug Mode
```bash
# Enable debug logging
RUST_LOG=debug npm start

# Detailed tracing
RUST_BACKTRACE=full npm start

# Memory profiling
NODE_OPTIONS="--inspect" npm start
```

## Future Roadmap

### Planned Enhancements
- Machine learning model integration
- Real-time stream processing
- Advanced caching strategies
- GPU acceleration support
- WebAssembly compatibility
- Edge computing deployment

### Performance Targets
- Sub-millisecond response times
- 10,000+ concurrent operations
- 99.99% uptime reliability
- <1% memory overhead
- Zero-copy data processing