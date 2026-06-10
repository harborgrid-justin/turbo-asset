---
paths:
  - "packages/**"
---

# NAPI-RS packages (packages/*)

42 native service packages managed as npm workspaces.

- Package names follow `@turbo-asset/<name>`; mirror the layout of an existing sibling
  package (its `package.json`, build scripts, and module docs) before creating anything.
- Build all: `npm run build:napi`. Health check: `npm run napi:health`.
- Per-module API docs live under `docs/napi-rs/modules/` — update the matching doc (or
  delegate to **docs-curator**) when a package's surface changes.
- Domains can exist in both `src/services/<domain>` and `packages/<domain>-service`
  (sometimes with `-management` siblings) — confirm which one a task targets before
  editing.
