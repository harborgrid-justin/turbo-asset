# NAPI-RS Module Examples

This directory contains practical examples for using NAPI-RS modules in various scenarios.

## 📁 Example Structure

```
examples/
├── basic-usage/           # Simple usage examples
├── integration/          # Multi-service integration examples
├── performance/          # Performance optimization examples
├── testing/             # Testing strategies and examples
└── production/          # Production deployment examples
```

## 🚀 Basic Usage Examples

### Portfolio Service Basic Example

```javascript
// examples/basic-usage/portfolio-basic.js
import { PortfolioService } from '@turbo-asset/portfolio-service';

async function basicPortfolioExample() {
  const portfolioService = new PortfolioService();
  
  try {
    // Initialize the service
    const initResult = await portfolioService.initialize({
      database_url: "postgres://user:pass@localhost/turbo_asset",
      log_level: "info"
    });
    
    console.log('Service initialized:', initResult);
    
    // Check service health
    const health = portfolioService.healthCheck();
    console.log('Health status:', health);
    
    // Get service information
    const info = portfolioService.getServiceInfo();
    console.log('Service info:', info);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

basicPortfolioExample();
```

### Notification Service Basic Example

```javascript
// examples/basic-usage/notification-basic.js
import { NotificationService } from '@turbo-asset/notification-service';

async function basicNotificationExample() {
  const notificationService = new NotificationService();
  
  try {
    // Initialize with email configuration
    await notificationService.initialize({
      database_url: "postgres://user:pass@localhost/turbo_asset",
      smtp_host: "smtp.example.com",
      smtp_port: "587",
      smtp_user: "notifications@example.com",
      smtp_pass: "password",
      log_level: "info"
    });
    
    console.log('Notification service ready');
    console.log('Service info:', notificationService.getServiceInfo());
    
  } catch (error) {
    console.error('Notification service error:', error);
  }
}

basicNotificationExample();
```

## 🔗 Integration Examples

### Multi-Service Integration

```javascript
// examples/integration/multi-service.js
import { PortfolioService } from '@turbo-asset/portfolio-service';
import { NotificationService } from '@turbo-asset/notification-service';
import { ReportingService } from '@turbo-asset/reporting-service';

class IntegratedWorkflowExample {
  constructor() {
    this.portfolio = new PortfolioService();
    this.notifications = new NotificationService();
    this.reporting = new ReportingService();
  }

  async initialize() {
    const baseConfig = {
      database_url: process.env.DATABASE_URL,
      log_level: "info"
    };

    // Initialize all services
    await Promise.all([
      this.portfolio.initialize(baseConfig),
      this.notifications.initialize({
        ...baseConfig,
        smtp_host: process.env.SMTP_HOST,
        smtp_user: process.env.SMTP_USER,
        smtp_pass: process.env.SMTP_PASS
      }),
      this.reporting.initialize({
        ...baseConfig,
        report_storage_path: process.env.REPORT_STORAGE_PATH
      })
    ]);

    console.log('All services initialized successfully');
  }

  async generatePortfolioReport(portfolioId) {
    try {
      // 1. Get portfolio information
      const portfolioInfo = this.portfolio.getServiceInfo();
      console.log('Processing portfolio:', portfolioId);

      // 2. Generate report (would be implemented in reporting service)
      const reportInfo = this.reporting.getServiceInfo();
      console.log('Report service ready:', reportInfo);

      // 3. Send notification (would be implemented in notification service)
      const notificationInfo = this.notifications.getServiceInfo();
      console.log('Notification service ready:', notificationInfo);

      console.log(`Portfolio report generated and notification sent for ${portfolioId}`);
      
    } catch (error) {
      console.error('Workflow error:', error);
      throw error;
    }
  }

  async healthCheck() {
    const health = {
      portfolio: this.portfolio.healthCheck(),
      notifications: this.notifications.healthCheck(),
      reporting: this.reporting.healthCheck()
    };

    console.log('Services health:', health);
    return health;
  }
}

// Usage
async function runIntegratedExample() {
  const workflow = new IntegratedWorkflowExample();
  
  await workflow.initialize();
  await workflow.healthCheck();
  await workflow.generatePortfolioReport('portfolio-123');
}

runIntegratedExample().catch(console.error);
```

### Database Integration Example

