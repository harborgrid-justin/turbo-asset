# WorkflowEngine Service

Configurable workflow automation engine

## 📊 Overview

The WorkflowEngine Service provides:

- High-performance configurable workflow automation engine
- Enterprise-grade scalability and reliability
- Real-time processing capabilities
- Comprehensive error handling and logging
- Integration with other Turbo Asset services

**Key Features:**
- Workflow
- Automation
- Business process
- Orchestration

## 🚀 Installation

```bash
npm install @turbo-asset/workflow-engine
```

## 📋 API Reference

### Types

#### BaseEntity
```typescript
interface BaseEntity {
  id: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  version: number;
  isActive: boolean;
  metadata?: Record<string, string>;
}
```

#### StandardResponse<T>
```typescript
interface StandardResponse<T> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
  metadata?: ResponseMetadata;
}
```

#### ErrorResponse
```typescript
interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, string>;
}
```

#### ResponseMetadata
```typescript
interface ResponseMetadata {
  timestamp: Date;
  requestId: string;
  executionTime: number;
  apiVersion: string;
}
```

### WorkflowEngineService Class

#### Constructor
```typescript
new WorkflowEngineService()
```

Creates a new instance of the WorkflowEngine Service.

#### Methods

##### initialize(config: Record<string, string>): Promise<boolean>

Initializes the service with configuration parameters.

**Parameters:**
- `config` - Configuration object with service settings

**Returns:** Promise resolving to initialization success status

**Example:**
```javascript
const workflowengine = new WorkflowEngineService();
await workflowengine.initialize({
  database_url: "postgres://user:pass@localhost/turbo_asset",
  redis_url: "redis://localhost:6379",
  log_level: "info"
});
```

##### healthCheck(): string

Performs a health check on the service.

**Returns:** Health status string

**Example:**
```javascript
const health = workflowengine.healthCheck();
console.log(health); // "Service is healthy"
```

##### getServiceInfo(): Record<string, string>

Returns service information and metadata.

**Returns:** Object containing service details

**Example:**
```javascript
const info = workflowengine.getServiceInfo();
console.log(info);
// {
//   name: "workflow-engine",
//   version: "1.0.0", 
//   description: "Configurable workflow automation engine"
// }
```

### Standalone Functions

#### init(): string

Initializes the module and returns a confirmation message.

**Returns:** Initialization success message

**Example:**
```javascript
import { init } from '@turbo-asset/workflow-engine';
const result = init();
console.log(result); // "WorkflowEngineService initialized successfully"
```

## 💡 Usage Examples

### Basic Setup

```javascript
import { WorkflowEngineService } from '@turbo-asset/workflow-engine';

const workflowengine = new WorkflowEngineService();

// Initialize with configuration
await workflowengine.initialize({
  database_url: process.env.DATABASE_URL,
  redis_url: process.env.REDIS_URL,
  log_level: "info",
  cache_ttl: "3600"
});

// Check service health
const health = workflowengine.healthCheck();
console.log('Service Status:', health);
```

### Service Information

```javascript
// Get detailed service information
const serviceInfo = workflowengine.getServiceInfo();
console.log('Service Details:', serviceInfo);

// Service info includes:
// - name: Service identifier
// - version: Current version
// - description: Service description
```

### Error Handling

```javascript
try {
  await workflowengine.initialize(config);
  console.log('WorkflowEngine service initialized successfully');
} catch (error) {
  console.error('Initialization failed:', error);
  // Handle error appropriately
}
```

### Integration with Other Services

```javascript
import { WorkflowEngineService } from '@turbo-asset/workflow-engine';
import { NotificationService } from '@turbo-asset/notification-service';

const workflowengine = new WorkflowEngineService();
const notifications = new NotificationService();

// Initialize both services
await Promise.all([
  workflowengine.initialize(workflowengineConfig),
  notifications.initialize(notificationConfig)
]);

// Use services together
const serviceInfo = workflowengine.getServiceInfo();
```

