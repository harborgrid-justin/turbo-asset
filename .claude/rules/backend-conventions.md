---
paths:
  - "src/**/*.ts"
---

# Backend conventions (src/)

- **Layering:** controllers (`src/api/controllers`) stay thin — parse → validate →
  delegate → respond. Business logic lives in `src/services/<domain>`. Cross-cutting
  concerns (auth, cache, database, errors, events, middleware, monitoring, resilience,
  security, validation) live in `src/core/*`. Routes in `src/api/routes`.
- **Mirror an existing example first.** Before writing a new controller/service/route,
  read a comparable one and match its structure, error handling, and naming.
- **Strict TypeScript:** must compile under `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride`, `noEmitOnError`. No `any`,
  no `@ts-ignore`, no casting around the type system.
- **Imports:** `@/` path aliases from `tsconfig.json` (`@/services/*`, `@/controllers/*`,
  `@/middleware/*`, `@/utils/*`, `@/config/*`, `@/database/*`, `@/types/*`,
  `@/interfaces/*`, `@/constants/*`, `@/routes/*`) — never deep relative paths.
- **Validation** with Zod/Joi at external boundaries (HTTP, GraphQL, uploads,
  integration payloads); trust internal calls.
- **Errors:** shared types from `src/core/errors`, never ad-hoc `throw new Error`.
- **Logging:** Winston via `src/core/monitoring` — `console.log` never ships.
- **Real-time / queues:** Socket.IO + Redis for events, Bull + Redis for jobs — reuse
  the existing wiring in `src/core/events`, don't create parallel infrastructure.
