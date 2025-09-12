# Centralized Mock Data Provider

## Overview

The Turbo Asset application now uses a centralized mock data provider instead of scattered hardcoded data throughout the codebase. This provides better maintainability, consistency, and configurability.

## Architecture

### Core Components

1. **MockDataProvider.js** - Main JavaScript implementation for CommonJS compatibility
2. **MockDataProvider.ts** - TypeScript version with type definitions
3. **FrontendAPIService.ts** - Frontend service for API calls instead of hardcoded data

### Key Features

- **Centralized Data Generation**: All mock data is generated from a single source
- **Configurable via Environment Variables**: Data counts and behavior can be controlled
- **Consistent Data Structures**: Same data structure used across all services
- **Frontend Integration**: Frontend components now call APIs instead of using hardcoded data

## Configuration

All mock data behavior can be controlled through environment variables:

```bash
# Asset and Work Order counts
MOCK_ASSET_COUNT=100
MOCK_WORK_ORDER_COUNT=50

# Space and maintenance data
MOCK_SPACE_COUNT=50
MOCK_MAINTENANCE_COUNT=200

# System audit data
MOCK_AUDIT_ENTRY_COUNT=20

# Business Intelligence defaults
MOCK_BI_DEFAULT_RECORDS=100

# System behavior
MOCK_ENABLE_RANDOMIZATION=true
MOCK_SEED=12345
MOCK_TOTAL_COST=$487,650
```

## Files Updated

### Backend Services
- `demo-server.js` - Updated to use centralized provider
- `simple-backend.js` - Updated to use centralized provider  
- `src/services/BusinessIntelligenceService.ts` - Removed hardcoded mock methods
- `src/services/portfolio/BusinessIntelligenceService.ts` - Removed hardcoded mock methods

### Configuration
- `src/config/index.ts` - Added mock data configuration section

### Frontend
- `frontend/src/app/asset-search/page.tsx` - Updated to use API calls
- `frontend/src/services/FrontendAPIService.ts` - New centralized frontend API service

## Benefits

1. **Maintainability**: Single place to update mock data logic
2. **Consistency**: Same data structure and generation logic everywhere
3. **Configurability**: Easy to adjust data volumes and behavior for different environments
4. **Testing**: Predictable data generation with seed control
5. **Development**: Easy to switch between different data scenarios

## Usage Examples

### For Development (Small Dataset)
```bash
MOCK_ASSET_COUNT=10 MOCK_WORK_ORDER_COUNT=5 node demo-server.js
```

### For Testing (Predictable Data)
```bash
MOCK_ENABLE_RANDOMIZATION=false MOCK_SEED=12345 node demo-server.js
```

### For Demo (Large Dataset)
```bash
MOCK_ASSET_COUNT=500 MOCK_WORK_ORDER_COUNT=200 node demo-server.js
```

## Migration Summary

- **Before**: Mock data scattered across 6+ files with inconsistent structures
- **After**: Single centralized provider with consistent data structures and full configuration control
- **Impact**: ~400 lines of duplicate code removed, configuration flexibility added