# CLAUDE.md — Turbo Asset LLM Operating Guide

<!-- Maintainers: block-level HTML comments are stripped before this file enters
     Claude's context, so notes like this one cost zero tokens. Keep this file under
     ~200 lines (Anthropic's adherence guidance); put area-specific detail in
     .claude/rules/ and hard guarantees in .claude/settings.json hooks. -->

Project memory for Claude Code, loaded on **every** request — treat each line like
production config. Guidance is layered for token efficiency:

1. **This file** — always-loaded core facts and rules (kept lean on purpose).
2. **`.claude/rules/*.md`** — path-scoped conventions (data layer, security, frontend,
   testing, NAPI packages) that load **only** when you work on matching files.
3. **Hooks in `.claude/settings.json`** — *enforced* safeguards (`--no-verify`,
   force-push, `.env`/`.backup` writes, `prisma migrate`). A denied tool call means a
   guard fired: read the reason and change approach — never try to route around it.

> Tooling source of truth: https://code.claude.com/docs (memory, sub-agents, hooks,
> settings, skills). Defer to the official docs when in doubt.

## 1. What this repository is

**Turbo Asset** is an enterprise Integrated Workplace Management System (IWMS) — a
modern IBM Tririga alternative for real estate, facilities, asset, lease, and workflow
management.

| Aspect | Detail |
|--------|--------|
| Language | TypeScript 5.3+ (strict), Node.js ≥ 18 |
| Backend | Express 4 + Apollo GraphQL (REST + GraphQL) |
| Database | PostgreSQL via **Sequelize** (migrating off Prisma — see §6) |
| Real-time / queues | Socket.IO + Redis · Bull + Redis |
| Validation | Zod / Joi |
| Native modules | 42 NAPI-RS workspace packages under `packages/*` |
| Frontend | Separate Next.js 15 app in `frontend/` (App Router, React 19, Tailwind) |
| Tests | Jest + Supertest (unit/integration), Cypress (e2e) |
| Tooling | ESLint + Prettier, Husky + lint-staged, TypeDoc, Swagger |

## 2. Repository map

```
src/                      # Main backend application
├── api/                  # controllers/ + routes/ (HTTP surface)
├── core/                 # Cross-cutting: auth, cache, database, errors, events,
│                         #   middleware, monitoring, resilience, security, validation
├── services/             # Domain business logic (asset, finance, space, workflow…)
├── shared/               # types / interfaces / constants
├── graphql/              # Schema + resolvers
├── config/ constants/ utils/ middleware/ database/
└── index.ts              # App entry (`npm run dev`)
packages/                 # 42 NAPI-RS native packages (npm workspaces)
frontend/                 # Next.js 15 client (own package.json + lint)
locales/                  # i18n resources (20+ languages)
prisma/                   # Legacy schema — being phased out (§6)
docs/                     # Architecture + per-module API docs (napi-rs/)
.development/             # Jest config, scripts, cypress, dev-only docs
.claude/                  # agents/ + skills/ + rules/ + hooks/ + settings.json
```

**Path aliases** (`tsconfig.json`) — always prefer over deep relative imports:
`@/* → src/*`, `@/types|interfaces|constants/* → src/shared/…`, `@/services/*`,
`@/controllers/* → src/api/controllers/*`, `@/routes/* → src/api/routes/*`,
`@/middleware|utils|config|database/* → src/core/…`.

## 3. Essential commands (repo root; frontend has its own)

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Build | `npm run build` · type-check only: `npm run type-check` |
| Lint / format | `npm run lint` · `npm run lint:fix` · `npm run format` |
| **Quality gate (all 3)** | `npm run quality` |
| Tests | `npm test` · targeted: `npm test -- <path>` · coverage: `npm run test:coverage` |
| E2E | `npm run e2e` / `npm run cypress:open` |
| NAPI | `npm run build:napi` · `npm run napi:health` |
| Frontend | `cd frontend && npm run dev` / `npm run lint` |

**Before declaring work done:** `npm run quality` + the narrowest relevant tests. The
pre-commit hook (Husky + lint-staged) auto-formats staged files — let it.

## 4. Core conventions (always apply)

- **Strict TypeScript** (`strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noEmitOnError`): no `any`, no `@ts-ignore`.
- Controllers thin; business logic in `src/services/*`; cross-cutting in `src/core/*`.
- Validate at boundaries (Zod/Joi); errors via `src/core/errors`; logging via Winston
  (`src/core/monitoring`) — never `console.log` in committed code.
