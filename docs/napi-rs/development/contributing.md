# Contributing to NAPI-RS Modules

Thank you for contributing to the Turbo Asset NAPI-RS modules! This guide will help you get started with contributing to our high-performance Rust-based services.

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** - For JavaScript runtime and npm packages
- **Rust 1.70+** - For NAPI-RS module development
- **PostgreSQL 13+** - For database integration testing
- **Redis 6+** - For caching and session storage (optional)
- **Git** - For version control

### Development Environment Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/harborgrid-justin/turbo-asset.git
   cd turbo-asset
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Install Rust Toolchain**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup update stable
   ```

4. **Setup Database (for integration tests)**
   ```bash
   # Using Docker
   docker run --name turbo-asset-postgres \
     -e POSTGRES_PASSWORD=password \
     -e POSTGRES_DB=turbo_asset_dev \
     -p 5432:5432 -d postgres:13

   # Using local PostgreSQL
   createdb turbo_asset_dev
   ```

5. **Setup Redis (optional)**
   ```bash
   # Using Docker
   docker run --name turbo-asset-redis -p 6379:6379 -d redis:6-alpine
   ```

6. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your database and configuration settings
   ```

## 🏗️ Development Workflow

### 1. Building Modules

```bash
# Build all NAPI-RS modules
npm run build:napi

# Build specific module
cd packages/portfolio-service
npm run build

# Development build (faster, includes debug symbols)
npm run build:debug
```

### 2. Running Tests

```bash
# Run all tests
npm run test:napi

# Run specific module tests
cd packages/portfolio-service
npm test

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

### 3. Code Quality

```bash
# Lint TypeScript/JavaScript
npm run lint

# Format code
npm run format

# Rust formatting
cargo fmt --all

# Rust linting
cargo clippy --all-targets --all-features
```

## 📝 Contribution Guidelines

### Code Style

#### Rust Code Style

Follow standard Rust conventions:

```rust
// Use snake_case for functions and variables
pub fn calculate_portfolio_metrics() -> Result<Metrics> {
    // Implementation
}

// Use PascalCase for types and structs
#[napi(object)]
pub struct PortfolioMetrics {
    pub total_value: f64,
    pub return_rate: f64,
}

// Use SCREAMING_SNAKE_CASE for constants
const DEFAULT_TIMEOUT: u64 = 30;

// Document public APIs
/// Calculates portfolio performance metrics
/// 
/// # Arguments
/// * `portfolio_id` - The unique identifier for the portfolio
/// * `date_range` - The date range for calculation
/// 
/// # Returns
/// Portfolio metrics including returns, volatility, and Sharpe ratio
#[napi]
pub fn calculate_metrics(
    portfolio_id: String,
    date_range: DateRange,
) -> Result<PortfolioMetrics> {
    // Implementation
}
```

#### TypeScript/JavaScript Code Style

Follow the established ESLint configuration:

```typescript
// Use camelCase for variables and functions
const portfolioService = new PortfolioService();

// Use PascalCase for types and interfaces
interface PortfolioMetrics {
  totalValue: number;
  returnRate: number;
}

// Use descriptive names
const calculatePortfolioMetrics = async (
  portfolioId: string,
  dateRange: DateRange
): Promise<PortfolioMetrics> => {
  // Implementation
};
```

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): description

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(portfolio-service): add risk assessment calculation

Implements VaR and CVaR calculations for portfolio risk assessment.
Includes support for Monte Carlo simulation and historical simulation methods.

Closes #123
```

```
fix(notification-service): resolve memory leak in email queue

The email queue was not properly releasing message objects after processing,
causing memory usage to grow over time.

Fixes #456
```

