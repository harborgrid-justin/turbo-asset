---
paths:
  - "src/api/**"
  - "src/graphql/**"
  - "src/core/**"
  - "src/middleware/**"
---

# Security requirements (API, GraphQL, core)

Turbo Asset is multi-tenant enterprise software: assume every record is org-scoped and
every action is audited (`src/core/audit`).

- **All external input is untrusted** — HTTP bodies/params, GraphQL args, file uploads,
  integration payloads (SAP/Oracle/Workday/ServiceNow, REST/SOAP connectors). Validate
  and sanitize with Zod/Joi at the edge.
- **AuthZ in services, not just routes.** Route middleware is the first gate, not the
  only one; service methods re-check permissions and `organizationId` ownership (IDOR
  prevention).
- **Tenancy:** every query respects `organizationId` on `BaseEntity` records.
- **Injection:** ORM methods / parameterized queries only; no string-built SQL, no
  `eval`/dynamic `require`, no shelling out with user input.
- **SSRF:** outbound URLs in integration connectors must come from validated/allowlisted
  config, never raw user input.
- **Uploads:** enforce content type, size limits, and path-traversal-safe storage.
- **Secrets:** never hard-code or log keys/tokens/connection strings; `.env` writes are
  hook-blocked. Rate-limit sensitive routes; use the shared auth/JWT helpers in
  `src/core/auth` rather than rolling crypto.
- Significant diffs here warrant a pass from the **security-reviewer** agent before commit.
