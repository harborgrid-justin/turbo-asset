# CLAUDE.md — Turbo Asset LLM Operating Guide

Authoritative guidance for Claude (and other AI coding assistants) working in this
repository. Claude Code loads this file automatically as project memory, so keep it
**accurate, concise, and high-signal**. Every token here is sent on each request —
treat it like production config, not a wiki.

> **Source of truth for tooling.** This guide follows Anthropic's published practices.
> When in doubt, defer to the official docs:
> - Claude Code overview — https://docs.claude.com/en/docs/claude-code/overview
> - Memory & `CLAUDE.md` — https://docs.claude.com/en/docs/claude-code/memory
> - Subagents — https://docs.claude.com/en/docs/claude-code/sub-agents
> - Settings & permissions — https://docs.claude.com/en/docs/claude-code/settings
> - Slash commands — https://docs.claude.com/en/docs/claude-code/slash-commands
> - Prompt engineering — https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview
> - Claude Code best practices — https://www.anthropic.com/engineering/claude-code-best-practices

---

## 1. What this repository is

**Turbo Asset** is an enterprise Integrated Workplace Management System (IWMS) —
a modern alternative to IBM Tririga for real estate, facilities, asset, lease, and
workflow management.

| Aspect | Detail |
|--------|--------|
| Language | TypeScript 5.3+ (strict), Node.js ≥ 18 |
| Backend | Express 4 + Apollo GraphQL (REST + GraphQL) |
| Database | PostgreSQL via **Sequelize** (migrating off Prisma — see §6) |
| Real-time | Socket.IO + Redis |
| Queues | Bull + Redis |
| Validation | Zod / Joi |
| Native modules | 42 NAPI-RS workspace packages under `packages/*` |
| Frontend | Separate Next.js 15 app in `frontend/` (App Router, Tailwind, React 19) |
| Tests | Jest + Supertest (unit/integration), Cypress (e2e) |
| Tooling | ESLint + Prettier, Husky + lint-staged, TypeDoc, Swagger |

---

## 2. Repository map (where things live)

```
src/                      # Main backend application
├── api/                  # HTTP surface: controllers, routes, graphql
│   ├── controllers/
│   └── routes/
├── core/                 # Cross-cutting platform: auth, cache, database,
│                         #   errors, events, middleware, monitoring,
│                         #   resilience, security, validation
├── services/             # Domain business logic, grouped by domain
│                         #   (asset, finance, space, workflow, portfolio…)
├── shared/               # types / interfaces / constants (import via @/ aliases)
├── graphql/              # Schema + resolvers
├── config/  constants/  utils/  middleware/  database/
└── index.ts              # App entry (run with `npm run dev`)

packages/                 # 42 NAPI-RS native service packages (npm workspaces)
frontend/                 # Next.js 15 web client (own package.json + lint)
locales/                  # i18n resources (20+ languages)
prisma/                   # Legacy schema — being phased out (see §6)
docs/                     # Architecture + per-module API docs (napi-rs/)
.development/             # Test config, scripts, cypress, validation, dev-only docs
.claude/                  # Claude Code config: agents/ + settings.json
```

**Path aliases** (from `tsconfig.json`) — always prefer these over deep relative paths:

```
@/*            → src/*
@/types/*      → src/shared/types/*
@/interfaces/* → src/shared/interfaces/*
@/constants/*  → src/shared/constants/*
@/services/*   → src/services/*
@/controllers/*→ src/api/controllers/*
@/routes/*     → src/api/routes/*
@/middleware/* → src/core/middleware/*
@/utils/*      → src/core/utils/*
@/config/*     → src/core/config/*
@/database/*   → src/core/database/*
```

---

## 3. Essential commands

Run from the repo root unless noted. The frontend has its own scripts (`cd frontend`).

| Task | Command |
|------|---------|
| Dev server (hot reload) | `npm run dev` |
| Production build | `npm run build` (runs `clean` + `tsc`) |
| Type-check only | `npm run type-check` |
| Lint | `npm run lint` · fix: `npm run lint:fix` |
| Format | `npm run format` · check: `npm run format:check` |
| **Quality gate (all 3)** | `npm run quality` |
| Unit/integration tests | `npm test` (Jest, config `.development/jest.config.js`) |
| Watch tests | `npm run test:watch` |
| Coverage | `npm run test:coverage` |
| E2E (Cypress) | `npm run e2e` / `npm run cypress:open` |
| Build all NAPI packages | `npm run build:napi` |
| NAPI health check | `npm run napi:health` |
| Frontend dev | `cd frontend && npm run dev` |

**Before declaring work done, run `npm run quality` and the relevant tests.** The
pre-commit hook (Husky + lint-staged) runs `eslint --fix` + `prettier` on staged
`*.ts/tsx` and Prettier on `*.json/md`, so don't fight it — let it format.

---

## 4. Coding conventions

- **Strict TypeScript.** `tsconfig.json` enables `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride`, and `noEmitOnError`. Write code
  that compiles clean — do not paper over types with `any` or `@ts-ignore`.
- **Imports:** use `@/` path aliases, not `../../../`.
- **Services are the home for business logic.** Controllers stay thin (parse → validate
  → delegate → respond). Cross-cutting concerns live in `src/core/*`.