- **No new top-level markdown** unless asked — summaries belong in PR descriptions.
- Comments only where the *why* is non-obvious.
- `*.backup` directories are excluded from the build — never edit or import them
  (hook-enforced).

Area detail (data layer, security, frontend, testing, packages) loads automatically
from `.claude/rules/` when you touch matching files — don't re-derive it.

## 5. Workflow rules (the ⛔ ones are hook-enforced)

- **Branch:** develop on the assigned feature branch; pushing to `master`/`main`
  prompts for explicit permission. ⛔
- **Commits:** small, descriptive, present-tense. Don't commit unless asked.
  `--no-verify` is blocked — fix the underlying error. ⛔
- **Force-push** is blocked; `rm -rf`, `git reset --hard`, branch deletion prompt for
  confirmation. ⛔
- **PRs:** only open one when explicitly requested.
- **Secrets:** `.env`/key writes and reads are blocked; `.env.example` documents the
  shape. ⛔
- **Irreversible actions** beyond the guards above still require explicit confirmation.

## 6. Critical gotcha: Prisma → Sequelize migration

The repo is **mid-migration from Prisma to Sequelize**. New persistence code is
Sequelize / `sequelize-typescript`; `prisma/` and `@prisma/client` are legacy with a
compatibility adapter; `prisma migrate` is not wired up (hook-blocked). Full rules load
from `.claude/rules/data-layer.md` when you touch data files; read
`SEQUELIZE_MIGRATION_GUIDE.md` before any data-layer work. Trust this file and the
guides over the README, which still mentions Prisma.

## 7. Token & context efficiency

Context is the scarce resource — spend it deliberately.

**Delegate to keep the main window clean**
- Open-ended exploration ("where/how is X done?") → **codebase-explorer** agent. Long
  or noisy test runs → **test-runner**. Security passes on diffs → **security-reviewer**.
  Subagents burn their own context and return a tight summary.
- Launch independent subagents **in parallel in one message**; don't redo their work
  yourself afterward.

**Search and read surgically**
- Known symbol/string → targeted `grep`/`rg`, then read **scoped line ranges**. Never
  read whole files to find one function; never re-read a file you just edited.
- Pipe noisy command output through `head`/`tail`/`grep -c` — raw logs never enter
  the main context.

**Batch and parallelize**
- Fire independent tool calls in a single message (read 3 files at once; `git status` +
  `git diff` together). Batch related edits; avoid round-trips.

**Right model for the job**
- Mechanical search → Haiku-class agents. Implementation → Sonnet. Deep cross-system
  reasoning → Opus. Match cost to difficulty.

**Durability across compaction**
- Long sessions get compacted; conversation content can drop, while this file is
  re-injected. Decisions that must survive (conventions, commands, gotchas) belong in
  CLAUDE.md or `.claude/rules/` — propose the edit instead of repeating yourself.

**Don't waste effort**
- No speculative refactors or "while I'm here" cleanups. Re-use prior findings instead
  of re-deriving them.

## 8. Delegation roster (`.claude/agents/`, `.claude/skills/`)

Use the matching specialist proactively instead of doing everything inline. Each agent
has a scoped toolset, model, and turn budget; explorer and security-reviewer keep
persistent memory across sessions, so their recall improves over time.

| Agent | Use it for |
|-------|-----------|
| **codebase-explorer** (Haiku) | Read-only search/navigation. First stop for "where/how is X done?" |
| **service-architect** (Sonnet) | Scaffolding services/packages that follow the layering + aliases. |
| **test-runner** (Sonnet) | Running Jest/Cypress, triaging failures; keeps logs out of main context. |
| **security-reviewer** (Sonnet) | OWASP/tenancy/secrets review of a diff before commit. |
| **docs-curator** (Sonnet) | Keeping CLAUDE.md, rules, and docs/ accurate after changes. |

| Skill | Use it for |
|-------|-----------|
| **/pr-readiness** | Pre-PR gate: quality gate + tests + parallel security/docs passes → go/no-go punch list. Run before any PR. |

To add or edit agents/skills, follow https://code.claude.com/docs/en/sub-agents
(frontmatter: `name`, `description`, plus `tools`, `model`, `maxTurns`, `memory`).

## 9. Security baseline

Multi-tenant enterprise software: every record is org-scoped (`organizationId` on
`BaseEntity`), every action audited (`src/core/audit`). External input is untrusted —
validate at the edge; enforce authZ in services, not just routes; parameterized queries
only. Full requirements load from `.claude/rules/security.md` on matching files.

## 10. When unsure

Ask one focused question rather than guessing on anything ambiguous, irreversible, or
architecturally significant. A 10-second clarification beats a wrong 10-minute build.
