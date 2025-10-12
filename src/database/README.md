# Database Module

## Sequelize Migration

This module contains the database configuration and utilities for the turbo-asset application, which has been migrated from Prisma to Sequelize.

### Files

- **`index.ts`** - Main database exports
- **`prisma-sequelize-adapter.ts`** - Compatibility layer for gradual migration

### Prisma-Sequelize Adapter

The `prisma-sequelize-adapter.ts` file provides a compatibility layer that mimics Prisma's API using Sequelize under the hood. This allows existing code to continue working during the migration period.

#### Usage

Instead of using Prisma directly:

```typescript
import { prisma } from '../config/database';

// This now uses the Sequelize adapter
const users = await prisma.user.findMany({
  where: { isActive: true },
  take: 10,
});
```

The adapter translates Prisma-like queries to Sequelize SQL queries automatically.

#### Supported Operations

- `findMany()` - Find multiple records
- `findFirst()` - Find first matching record
- `findUnique()` - Find by unique constraint
- `findByPk()` - Find by primary key
- `create()` - Create new record
- `update()` - Update single record
- `updateMany()` - Update multiple records
- `delete()` - Delete single record
- `deleteMany()` - Delete multiple records
- `count()` - Count records
- `$queryRaw()` - Execute raw SQL
- `$transaction()` - Execute transaction

#### Limitations

- **No automatic joins**: Prisma's `include` option is not fully supported
- **Limited operators**: Only basic where operators are supported
- **Performance**: Raw SQL queries may not be as optimized as proper Sequelize models
- **Type safety**: Less type-safe than native Sequelize or Prisma

#### Migration Path

This adapter is a **temporary solution**. The recommended migration path is:

1. ✅ Use adapter for backward compatibility (current state)
2. ⏳ Define proper Sequelize models (see `SEQUELIZE_MIGRATION_GUIDE.md`)
3. ⏳ Gradually replace adapter usage with native Sequelize models
4. ⏳ Remove adapter once all code is migrated

### Native Sequelize Usage

For new code or migrated code, use Sequelize directly:

```typescript
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

// Raw query
const users = await sequelize.query(
  'SELECT * FROM users WHERE is_active = ?',
  {
    replacements: [true],
    type: QueryTypes.SELECT,
  }
);

// With models (once defined)
import { User } from '../models/User';
const users = await User.findAll({
  where: { isActive: true },
  limit: 10,
});
```

### Configuration

Database connection is configured in:
- `src/config/database.ts` - Main configuration
- `src/core/config/database.ts` - Core configuration

Connection pooling settings:
- Max connections: 20
- Min connections: 5
- Acquire timeout: 60s
- Idle timeout: 10s

### Environment Variables

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `DATABASE_SSL` - Enable SSL (optional, default: false)
- `NODE_ENV` - Environment (development/production)

Example:
```
DATABASE_URL=postgresql://user:password@localhost:5432/turbo_asset
DATABASE_SSL=false
NODE_ENV=development
```

### Health Checks

Database health is monitored through:
- `src/middleware/health.ts`
- `src/core/middleware/health.ts`
- `src/core/health/health-controller.ts`

Health check endpoints:
- `/health` - Comprehensive health check
- `/ready` - Readiness probe (K8s)
- `/live` - Liveness probe (K8s)

### See Also

- `SEQUELIZE_MIGRATION_GUIDE.md` - Complete migration guide
- Sequelize documentation: https://sequelize.org/
- sequelize-typescript: https://github.com/sequelize/sequelize-typescript
