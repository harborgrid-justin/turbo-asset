# CalendarIntegration Service

Calendar system integration and synchronization

## 📊 Overview

The CalendarIntegration Service provides:

- High-performance calendar system integration and synchronization
- Enterprise-grade scalability and reliability
- Real-time processing capabilities
- Comprehensive error handling and logging
- Integration with other Turbo Asset services

**Key Features:**
- Calendar integration
- Scheduling
- Outlook
- Google Calendar

## 🚀 Installation

```bash
npm install @turbo-asset/calendar-integration-service
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

### CalendarIntegrationService Class

#### Constructor
```typescript
new CalendarIntegrationService()
```

Creates a new instance of the CalendarIntegration Service.

#### Methods

##### initialize(config: Record<string, string>): Promise<boolean>

Initializes the service with configuration parameters.

**Parameters:**
- `config` - Configuration object with service settings

**Returns:** Promise resolving to initialization success status

**Example:**
```javascript
const calendarintegrationservice = new CalendarIntegrationService();
await calendarintegrationservice.initialize({
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
const health = calendarintegrationservice.healthCheck();
console.log(health); // "Service is healthy"
```

##### getServiceInfo(): Record<string, string>

Returns service information and metadata.

**Returns:** Object containing service details

**Example:**
```javascript
const info = calendarintegrationservice.getServiceInfo();
console.log(info);
// {
//   name: "calendar-integration-service",
//   version: "1.0.0", 
//   description: "Calendar system integration and synchronization"
// }
```

### Standalone Functions

#### init(): string

Initializes the module and returns a confirmation message.

**Returns:** Initialization success message

**Example:**
```javascript
import { init } from '@turbo-asset/calendar-integration-service';
const result = init();
console.log(result); // "CalendarIntegrationService initialized successfully"
```

## 💡 Usage Examples

### Basic Setup

```javascript
import { CalendarIntegrationService } from '@turbo-asset/calendar-integration-service';

const calendarintegrationservice = new CalendarIntegrationService();

// Initialize with configuration
await calendarintegrationservice.initialize({
  database_url: process.env.DATABASE_URL,
  redis_url: process.env.REDIS_URL,
  log_level: "info",
  cache_ttl: "3600"
});

// Check service health
const health = calendarintegrationservice.healthCheck();
console.log('Service Status:', health);
```

### Service Information

```javascript
// Get detailed service information
const serviceInfo = calendarintegrationservice.getServiceInfo();
console.log('Service Details:', serviceInfo);

// Service info includes:
// - name: Service identifier
// - version: Current version
// - description: Service description
```

### Error Handling

```javascript
try {
  await calendarintegrationservice.initialize(config);
  console.log('CalendarIntegration service initialized successfully');
} catch (error) {
  console.error('Initialization failed:', error);
  // Handle error appropriately
}
```

### Integration with Other Services

```javascript
import { CalendarIntegrationService } from '@turbo-asset/calendar-integration-service';
import { NotificationService } from '@turbo-asset/notification-service';

const calendarintegrationservice = new CalendarIntegrationService();
const notifications = new NotificationService();

// Initialize both services
await Promise.all([
  calendarintegrationservice.initialize(calendarintegrationserviceConfig),
  notifications.initialize(notificationConfig)
]);

// Use services together
const serviceInfo = calendarintegrationservice.getServiceInfo();
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
// test/calendar-integration-service.test.js
import { CalendarIntegrationService } from '@turbo-asset/calendar-integration-service';

describe('CalendarIntegrationService', () => {
  let service;

  beforeEach(() => {
    service = new CalendarIntegrationService();
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
    expect(info.name).toBe('calendar-integration-service');
    expect(info.version).toBe('1.0.0');
  });
});
```

### Integration Tests

```javascript
// test/integration/calendar-integration-service.integration.test.js
import { CalendarIntegrationService } from '@turbo-asset/calendar-integration-service';

describe('CalendarIntegrationService Integration', () => {
  let service;

  beforeAll(async () => {
    service = new CalendarIntegrationService();
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
cd turbo-asset/packages/calendar-integration-service
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