### Pull Request Process

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/portfolio-risk-metrics
   ```

2. **Make Your Changes**
   - Follow coding standards
   - Add/update tests
   - Update documentation
   - Ensure all tests pass

3. **Test Your Changes**
   ```bash
   # Run comprehensive tests
   npm run build:napi
   npm run test:napi
   npm run lint
   ```

4. **Create Pull Request**
   - Use descriptive title and description
   - Reference related issues
   - Include testing instructions
   - Add screenshots for UI changes

5. **Code Review Process**
   - Address review feedback
   - Keep changes focused and atomic
   - Maintain clean commit history

## 🧪 Testing Standards

### Unit Tests

Write comprehensive unit tests for all public APIs:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tokio::test;

    #[test]
    async fn test_portfolio_metrics_calculation() {
        let service = PortfolioService::new();
        let config = test_config();
        
        service.initialize(config).await.unwrap();
        
        let metrics = service.calculate_metrics(
            "portfolio-123".to_string(),
            DateRange::last_30_days()
        ).await.unwrap();
        
        assert!(metrics.total_value > 0.0);
        assert!(metrics.return_rate >= -1.0 && metrics.return_rate <= 1.0);
    }

    fn test_config() -> HashMap<String, String> {
        HashMap::from([
            ("database_url".to_string(), "postgres://test".to_string()),
        ])
    }
}
```

### Integration Tests

Test module integration with real systems:

```javascript
// test/integration/portfolio-service.integration.test.js
import { PortfolioService } from '@turbo-asset/portfolio-service';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/database.js';

describe('PortfolioService Integration', () => {
  let service;
  let testDb;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    service = new PortfolioService();
    
    await service.initialize({
      database_url: testDb.connectionString,
      log_level: 'debug'
    });
  });

  afterAll(async () => {
    await teardownTestDatabase(testDb);
  });

  test('should calculate real portfolio metrics', async () => {
    // Insert test data
    await testDb.query(`
      INSERT INTO portfolios (id, name, created_at) 
      VALUES ('test-portfolio', 'Test Portfolio', NOW())
    `);

    const metrics = await service.calculateMetrics('test-portfolio', {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    });

    expect(metrics.totalValue).toBeGreaterThan(0);
  });
});
```

### Performance Tests

Include performance benchmarks for critical operations:

```javascript
// test/performance/portfolio-service.bench.test.js
import { PortfolioService } from '@turbo-asset/portfolio-service';

describe('PortfolioService Performance', () => {
  let service;

  beforeAll(async () => {
    service = new PortfolioService();
    await service.initialize(testConfig);
  });

  test('should handle 1000 concurrent calculations', async () => {
    const startTime = Date.now();
    
    const promises = Array.from({ length: 1000 }, (_, i) => 
      service.calculateMetrics(`portfolio-${i}`, dateRange)
    );
    
    const results = await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(results).toHaveLength(1000);
    expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
  });
});
```

## 📖 Documentation Standards

### Code Documentation

Document all public APIs with clear descriptions:

```rust
/// Portfolio analytics and performance tracking service
/// 
/// Provides comprehensive portfolio analysis including:
/// - Performance metrics calculation
/// - Risk assessment (VaR, CVaR)
/// - Benchmark comparison
/// - Attribution analysis
/// 
/// # Example
/// 
/// ```rust
/// let service = PortfolioService::new();
/// service.initialize(config).await?;
/// 
/// let metrics = service.calculate_metrics("portfolio-123", date_range).await?;
/// println!("Portfolio return: {:.2}%", metrics.return_rate * 100.0);
/// ```
#[napi]
pub struct PortfolioService {
    // Internal state
}
```

### API Documentation

Update module documentation when adding new features:

```markdown
##### calculateRiskMetrics(portfolioId: string, options: RiskOptions): Promise<RiskMetrics>

Calculates comprehensive risk metrics for a portfolio.

**Parameters:**
- `portfolioId` - Unique identifier for the portfolio
- `options` - Risk calculation options

**Options:**
```typescript
interface RiskOptions {
  method: 'historical' | 'monte-carlo' | 'parametric';
  confidenceLevel: number; // 0.90, 0.95, 0.99
  timeHorizon: number; // Days
  simulations?: number; // For Monte Carlo method
}
```

**Returns:** Promise resolving to risk metrics