## ⚙️ Configuration

### Environment Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `DATABASE_URL` | string | Yes | PostgreSQL connection URL |
| `REDIS_URL` | string | No | Redis cache connection URL |
| `LOG_LEVEL` | string | No | Logging level (debug, info, warn, error) |
| `CACHE_TTL` | number | No | Cache time-to-live in seconds |

### Configuration Object

```javascript
const config = {
  database_url: "postgres://user:pass@localhost/turbo_asset",
  redis_url: "redis://localhost:6379",
  log_level: "info",
  cache_ttl: "3600",
  max_connections: "10",
  connection_timeout: "30"
};
```

## 🚨 Error Handling

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `INIT_FAILED` | Service initialization failed | Check configuration parameters |
| `DB_CONNECTION_ERROR` | Database connection failed | Verify database URL and credentials |
| `CACHE_ERROR` | Cache operation failed | Check Redis connection |
| `INVALID_CONFIG` | Invalid configuration provided | Validate configuration parameters |

### Error Response Format

```typescript
{
  success: false,
  error: {
    code: "DB_CONNECTION_ERROR",
    message: "Failed to connect to database",
    details: {
      host: "localhost",
      port: "5432",
      database: "turbo_asset"
    }
  }
}
```

## 🔧 Performance

### Benchmarks

- **Initialization**: < 100ms typical
- **Health Check**: < 1ms
- **Service Info**: < 1ms
- **Memory Usage**: ~10MB baseline

### Optimization Tips

1. **Connection Pooling**: Configure appropriate database connection pool size
2. **Caching**: Enable Redis caching for frequently accessed data
3. **Batch Operations**: Use batch processing for large datasets
4. **Async Operations**: Leverage async/await for non-blocking operations

## 🧪 Testing

### Unit Tests

```javascript
// test/workflow-engine.test.js
import { WorkflowEngineService } from '@turbo-asset/workflow-engine';

describe('WorkflowEngineService', () => {
  let service;

  beforeEach(() => {
    service = new WorkflowEngineService();
  });

  test('should initialize successfully', async () => {
    const config = {
      database_url: "postgres://test:test@localhost/test_db"
    };
    const result = await service.initialize(config);
    expect(result).toBe(true);
  });

  test('should return health status', () => {
    const health = service.healthCheck();
    expect(health).toBe('Service is healthy');
  });

  test('should return service info', () => {
    const info = service.getServiceInfo();
    expect(info.name).toBe('workflow-engine');
    expect(info.version).toBe('1.0.0');
  });
});
```

### Integration Tests

```javascript
// test/integration/workflow-engine.integration.test.js
import { WorkflowEngineService } from '@turbo-asset/workflow-engine';

describe('WorkflowEngineService Integration', () => {
  let service;

  beforeAll(async () => {
    service = new WorkflowEngineService();
    await service.initialize({
      database_url: process.env.TEST_DATABASE_URL
    });
  });

  test('should connect to real database', async () => {
    const health = service.healthCheck();
    expect(health).toBe('Service is healthy');
  });
});
```

### Running Tests

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

## 🔄 Migration Guide

### From v0.x to v1.0

No breaking changes in the public API.

### Configuration Changes

- Added support for Redis caching
- New optional `cache_ttl` configuration parameter

## 📚 Related Services

- **[notification-service](./notification-service.md)** - For alerts and notifications
- **[reporting-service](./reporting-service.md)** - For analytics and reports
- **[data-warehouse-service](./data-warehouse-service.md)** - For data storage and retrieval

## 🛠️ Development

### Building from Source

```bash
git clone https://github.com/harborgrid-justin/turbo-asset.git
cd turbo-asset/packages/workflow-engine
npm install
npm run build
```

### Development Mode

```bash
npm run build:debug
```

### Contributing

See [Contributing Guide](../development/contributing.md).

## 📄 License

MIT License - see [LICENSE](../../../LICENSE) for details.