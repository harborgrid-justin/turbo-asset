---
paths:
  - "frontend/**"
---

# Frontend (Next.js app)

Separate app with its own `package.json`, lint config, and conventions — see
`frontend/.github/copilot-instructions.md` for the full guide.

- Stack: Next.js 15 App Router, React 19, Tailwind. Run commands from `frontend/`
  (`cd frontend && npm run dev` / `npm run lint`).
- Root-level `npm run quality` does **not** cover the frontend; lint it separately when
  you change it.
- Server Components by default; add `"use client"` only when interaction requires it.
- Talk to the backend through the existing API client layer — don't scatter raw `fetch`
  calls with hard-coded URLs.
- i18n: user-facing strings go through the locale resources (`locales/`, 20+ languages),
  not inline literals.