**Example:**
```javascript
const riskMetrics = await portfolioService.calculateRiskMetrics('portfolio-123', {
  method: 'monte-carlo',
  confidenceLevel: 0.95,
  timeHorizon: 10,
  simulations: 10000
});

console.log(`VaR (95%): ${riskMetrics.valueAtRisk}`);
console.log(`CVaR (95%): ${riskMetrics.conditionalValueAtRisk}`);
```
```

### README Updates

Update module READMEs when adding significant features:

1. Update feature lists
2. Add new usage examples
3. Document configuration changes
4. Update performance benchmarks

## 🔧 Module Architecture

### Standard Module Structure

All modules should follow this pattern:

```rust
// Base structures (consistent across all modules)
pub struct BaseEntity { /* ... */ }
pub struct StandardResponse<T> { /* ... */ }
pub struct ErrorResponse { /* ... */ }
pub struct ResponseMetadata { /* ... */ }

// Service-specific types
pub struct ServiceSpecificType { /* ... */ }

// Main service implementation
#[napi]
pub struct ServiceName {
    // Internal state
}

#[napi]
impl ServiceName {
    #[napi(constructor)]
    pub fn new() -> Self { /* ... */ }

    #[napi]
    pub async fn initialize(&self, config: HashMap<String, String>) -> Result<bool> { /* ... */ }

    #[napi]
    pub fn health_check(&self) -> Result<String> { /* ... */ }

    #[napi]
    pub fn get_service_info(&self) -> Result<HashMap<String, String>> { /* ... */ }

    // Service-specific methods
}

// Module initialization
#[napi]
pub fn init() -> Result<String> { /* ... */ }
```

### Error Handling

Implement comprehensive error handling:

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ServiceError {
    #[error("Database connection failed: {0}")]
    DatabaseError(String),
    
    #[error("Invalid configuration: {field}")]
    ConfigError { field: String },
    
    #[error("Operation timeout after {seconds} seconds")]
    TimeoutError { seconds: u64 },
    
    #[error("Validation failed: {message}")]
    ValidationError { message: String },
}

impl From<ServiceError> for napi::Error {
    fn from(err: ServiceError) -> Self {
        match err {
            ServiceError::DatabaseError(_) => {
                napi::Error::new(napi::Status::GenericFailure, err.to_string())
            }
            ServiceError::ConfigError { .. } => {
                napi::Error::new(napi::Status::InvalidArg, err.to_string())
            }
            ServiceError::TimeoutError { .. } => {
                napi::Error::new(napi::Status::TimedOut, err.to_string())
            }
            ServiceError::ValidationError { .. } => {
                napi::Error::new(napi::Status::InvalidArg, err.to_string())
            }
        }
    }
}
```

### Configuration Management

