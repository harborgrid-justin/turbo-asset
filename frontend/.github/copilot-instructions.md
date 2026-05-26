# AI assistant instructions — Turbo Asset frontend

Guidance for AI coding assistants (GitHub Copilot, Claude, etc.) working in the
`frontend/` web client. The repository-wide operating guide is **`../../CLAUDE.md`** —
read it first; this file only adds frontend-specific notes.

## What this is
The Turbo Asset web client: a **Next.js 15** app (App Router) using **React 19**,
**TypeScript**, and **Tailwind CSS**. It renders UI for the IWMS services exposed by the
backend in `../src`.

## Layout
```
frontend/src/
├── app/         # Next.js App Router routes (pages, layouts, route handlers)
├── components/  # Reusable UI components
├── services/    # API client code that talks to the backend
└── lib/         # Shared helpers/utilities
```

## Commands (run inside `frontend/`)
| Task | Command |
|------|---------|
| Dev server | `npm run dev` (Turbopack, http://localhost:3000) |
| Production build | `npm run build` |
| Start built app | `npm run start` |
| Lint | `npm run lint` |

## Conventions
- **App Router patterns:** prefer Server Components; add `"use client"` only when a
  component needs interactivity/browser APIs.
- **TypeScript first** — type props and API responses; avoid `any`.
- **Styling:** Tailwind utility classes; compose with `clsx` / `tailwind-merge` (already
  dependencies). Don't introduce a second styling system.
- **Data fetching:** go through `src/services/*`; don't scatter raw `fetch` calls through
  components.
- **Match existing components** before inventing new patterns — read a sibling first.
- Keep secrets out of client code; only `NEXT_PUBLIC_*` env vars are exposed to the browser.

## Token-efficient workflow
- Locate code with a targeted search before reading; read scoped ranges, not whole files.
- Make independent reads/edits in parallel; don't re-read a file you just changed.
- After a change, run `npm run lint` and verify the affected page in the browser before
  declaring it done.

For everything else — coding standards, security expectations, the Prisma→Sequelize note,
and the subagent roster — see `../../CLAUDE.md` and Anthropic's Claude Code docs at
https://docs.claude.com/en/docs/claude-code/overview.
