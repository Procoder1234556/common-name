# Common Name — agent guide

Read before changing product behavior or stack APIs:

1. [STANDARDS.md](STANDARDS.md) — Context7 + awesome-cursorrules contract
2. [TECH_STACK.md](TECH_STACK.md) — pinned versions
3. [BACKEND_STRUCTURE.md](BACKEND_STRUCTURE.md) — schema + `/api/check`
4. [FRONTEND_GUIDELINES.md](FRONTEND_GUIDELINES.md) — Tailwind v4 `@theme` tokens
5. [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — build order
6. [RESEARCH_MCA.md](RESEARCH_MCA.md) — never scrape MCA; OGD only after confirm

## Hard rules

- Fail closed if company index empty (never fake `LIKELY_UNIQUE`)
- No director / PII columns
- `CONFIRM_OGD_DOWNLOAD=yes` or `OGD_LOCAL_PATH` required before OGD ingest
- `serverExternalPackages: ['better-sqlite3']` in `next.config.ts`
- Prefer Server Components; `'use client'` only for interactivity
- Validate with Zod 4 on API bodies
- Design tokens from `@theme` — no raw hex in components
- Icons: lucide-react SVGs only (no emoji icons)

## Local commands

```bash
pnpm install
pnpm db:fixture
pnpm dev
pnpm type-check
pnpm lint
```

## Phase notes

- TypeScript pinned to **5.9.3** (eslint-config-next / typescript-eslint do not support TS 7 yet; TECH_STACK 7.0.2 deferred)
- SQLite via **sql.js** until better-sqlite3 native builds available on the host
- `POST /api/check` live (Phase 2): Zod + rate limit + normalize/match; **503** `INDEX_UNAVAILABLE` if index empty
- Phase 3 UI: `@theme` tokens, check form → `/api/check`, About trust copy, lucide signals
- Phase 4 ingest: `pnpm db:ingest` gated (`CONFIRM_OGD_DOWNLOAD=yes` + `OGD_DOWNLOAD_URL` **or** `OGD_LOCAL_PATH`); atomic `.bak`; FTS5 prefilter; `pnpm db:bench` p95 target < 3s; sample `data/fixtures/ogd-sample.csv`
- Phase 5 testing: `pnpm test` / `pnpm test:coverage` (≥80% normalize+match); `pnpm test:e2e` Playwright smoke; CI in `.github/workflows/ci.yml`; a11y sign-off `docs/A11Y_CHECKLIST.md`
- Phase 6 deploy: `render.yaml` + `GET /api/health`; build bakes `pnpm db:fixture` only; `CONFIRM_OGD_DOWNLOAD=no` on server; README confirm-before-ingest + disk/.bak rollback

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
