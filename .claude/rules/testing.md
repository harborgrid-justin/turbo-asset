---
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "**/__tests__/**"
  - ".development/**"
  - "frontend/cypress/**"
---

# Testing conventions

- Jest + Supertest for unit/integration (config: `.development/jest.config.js`),
  Cypress for e2e.
- Run the **narrowest** scope that covers the change: `npm test -- <path-or-pattern>`.
  Full `npm test` only for broad/cross-cutting changes. Coverage: `npm run test:coverage`.
- Long or noisy runs belong in the **test-runner** agent, not the main context — use its
  summary, never paste raw logs.
- Never weaken an assertion, add `.skip`, or loosen a type just to get green. A failing
  test is either a product bug (fix the product) or a stale test (fix it explicitly and
  say so).
- Tests live next to the patterns they cover — mirror an existing spec's structure,
  factories, and naming before inventing new helpers.
- Multi-tenancy in tests: cover the `organizationId` boundary (one org must not read
  another's records) for any service-layer test that touches persistence.
