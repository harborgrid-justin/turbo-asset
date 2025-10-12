# Sequelize Migration Guide

## Overview

This document outlines the migration from Prisma ORM to Sequelize ORM. The core database infrastructure has been updated, but application-level code (controllers, services, resolvers) requires additional migration work.

## What Has Been Completed

### ✅ Core Infrastructure Updates

1. **Database Configuration**
   - `src/config/database.ts` - Sequelize connection with pooling
   - `src/core/config/database.ts` - Sequelize connection with pooling
   - Backward compatibility alias: `prisma` now points to `sequelize`

2. **Connection Management**
   - `src/core/database/connection-manager.ts` - Updated to use Sequelize
   - Connection pooling configured
   - Health checks using Sequelize queries
   - Automatic retry logic maintained

3. **Health Checks**
   - `src/middleware/health.ts` - Uses Sequelize queries
   - `src/core/middleware/health.ts` - Uses Sequelize queries
   - `src/core/health/health-controller.ts` - Uses Sequelize queries

4. **Database Index & Exports**
   - `src/database/index.ts` - Exports both `sequelize` and `prisma` (alias)
   - `src/core/index.ts` - Exports updated

## What Needs Migration

### ⚠️ Application-Level Code (162 files)

The following types of files still reference Prisma and need migration:

#### Controllers (20+ files)
- `src/api/controllers/*.ts`
- `src/controllers/*.ts`

Example: `src/controllers/SpaceBookingController.ts`
```typescript
// OLD (Prisma)
const bookings = await prisma.spaceBooking.findMany({
  where: { spaceId },
  include: { space: true }
});

// NEW (Sequelize) - Requires model definition
const bookings = await SpaceBooking.findAll({
  where: { spaceId },
  include: [{ model: Space }]
});
```

#### Services (120+ files)
- `src/services/*.ts`
- `src/services/**/*.ts`

Example patterns that need updating:
```typescript
// Prisma patterns that need conversion:
prisma.model.findUnique()    → Model.findByPk()
prisma.model.findMany()      → Model.findAll()
prisma.model.findFirst()     → Model.findOne()
prisma.model.create()        → Model.create()
prisma.model.update()        → Model.update()
prisma.model.delete()        → Model.destroy()
prisma.$queryRaw`...`        → sequelize.query('...', { type: QueryTypes.RAW })
prisma.$transaction()        → sequelize.transaction()
```

#### GraphQL Resolvers
- `src/graphql/resolvers.ts` - Extensively uses Prisma model API

### 📋 Required Next Steps

1. **Define Sequelize Models**
   - Create model definitions for all entities
   - Location: `src/models/` (needs to be created)
   - Use `sequelize-typescript` for decorator-based models or
   - Use `sequelize.define()` for plain models

2. **Update Import Statements**
   ```typescript
   // Change from:
   import { prisma } from '@/config/database';
   
   // To:
   import { sequelize } from '@/config/database';
   import { User, Property, Asset } from '@/models';
   ```

3. **Update Query Patterns**
   - Replace Prisma fluent API with Sequelize methods
   - Update include/select patterns
   - Update where clause syntax
   - Update transaction patterns

4. **Update Scripts**
   - Remove Prisma-specific npm scripts from `package.json`:
     - `db:generate`, `db:migrate`, `db:studio`
   - Add Sequelize CLI scripts if needed

5. **Remove Prisma Dependencies**
   ```bash
   npm uninstall @prisma/client prisma
   ```

## Migration Strategy

### Option 1: Model-by-Model Migration (Recommended)
1. Create Sequelize models incrementally
2. Update one service/controller at a time
3. Test each migration thoroughly
4. Gradually remove Prisma usage

### Option 2: Raw SQL Temporary Solution
For immediate compatibility without model definitions:
```typescript
import { sequelize } from '@/config/database';
import { QueryTypes } from 'sequelize';

// Use raw queries
const users = await sequelize.query(
  'SELECT * FROM users WHERE email = ?',
  {
    replacements: [email],
    type: QueryTypes.SELECT
  }
);
```

### Option 3: Create Model Definitions First
1. Generate all Sequelize models from schema
2. Test model definitions
3. Update all code to use models
4. Deploy in one release

## Example Model Definition

Using `sequelize-typescript`:

```typescript
// src/models/User.ts
import { Table, Column, Model, DataType, HasMany, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { Organization } from './Organization';
import { Property } from './Property';

@Table({
  tableName: 'users',
  timestamps: true,
})
export class User extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string;

  @ForeignKey(() => Organization)
  @Column(DataType.UUID)
  organizationId!: string;

  @BelongsTo(() => Organization)
  organization!: Organization;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isActive!: boolean;
}
```

## Configuration Updates

Update Sequelize initialization to register models:

```typescript
// src/config/database.ts
import { Sequelize } from 'sequelize-typescript';

export const sequelize = new Sequelize({
  dialect: 'postgres',
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  models: [__dirname + '/../models'], // Auto-discover models
  pool: {
    max: 20,
    min: 5,
    acquire: 60000,
    idle: 10000,
  },
});
```

## Testing Strategy

1. **Unit Tests**: Update to use Sequelize test utilities
2. **Integration Tests**: Test database operations
3. **E2E Tests**: Validate full workflows
4. **Load Tests**: Ensure performance is maintained

## Rollback Plan

If issues arise:
1. Revert to Prisma configuration
2. Restore Prisma imports
3. Use git to revert changes: `git revert <commit-hash>`

## Benefits of Sequelize

- More flexible raw SQL support
- Better TypeScript support with sequelize-typescript
- More control over query optimization
- Established ORM with large community
- Better support for complex queries and joins

## Challenges

- Different API requires code changes across 162 files
- Need to define all models manually or generate them
- Different transaction handling patterns
- Learning curve for team members familiar with Prisma

## Timeline Estimate

- Model definitions: 2-3 days
- Controller/Service updates: 5-7 days
- Testing and validation: 2-3 days
- **Total**: ~10-13 days for complete migration

## Support

For questions or issues during migration:
- Review Sequelize documentation: https://sequelize.org/
- Check sequelize-typescript: https://github.com/sequelize/sequelize-typescript
- Refer to this guide for migration patterns