Standardize configuration handling:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ServiceConfig {
    pub database_url: String,
    pub redis_url: Option<String>,
    pub log_level: LogLevel,
    pub max_connections: u32,
    pub connection_timeout: u64,
    pub cache_ttl: u64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

impl ServiceConfig {
    pub fn from_hashmap(config: HashMap<String, String>) -> Result<Self, ServiceError> {
        let database_url = config.get("database_url")
            .ok_or_else(|| ServiceError::ConfigError { 
                field: "database_url".to_string() 
            })?
            .clone();

        let log_level = config.get("log_level")
            .map(|s| s.parse().unwrap_or(LogLevel::Info))
            .unwrap_or(LogLevel::Info);

        Ok(Self {
            database_url,
            redis_url: config.get("redis_url").cloned(),
            log_level,
            max_connections: config.get("max_connections")
                .and_then(|s| s.parse().ok())
                .unwrap_or(10),
            connection_timeout: config.get("connection_timeout")
                .and_then(|s| s.parse().ok())
                .unwrap_or(30),
            cache_ttl: config.get("cache_ttl")
                .and_then(|s| s.parse().ok())
                .unwrap_or(3600),
        })
    }
}
```

## 🚀 Performance Guidelines

### Memory Management

- Use `Arc<T>` for shared data across async tasks
- Use `RwLock<T>` for concurrent read/write access
- Avoid unnecessary cloning of large data structures
- Use connection pooling for database operations

### Async Best Practices

- Use `tokio::spawn` for CPU-intensive tasks
- Implement proper cancellation handling
- Use `tokio::select!` for timeout handling
- Avoid blocking operations in async contexts

### Database Operations

- Use prepared statements for repeated queries
- Implement proper connection pooling
- Use transactions for related operations
- Add proper indexes for query performance

## 🐛 Debugging and Troubleshooting

### Logging

Use structured logging with context:

```rust
use tracing::{info, warn, error, debug, instrument};

#[napi]
impl PortfolioService {
    #[napi]
    #[instrument(skip(self), fields(portfolio_id = %portfolio_id))]
    pub async fn calculate_metrics(
        &self,
        portfolio_id: String,
        date_range: DateRange,
    ) -> Result<PortfolioMetrics> {
        info!("Starting metrics calculation");
        
        debug!(
            start_date = %date_range.start,
            end_date = %date_range.end,
            "Date range for calculation"
        );

        // Implementation...

        info!(
            total_value = metrics.total_value,
            return_rate = metrics.return_rate,
            "Metrics calculation completed"
        );

        Ok(metrics)
    }
}
```

### Error Context

Provide meaningful error context:

```rust
use anyhow::{Context, Result};

pub async fn fetch_portfolio_data(id: &str) -> Result<PortfolioData> {
    let data = database_query(id)
        .await
        .with_context(|| format!("Failed to fetch portfolio data for ID: {}", id))?;
    
    validate_portfolio_data(&data)
        .with_context(|| "Portfolio data validation failed")?;
    
    Ok(data)
}
```

## 🔒 Security Guidelines

### Input Validation

Always validate inputs:

```rust
#[napi]
pub fn create_portfolio(
    &self,
    name: String,
    initial_value: f64,
) -> Result<String> {
    // Validate inputs
    if name.trim().is_empty() {
        return Err(ServiceError::ValidationError {
            message: "Portfolio name cannot be empty".to_string()
        }.into());
    }

    if initial_value < 0.0 {
        return Err(ServiceError::ValidationError {
            message: "Initial value must be non-negative".to_string()
        }.into());
    }

    // Implementation...
}
```

### SQL Injection Prevention

Use parameterized queries:

```rust
// Good: Parameterized query
let result = sqlx::query!(
    "SELECT * FROM portfolios WHERE organization_id = $1 AND status = $2",
    organization_id,
    status
)
.fetch_all(&self.pool)
.await?;

// Bad: String concatenation (vulnerable to SQL injection)
// let query = format!("SELECT * FROM portfolios WHERE id = '{}'", portfolio_id);
```

### Sensitive Data Handling

- Never log sensitive data (passwords, tokens, PII)
- Use secure random generation for IDs and tokens
- Implement proper access controls
- Follow data retention policies

## 🎯 Release Process

### Version Management

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

1. **Pre-release**
   - [ ] All tests passing
   - [ ] Documentation updated
   - [ ] CHANGELOG.md updated
   - [ ] Version bumped
   - [ ] Performance benchmarks run

2. **Release**
   - [ ] Create release branch
   - [ ] Final testing
   - [ ] Tag release
   - [ ] Publish packages
   - [ ] Update documentation

3. **Post-release**
   - [ ] Monitor for issues
   - [ ] Update dependent projects
   - [ ] Announce release

## 🤝 Community

### Getting Help

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Documentation**: Check the comprehensive docs
- **Code Review**: Learn from peer review process

### Code of Conduct

We follow the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/). Be respectful, inclusive, and collaborative.

## 📚 Additional Resources

- [NAPI-RS Documentation](https://napi.rs/)
- [Rust Performance Book](https://nnethercote.github.io/perf-book/)
- [Tokio Tutorial](https://tokio.rs/tokio/tutorial)
- [SQLx Documentation](https://docs.rs/sqlx/)
- [Conventional Commits](https://www.conventionalcommits.org/)

Thank you for contributing to Turbo Asset! 🚀