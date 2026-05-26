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
report early only if something blocks the rest.

## 1. Establish scope
- `git status` and `git diff --stat` against the base branch to see what actually changed.
- Note which areas are touched: backend (`src/`), a `packages/*` workspace, `frontend/`,
  docs, or config. This decides which checks below are relevant.

## 2. Quality gate
Run the root quality gate and capture failures (don't paste full logs — summarize):
- `npm run quality` (lint + format:check + type-check). If it's noisy, run the pieces
  individually: `npm run lint`, `npm run format:check`, `npm run type-check`.
- If only `frontend/` changed, also run `cd frontend && npm run lint`.
- Fix mechanical issues (`npm run lint:fix`, `npm run format`) rather than reporting them.
  Never silence errors with `any`/`@ts-ignore` or by skipping hooks.

## 3. Tests
- Run the **narrowest** suite that covers the change: `npm test -- <path-or-pattern>`.
  Run the full `npm test` only when the change is broad or cross-cutting.
- For UI changes, note whether Cypress e2e (`npm run e2e`) is warranted; flag if it can't
  be run here.
- Prefer delegating long/noisy runs to the **test-runner** subagent so logs stay out of the
  main context — use its summary.

## 4. Security & data-layer review
- If the diff touches auth, the data layer, HTTP/GraphQL surfaces, file uploads, or
  integration connectors, delegate to the **security-reviewer** subagent and fold its
  findings into the punch list.
- Confirm no secrets are staged (`.env`, keys, tokens) and that new persistence code uses
  **Sequelize**, not Prisma (see `SEQUELIZE_MIGRATION_GUIDE.md`).

## 5. Docs
- If commands, structure, conventions, or the API surface changed, update the relevant docs
  (or delegate to the **docs-curator** subagent). Keep `CLAUDE.md` accurate.

## 6. Report — go / no-go punch list
Return a tight checklist, e.g.:
- ✅ Quality gate (lint / format / type-check)
- ✅ Tests: `<scope>` passing
- ⚠️ Security: <finding + fix>, or "clean"
- ❌ <blocker that must be resolved before PR>
- 📝 Suggested PR title + 1–3 bullet summary

End with a clear verdict: **ready to open a PR**, or **N items remain**. Do not push or open
the PR unless the user explicitly asks.
