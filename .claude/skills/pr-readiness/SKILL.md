---
name: pr-readiness
description: >
  Enterprise pre-PR readiness gate for Turbo Asset. Use before opening a pull request, or
  when the user asks "is this ready to ship / merge", "run the quality gate", or "check the
  branch before PR". Runs the lint/format/type-check quality gate and the relevant tests,
  delegates a security pass to the security-reviewer subagent, and returns a go/no-go punch
  list — done vs. still-needed. Does NOT open the PR or push unless explicitly asked.
---

# PR readiness gate

Drive the change to a confident, reviewable state. Work the steps in order; stop and
report early only if something blocks the rest. Context hygiene applies throughout:
summarize command results, never paste full logs, and delegate anything noisy to a
subagent.

## 1. Establish scope

- `git status` and `git diff --stat` against the base branch (run both in one message)
  to see what actually changed.
- Note which areas are touched: backend (`src/`), a `packages/*` workspace, `frontend/`,
  docs, or config. This decides which checks below are relevant — skip checks whose
  area is untouched and say so in the report.

## 2. Quality gate

- `npm run quality` (lint + format:check + type-check). If it's noisy, run the pieces
  individually and pipe through `tail` for the failure summary.
- If `frontend/` changed, also run `cd frontend && npm run lint`.
- Fix mechanical issues (`npm run lint:fix`, `npm run format`) rather than reporting
  them. Never silence errors with `any`/`@ts-ignore`; never bypass hooks (`--no-verify`
  is blocked by a repo guard anyway).

## 3. Tests + security — delegate in parallel

Launch both subagents **in a single message** so they run concurrently in their own
context windows:

- **test-runner**: the narrowest suite covering the change (`npm test -- <path>`); full
  `npm test` only for broad/cross-cutting changes. For UI changes, have it note whether
  Cypress e2e (`npm run e2e`) is warranted.
- **security-reviewer**: always when the diff touches auth, the data layer, HTTP/GraphQL
  surfaces, file uploads, or integration connectors; skip (and say so) only for pure
  docs/config diffs.

Use their summaries verbatim where possible — do not re-run what they already ran.

## 4. Data-layer & secrets spot-checks

- Confirm no secrets are staged (`git diff --cached --name-only` for `.env`, keys,
  tokens — the guard blocks writes, but check for files staged by other means).
- Confirm new persistence code is **Sequelize**, not Prisma
  (`SEQUELIZE_MIGRATION_GUIDE.md`, `.claude/rules/data-layer.md`).

## 5. Docs

- If commands, structure, conventions, or the API surface changed, update the relevant
  docs or delegate to **docs-curator**. Keep CLAUDE.md and `.claude/rules/` consistent
  with the change.

## 6. Report — go / no-go punch list

Return a tight checklist, e.g.:
- ✅ Quality gate (lint / format / type-check)
- ✅ Tests: `<scope>` passing (per test-runner)
- ⚠️ Security: <finding + fix>, or "clean" (per security-reviewer)
- ➖ Skipped: <check> — <why it doesn't apply>
- ❌ <blocker that must be resolved before PR>
- 📝 Suggested PR title + 1–3 bullet summary

End with a clear verdict: **ready to open a PR**, or **N items remain**. Do not push or
open the PR unless the user explicitly asks.