```javascript
// examples/integration/database-integration.js
import { PortfolioService } from '@turbo-asset/portfolio-service';
import { DataWarehouseService } from '@turbo-asset/data-warehouse-service';

class DatabaseIntegrationExample {
  constructor() {
    this.portfolio = new PortfolioService();
    this.dataWarehouse = new DataWarehouseService();
  }

  async setupServices() {
    const dbConfig = {
      database_url: process.env.DATABASE_URL,
      max_connections: "20",
      connection_timeout: "30",
      log_level: "debug"
    };

    await Promise.all([
      this.portfolio.initialize(dbConfig),
      this.dataWarehouse.initialize({
        ...dbConfig,
        warehouse_schema: "data_warehouse",
        etl_batch_size: "1000"
      })
    ]);

    console.log('Database services initialized');
  }

  async performDataOperations() {
    // Simulate data operations that would be implemented in the services
    console.log('Portfolio service info:', this.portfolio.getServiceInfo());
    console.log('Data warehouse info:', this.dataWarehouse.getServiceInfo());
    
    // Health checks
    const portfolioHealth = this.portfolio.healthCheck();
    const warehouseHealth = this.dataWarehouse.healthCheck();
    
    console.log('Services health check:', {
      portfolio: portfolioHealth,
      warehouse: warehouseHealth
    });
  }
}

// Usage
const dbExample = new DatabaseIntegrationExample();
dbExample.setupServices()
  .then(() => dbExample.performDataOperations())
  .catch(console.error);
```

## 🚀 Performance Examples

### Concurrent Operations

```javascript
// examples/performance/concurrent-operations.js
import { PortfolioService } from '@turbo-asset/portfolio-service';

class PerformanceExample {
  constructor() {
    this.service = new PortfolioService();
  }

  async initialize() {
    await this.service.initialize({
      database_url: process.env.DATABASE_URL,
      max_connections: "50", // Higher connection pool for concurrency
      log_level: "info"
    });
  }

  async benchmarkConcurrentOperations() {
    const concurrency = 100;
    const operations = Array.from({ length: concurrency }, (_, i) => i);

    console.log(`Starting ${concurrency} concurrent operations...`);
    const startTime = Date.now();

    try {
      // Simulate concurrent service operations
      const results = await Promise.all(
        operations.map(async (i) => {
          // In a real implementation, this would be actual service calls
          const health = this.service.healthCheck();
          const info = this.service.getServiceInfo();
          return { operation: i, health, info };
        })
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Completed ${results.length} operations in ${duration}ms`);
      console.log(`Average: ${(duration / results.length).toFixed(2)}ms per operation`);
      console.log(`Throughput: ${(results.length / (duration / 1000)).toFixed(2)} ops/sec`);

    } catch (error) {
      console.error('Benchmark error:', error);
    }
  }

  async memoryUsageTest() {
    console.log('Starting memory usage test...');
    
    const initialMemory = process.memoryUsage();
    console.log('Initial memory:', formatMemory(initialMemory));

    // Perform operations
    for (let i = 0; i < 1000; i++) {
      this.service.healthCheck();
      this.service.getServiceInfo();
    }

    const finalMemory = process.memoryUsage();
    console.log('Final memory:', formatMemory(finalMemory));
    
    const memoryIncrease = {
      rss: finalMemory.rss - initialMemory.rss,
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal
    };
    
    console.log('Memory increase:', formatMemory(memoryIncrease));
  }
}

function formatMemory(mem) {
  return {
    rss: `${Math.round(mem.rss / 1024 / 1024 * 100) / 100} MB`,
    heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100} MB`,
    heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100} MB`
  };
}

// Usage
const perfExample = new PerformanceExample();
perfExample.initialize()
  .then(() => perfExample.benchmarkConcurrentOperations())
  .then(() => perfExample.memoryUsageTest())
  .catch(console.error);
```

### Batch Processing Example

```javascript
// examples/performance/batch-processing.js
import { BulkDataService } from '@turbo-asset/bulk-data-service';

class BatchProcessingExample {
  constructor() {
    this.bulkService = new BulkDataService();
  }

  async initialize() {
    await this.bulkService.initialize({
      database_url: process.env.DATABASE_URL,
      batch_size: "1000",
      max_connections: "30",
      log_level: "info"
    });
  }

  async processBatchData() {
    // Generate sample data
    const sampleData = Array.from({ length: 10000 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
      value: Math.random() * 1000,
      timestamp: new Date().toISOString()
    }));