- **Validation at boundaries** with Zod/Joi; trust internal calls.
- **Errors:** use the shared error types in `src/core/errors`, not ad-hoc `throw new Error`.
- **No new top-level docs** unless asked. Summary/analysis markdown belongs in PR
  descriptions, not the repo root (the root is already crowded — don't add to it).
- **Comments:** only when the *why* is non-obvious. No "what" narration.
- **`.backup` directories** (e.g. `src/services/*.backup`) are excluded from the build —
  never edit them and never import from them.

---

## 5. Workflow rules

- **Branch:** develop on the assigned feature branch; never push to `master` without
  explicit permission.
- **Commits:** small, descriptive, present-tense. Don't commit unless asked. Never use
  `--no-verify` to skip hooks — fix the underlying lint/type error instead.
- **PRs:** only open one when explicitly requested.
- **Secrets:** never commit `.env`, keys, or credentials. `.env.example` documents the
  shape; real values stay local.
- **Risky/irreversible actions** (deleting branches, force-push, dropping tables,
  `rm -rf`) require explicit confirmation first.

---

## 6. Critical gotcha: Prisma → Sequelize migration in progress

The repo is **mid-migration from Prisma to Sequelize**. This matters for almost any
data-layer task:

- **Sequelize is the target.** New persistence code uses Sequelize / `sequelize-typescript`.
- A **Prisma-compatibility adapter** exists so legacy call sites keep working during the
  transition — see `SEQUELIZE_MIGRATION_GUIDE.md` and `SEQUELIZE_ADAPTER_ENHANCEMENTS.md`.
- `npm run db:migrate` is intentionally a no-op pointer; migrations are managed
  separately per the guide. Don't assume `prisma migrate` is wired up.
- `prisma/` and `@prisma/client` are **legacy**. The README still references Prisma in
  places — trust this file and the migration guides over the README for the data layer.

When touching the database, read the migration guide first and follow the Sequelize
path unless explicitly told otherwise.

---

## 7. Token efficiency — maximize signal, minimize waste

Context is the scarce resource. Spend it deliberately. (See Anthropic's best-practices
guide linked above.)

**Searching & reading**
- For broad/open-ended exploration ("where is X handled across the codebase?"), delegate
  to the **`codebase-explorer`** subagent (§8). It burns its own context and returns a
  tight summary, keeping your main window clean.
- For a known symbol or string, use a **targeted `grep`/`rg`** — don't read whole files
  to find one function.
- Read **scoped line ranges**, not entire files, once you know the location.
- Never re-read a file you just edited — the edit already confirmed its new state.
- Don't dump large command output into context. Pipe through `head`, `grep`, or `wc`.

**Parallelism & batching**
- Fire independent tool calls **in a single message** (parallel) — e.g. read three files
  at once, or run `git status` + `git diff` together.
- Batch related edits; avoid round-trips.

**Right tool / right model**
- Cheap, mechanical search → Haiku-class subagents. Implementation → Sonnet.
  Deep cross-system reasoning → Opus. Match cost to difficulty.
- Lean on subagents to **parallelize independent work** and to **firewall noisy output**
  (test logs, large greps) away from the main thread.

**Don't waste effort**
- No speculative refactors, abstractions, or "while I'm here" cleanups beyond the task.
- Re-use prior findings instead of re-deriving them.

---

## 8. Subagent roster (`.claude/agents/`)

Use the right specialist instead of doing everything inline. Each lives in
`.claude/agents/` with a scoped tool set. Invoke proactively when the task matches.

| Agent | Use it for |
|-------|-----------|
| **codebase-explorer** | Read-only search/navigation across `src/` and `packages/`. First stop for "where / how is X done?" Returns a concise map, not raw dumps. |
| **service-architect** | Designing or scaffolding a new domain service or NAPI package that follows the controller→service→core layering and path-alias conventions. |
| **test-runner** | Running Jest/Cypress, triaging failures, and reporting a fix-list. Keeps verbose test output out of the main context. |
| **security-reviewer** | Reviewing a diff for OWASP issues, secret leakage, authZ gaps, and injection risks before commit. |
| **docs-curator** | Keeping `CLAUDE.md`, `docs/`, and module docs accurate after code changes; flags drift. |

To add or edit agents, follow https://docs.claude.com/en/docs/claude-code/sub-agents
(markdown + YAML frontmatter: `name`, `description`, optional `tools`/`model`).

---

## 9. Security & enterprise expectations

- Treat all external input (HTTP, GraphQL, file upload, integration payloads) as
  untrusted. Validate and sanitize at the edge.
- Enforce authZ in services, not just routes; respect `organizationId` tenancy on
  `BaseEntity` records.
- Use parameterized queries / ORM methods — never string-concatenate SQL.
- Keep dependencies current; flag, don't silently downgrade, packages.
- Log via Winston (`src/core/monitoring`), never `console.log` in committed code.
- This is multi-tenant enterprise software — assume every record is scoped to an org and
  every action is audited (`src/core/audit`).

---

## 10. When you're unsure

Ask a focused question rather than guessing on anything ambiguous, irreversible, or
architecturally significant. A 10-second clarification beats a wrong 10-minute build.
