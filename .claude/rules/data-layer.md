---
paths:
  - "src/database/**"
  - "src/services/**/*.ts"
  - "prisma/**"
  - "src/core/database/**"
---

# Data layer: Prisma → Sequelize migration

The repo is **mid-migration from Prisma to Sequelize**. Read
`SEQUELIZE_MIGRATION_GUIDE.md` before touching persistence code.

- **Sequelize is the target.** All new persistence uses Sequelize /
  `sequelize-typescript`. Never add new Prisma code or new models to `prisma/schema.prisma`.
- A **Prisma-compatibility adapter** keeps legacy call sites working during the
  transition — see `SEQUELIZE_ADAPTER_ENHANCEMENTS.md`. Prefer porting a call site to
  native Sequelize over extending the adapter.
- `npm run db:migrate` is intentionally a no-op pointer; `prisma migrate` is **not**
  wired up (a hook blocks it). Migrations are managed per the guide.
- The README still references Prisma in places — trust CLAUDE.md and the migration
  guides over the README for anything data-layer.
- **Multi-tenancy is non-negotiable:** every query on `BaseEntity` records is scoped by
  `organizationId`. A missing tenancy scope is a security bug, not a style issue.
- Use parameterized queries / ORM methods only — never string-concatenate SQL.
