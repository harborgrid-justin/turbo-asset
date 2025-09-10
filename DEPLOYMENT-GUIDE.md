# NAPI-RS Deployment Guide

## Overview
This guide covers the deployment of all 40 NAPI-RS packages in the Turbo Asset IWMS platform, providing a complete enterprise solution with high-performance Rust backend services.

## Pre-Deployment Health Check

Always run the health check before deployment:

```bash
npm run napi:health
```

This verifies:
- All 40 packages are properly structured
- NAPI integration is configured correctly
- Business logic integration is functional
- Documentation is up to date

## Quick Start Deployment

### 1. Environment Setup

```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install NAPI-RS CLI
npm install -g @napi-rs/cli

# Install project dependencies
npm install
```

### 2. Build All NAPI Packages

```bash
# Build all 40 packages for production
npm run napi:build:all

# Or build for specific platforms
npm run build:napi -- --platform linux-x64 --release
npm run build:napi -- --platform darwin-x64 --release
npm run build:napi -- --platform win32-x64 --release
```

### 3. Initialize Services

```bash
# Start the application with NAPI services
ENABLE_NAPI_SERVICES=true npm start
```

## Detailed Deployment

### Platform-Specific Builds

#### Linux Production
```bash
# For Linux servers
npm run build:napi -- --platform x86_64-unknown-linux-gnu --release
npm run build:napi -- --platform aarch64-unknown-linux-gnu --release
```

#### macOS (Development)
```bash
# For macOS development
npm run build:napi -- --platform x86_64-apple-darwin --release
npm run build:napi -- --platform aarch64-apple-darwin --release
```

#### Windows
```bash
# For Windows deployment
npm run build:napi -- --platform x86_64-pc-windows-msvc --release
npm run build:napi -- --platform aarch64-pc-windows-msvc --release
```

### Docker Deployment

#### Multi-Stage Dockerfile
```dockerfile
# Multi-stage build for all 40 NAPI services
FROM node:18-alpine AS rust-builder

# Install Rust and build tools
RUN apk add --no-cache curl gcc musl-dev
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install NAPI-RS CLI
RUN npm install -g @napi-rs/cli

WORKDIR /app
COPY packages/ ./packages/
COPY package.json package-lock.json ./

# Build all NAPI packages
RUN npm ci
RUN npm run napi:build:all

FROM node:18-alpine AS app-builder

WORKDIR /app
COPY . .
RUN npm ci --production
RUN npm run build

FROM node:18-alpine AS runtime

WORKDIR /app

# Copy built NAPI packages
COPY --from=rust-builder /app/packages/ ./packages/

# Copy built application
COPY --from=app-builder /app/dist ./dist
COPY --from=app-builder /app/node_modules ./node_modules
COPY --from=app-builder /app/package.json ./

# Environment configuration
ENV NODE_ENV=production
ENV ENABLE_NAPI_SERVICES=true

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/napi/health || exit 1

CMD ["npm", "start"]
```

#### Build and Run Docker Container
```bash
# Build the container
docker build -t turbo-asset-napi:latest .

# Run with NAPI services enabled
docker run -d \
  --name turbo-asset \
  -p 3000:3000 \
  -e ENABLE_NAPI_SERVICES=true \
  -e DATABASE_URL="postgresql://user:pass@db:5432/turbo_asset" \
  -e REDIS_URL="redis://redis:6379" \
  turbo-asset-napi:latest
```

### Kubernetes Deployment

#### Deployment YAML
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: turbo-asset-napi
  labels:
    app: turbo-asset
    version: napi-40-services
spec:
  replicas: 3
  selector:
    matchLabels:
      app: turbo-asset
  template:
    metadata:
      labels:
        app: turbo-asset
    spec:
      containers:
      - name: turbo-asset
        image: turbo-asset-napi:latest
        ports:
        - containerPort: 3000
        env:
        - name: ENABLE_NAPI_SERVICES
          value: "true"
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: turbo-asset-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: turbo-asset-secrets
              key: redis-url
        resources:
          limits:
            memory: "2Gi"
            cpu: "1000m"
          requests:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /napi/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /napi/health
            port: 3000
          initialDelaySeconds: 15
          periodSeconds: 15
---
apiVersion: v1
kind: Service
metadata:
  name: turbo-asset-service
spec:
  selector:
    app: turbo-asset
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Configuration

### Environment Variables

```bash
# Core Configuration
ENABLE_NAPI_SERVICES=true
NODE_ENV=production
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/turbo_asset
REDIS_URL=redis://localhost:6379

# NAPI Service Configuration
NAPI_WORKER_THREADS=4
NAPI_MEMORY_LIMIT=512MB
NAPI_ENABLE_METRICS=true
NAPI_ENABLE_HEALTH_CHECKS=true

# Service-Specific Settings
ASSET_LIFECYCLE_CACHE_TTL=300
NOTIFICATION_BATCH_SIZE=1000
BULK_DATA_CHUNK_SIZE=10000
BUSINESS_INTELLIGENCE_ML_ENABLED=true
ADVANCED_INTELLIGENCE_GPU_ENABLED=false

# Performance Tuning
WORKFLOW_MAX_CONCURRENT_PROCESSES=50
API_MANAGEMENT_RATE_LIMIT=1000
CALENDAR_INTEGRATION_SYNC_INTERVAL=300
```