    console.log(`Processing ${sampleData.length} items in batches...`);
    const startTime = Date.now();

    try {
      // In a real implementation, this would process the data
      console.log('Bulk service info:', this.bulkService.getServiceInfo());
      console.log('Health check:', this.bulkService.healthCheck());

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Batch processing completed in ${duration}ms`);
      console.log(`Throughput: ${(sampleData.length / (duration / 1000)).toFixed(2)} items/sec`);

    } catch (error) {
      console.error('Batch processing error:', error);
    }
  }
}

// Usage
const batchExample = new BatchProcessingExample();
batchExample.initialize()
  .then(() => batchExample.processBatchData())
  .catch(console.error);
```

## 🧪 Testing Examples

### Unit Testing Example

```javascript
// examples/testing/unit-tests.js
import { describe, test, expect, beforeEach } from '@jest/globals';
import { PortfolioService } from '@turbo-asset/portfolio-service';

describe('PortfolioService Unit Tests', () => {
  let portfolioService;

  beforeEach(() => {
    portfolioService = new PortfolioService();
  });

  test('should create service instance', () => {
    expect(portfolioService).toBeInstanceOf(PortfolioService);
  });

  test('should return service info', () => {
    const info = portfolioService.getServiceInfo();
    
    expect(info).toHaveProperty('name');
    expect(info).toHaveProperty('version');
    expect(info).toHaveProperty('description');
    expect(info.name).toBe('portfolio-service');
  });

  test('should perform health check', () => {
    const health = portfolioService.healthCheck();
    expect(health).toBe('Service is healthy');
  });

  test('should initialize with valid config', async () => {
    const config = {
      database_url: 'postgres://test:test@localhost/test_db',
      log_level: 'info'
    };

    const result = await portfolioService.initialize(config);
    expect(result).toBe(true);
  });
});
```

### Integration Testing Example

```javascript
// examples/testing/integration-tests.js
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { PortfolioService } from '@turbo-asset/portfolio-service';
import { NotificationService } from '@turbo-asset/notification-service';

describe('Service Integration Tests', () => {
  let portfolioService;
  let notificationService;

  beforeAll(async () => {
    portfolioService = new PortfolioService();
    notificationService = new NotificationService();

    const baseConfig = {
      database_url: process.env.TEST_DATABASE_URL || 'postgres://test:test@localhost/test_db',
      log_level: 'debug'
    };

    await Promise.all([
      portfolioService.initialize(baseConfig),
      notificationService.initialize({
        ...baseConfig,
        smtp_host: 'localhost',
        smtp_port: '587'
      })
    ]);
  });

  test('should have both services healthy', () => {
    const portfolioHealth = portfolioService.healthCheck();
    const notificationHealth = notificationService.healthCheck();

    expect(portfolioHealth).toBe('Service is healthy');
    expect(notificationHealth).toBe('Service is healthy');
  });

  test('should get service information from both services', () => {
    const portfolioInfo = portfolioService.getServiceInfo();
    const notificationInfo = notificationService.getServiceInfo();

    expect(portfolioInfo.name).toBe('portfolio-service');
    expect(notificationInfo.name).toBe('notification-service');
  });
});
```

## 🏭 Production Examples

### Production Configuration

```javascript
// examples/production/production-config.js
import { PortfolioService } from '@turbo-asset/portfolio-service';
import { NotificationService } from '@turbo-asset/notification-service';
import { ReportingService } from '@turbo-asset/reporting-service';

class ProductionServiceManager {
  constructor() {
    this.services = new Map();
    this.healthCheckInterval = null;
  }

  async initializeServices() {
    const baseConfig = {
      database_url: process.env.DATABASE_URL,
      redis_url: process.env.REDIS_URL,
      log_level: process.env.LOG_LEVEL || 'info',
      max_connections: process.env.DB_MAX_CONNECTIONS || '20',
      connection_timeout: process.env.DB_CONNECTION_TIMEOUT || '30'
    };

    // Initialize core services
    const portfolio = new PortfolioService();
    const notifications = new NotificationService();
    const reporting = new ReportingService();

    try {
      await Promise.all([
        portfolio.initialize(baseConfig),
        notifications.initialize({
          ...baseConfig,
          smtp_host: process.env.SMTP_HOST,
          smtp_port: process.env.SMTP_PORT,
          smtp_user: process.env.SMTP_USER,
          smtp_pass: process.env.SMTP_PASS,
          smtp_secure: process.env.SMTP_SECURE
        }),
        reporting.initialize({
          ...baseConfig,
          report_storage_path: process.env.REPORT_STORAGE_PATH,
          temp_dir: process.env.TEMP_DIR
        })
      ]);

      this.services.set('portfolio', portfolio);
      this.services.set('notifications', notifications);
      this.services.set('reporting', reporting);

      console.log('All production services initialized successfully');
      this.startHealthChecks();

    } catch (error) {
      console.error('Service initialization failed:', error);
      throw error;
    }
  }

  startHealthChecks() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Check every 30 seconds
  }

  performHealthChecks() {
    const healthResults = {};

    for (const [name, service] of this.services) {
      try {
        const health = service.healthCheck();
        healthResults[name] = { status: 'healthy', message: health };
      } catch (error) {
        healthResults[name] = { status: 'unhealthy', error: error.message };
        console.error(`Health check failed for ${name}:`, error);
      }
    }

    console.log('Health check results:', healthResults);
    return healthResults;
  }

  async gracefulShutdown() {
    console.log('Starting graceful shutdown...');

    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Services don't have explicit shutdown methods in this basic implementation
    // In a real scenario, you would close database connections, etc.
    console.log('Graceful shutdown completed');
  }

  getServiceInfo() {
    const serviceInfo = {};
    for (const [name, service] of this.services) {
      serviceInfo[name] = service.getServiceInfo();
    }
    return serviceInfo;
  }
}

// Production setup
const serviceManager = new ProductionServiceManager();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, starting graceful shutdown');
  await serviceManager.gracefulShutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, starting graceful shutdown');
  await serviceManager.gracefulShutdown();
  process.exit(0);
});

// Initialize and start
serviceManager.initializeServices()
  .then(() => {
    console.log('Production services started successfully');
    console.log('Service info:', serviceManager.getServiceInfo());
  })
  .catch((error) => {
    console.error('Failed to start production services:', error);
    process.exit(1);
  });
```

### Docker Production Setup

```dockerfile
# examples/production/Dockerfile
FROM node:18-alpine

# Install Rust for NAPI-RS modules
RUN apk add --no-cache \
    curl \
    build-base \
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && source ~/.cargo/env

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/*/package*.json packages/*/
COPY packages/*/Cargo.toml packages/*/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build NAPI-RS modules
RUN npm run build:napi

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "
    const { PortfolioService } = require('@turbo-asset/portfolio-service');
    const service = new PortfolioService();
    try {
      const health = service.healthCheck();
      console.log('Health check:', health);
      process.exit(0);
    } catch (error) {
      console.error('Health check failed:', error);
      process.exit(1);
    }
  "

# Start application
CMD ["node", "examples/production/production-config.js"]
```

### Environment Configuration

```bash
# examples/production/.env.production
# Database Configuration
DATABASE_URL=postgres://user:password@db:5432/turbo_asset_prod
DB_MAX_CONNECTIONS=50
DB_CONNECTION_TIMEOUT=30

# Redis Configuration
REDIS_URL=redis://redis:6379

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=notifications@yourcompany.com
SMTP_PASS=your-app-password

# Logging
LOG_LEVEL=info

# File Storage
REPORT_STORAGE_PATH=/app/data/reports
TEMP_DIR=/app/tmp

# Application
NODE_ENV=production
PORT=3000
```

## 🚀 Running Examples

### Prerequisites

```bash
# Install dependencies
npm install

# Build NAPI-RS modules
npm run build:napi

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Running Individual Examples

```bash
# Basic usage examples
node examples/basic-usage/portfolio-basic.js
node examples/basic-usage/notification-basic.js

# Integration examples
node examples/integration/multi-service.js
node examples/integration/database-integration.js

# Performance examples
node examples/performance/concurrent-operations.js
node examples/performance/batch-processing.js

# Testing examples
npm test examples/testing/

# Production example
node examples/production/production-config.js
```

### Docker Examples

```bash
# Build Docker image
docker build -f examples/production/Dockerfile -t turbo-asset-services .

# Run container
docker run -p 3000:3000 --env-file examples/production/.env.production turbo-asset-services
```

## 📚 Additional Resources

- [Module Documentation](../modules/)
- [Development Guide](../development/module-development.md)
- [Contributing Guide](../development/contributing.md)
- [Production Deployment Guide](../../DEPLOYMENT-GUIDE.md)