### Performance Tuning

#### High-Traffic Configuration
```bash
# For high-traffic environments
NAPI_WORKER_THREADS=8
NOTIFICATION_BATCH_SIZE=5000
BULK_DATA_CHUNK_SIZE=50000
API_MANAGEMENT_RATE_LIMIT=10000

# Memory optimization
NAPI_MEMORY_LIMIT=1GB
NODE_OPTIONS="--max-old-space-size=2048"
```

#### Resource-Constrained Configuration
```bash
# For resource-constrained environments
NAPI_WORKER_THREADS=2
NOTIFICATION_BATCH_SIZE=100
BULK_DATA_CHUNK_SIZE=1000
NAPI_MEMORY_LIMIT=256MB
```

## Monitoring and Health Checks

### Health Endpoints

```bash
# Overall system health
curl http://localhost:3000/health

# NAPI services health
curl http://localhost:3000/napi/health

# Individual service health
curl http://localhost:3000/napi/health/asset-lifecycle
curl http://localhost:3000/napi/health/advanced-intelligence
curl http://localhost:3000/napi/health/business-intelligence
```

### Metrics Collection

```bash
# Service metrics
curl http://localhost:3000/napi/metrics

# Business logic integration metrics
curl http://localhost:3000/napi/integration/metrics

# Performance metrics
curl http://localhost:3000/napi/performance
```

### Monitoring Integration

#### Prometheus Configuration
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'turbo-asset-napi'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/napi/metrics'
    scrape_interval: 30s
```

#### Grafana Dashboard
Key metrics to monitor:
- NAPI service response times
- Memory usage per service
- Error rates and fallback frequency
- Business logic bridge health
- Throughput per service domain

## Troubleshooting

### Common Issues

#### NAPI Service Failed to Load
```bash
# Check service health
npm run napi:health

# Rebuild packages
npm run napi:build:all

# Check logs
DEBUG=napi:* npm start
```

#### TypeScript Fallback Not Working
```bash
# Verify business logic integration
npm run integration:test

# Check bridge configuration
curl http://localhost:3000/napi/integration/bridges
```

#### Performance Issues
```bash
# Monitor service metrics
curl http://localhost:3000/napi/metrics | jq

# Adjust worker threads
export NAPI_WORKER_THREADS=8

# Enable performance monitoring
export NAPI_ENABLE_METRICS=true
```

### Log Analysis

#### Enable Debug Logging
```bash
# Enable all NAPI debugging
DEBUG=napi:*,business-logic:* npm start

# Service-specific debugging
DEBUG=napi:asset-lifecycle,napi:notification npm start

# Performance debugging
DEBUG=napi:performance,napi:metrics npm start
```

## Security Considerations

### Production Security
```bash
# Disable debug endpoints in production
NODE_ENV=production

# Enable secure headers
ENABLE_SECURITY_HEADERS=true

# Configure API rate limiting
API_RATE_LIMIT=1000
API_RATE_WINDOW=3600000

# Enable request logging
ENABLE_REQUEST_LOGGING=true
```

### Service Isolation
- Each NAPI service runs in isolated memory space
- Automatic fallback prevents service failures from affecting others
- Health checks ensure rapid failure detection
- Circuit breaker pattern prevents cascade failures

## Rollback Procedures

### NAPI Service Rollback
```bash
# Disable NAPI services (fallback to TypeScript)
export ENABLE_NAPI_SERVICES=false
npm restart

# Selective service rollback
export DISABLE_NAPI_SERVICES="asset-lifecycle,notification"
npm restart
```

### Full Rollback
```bash
# Revert to TypeScript-only deployment
git checkout previous-stable-commit
npm install
npm run build
npm start
```

## Performance Benchmarks

### Expected Performance Gains
- **Asset Lifecycle Calculations**: 50-100x faster
- **Bulk Data Processing**: 10-20x faster
- **Advanced Intelligence**: 20-50x faster
- **API Management**: 5-10x faster
- **Financial Calculations**: 30-80x faster

### Load Testing
```bash
# Install load testing tools
npm install -g artillery

# Run load tests
artillery run load-tests/napi-services.yml
artillery run load-tests/business-logic-integration.yml
```

## Maintenance

### Regular Maintenance Tasks
```bash
# Weekly health check
npm run napi:health

# Monthly package updates
npm update
npm run napi:build:all

# Quarterly performance review
npm run integration:test
npm run performance:benchmark
```

### Backup and Recovery
- Database backups include NAPI service configurations
- Service metrics are preserved in time-series database
- Business logic bridge configurations are version controlled

This deployment guide ensures successful deployment and operation of all 40 NAPI-RS services with comprehensive monitoring, troubleshooting, and maintenance procedures.