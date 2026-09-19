# Technology Stack Documentation — Common Name

## 1. Stack Overview

**Last Updated:** 2026-09-19  
**Version:** 1.1 (Context7 + npm verified)  
**Product:** Common Name (MCA company name uniqueness signal)

### Architecture Pattern

- **Type:** Modular monolith (Next.js full-stack)
- **Pattern:** App Router UI + Route Handlers + domain services
- **Deployment:** Single web service; durable file or volume for SQLite index (Render ephemeral FS requires volume or rebuild-on-boot from confirmed OGD artifact)

### Justification

MVP is a single-query tool. Next.js App Router keeps UI + `/api/check` in one deployable unit with strict TypeScript. Local SQLite holds name-level rows only — no need for hosted Postgres until scale demands it.

---

## 1b. Verification log (Context7 + npm + awesome-cursorrules)

Verified **2026-09-19** against:

| Source                                             | Role                                                                                   |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Context7 MCP (`resolve-library-id` / `query-docs`) | Current API & install patterns                                                         |
| `npm view <pkg> version`                           | Exact published versions                                                               |
| [awesome-cursorrules](awesome-cursorrules/rules/)  | Coding conventions (RSC-first, strict TS, Zod validation, App Router file conventions) |

### Context7 library IDs used

| Library      | Context7 ID                                        | Notes                                                                                                                  |
| ------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Next.js      | `/vercel/next.js` (docs pin `v16.2.9`)             | App Router Route Handlers; `create-next-app` defaults: TS, Tailwind, ESLint, App Router, Turbopack, `@/*`, `AGENTS.md` |
| Tailwind CSS | `/websites/tailwindcss`                            | **v4** CSS-first: `@import "tailwindcss"`, `@theme { }`, PostCSS plugin `@tailwindcss/postcss`                         |
| Zod          | `/colinhacks/zod` (pin `v4.0.1` docs; npm `4.6.5`) | v4 classic API; `safeParse` / `z.infer`                                                                                |
| React        | `/facebook/react` (via Next peer)                  | React 19 with Next 16                                                                                                  |

### Version bump vs prior doc (1.0)

| Package            | Was (doc 1.0)                 | Now (verified)                                       |
| ------------------ | ----------------------------- | ---------------------------------------------------- |
| next               | 15.1.0                        | **16.3.5**                                           |
| react / react-dom  | 19.0.0                        | **19.3.0**                                           |
| typescript         | 5.7.2                         | **7.0.2**                                            |
| tailwindcss        | 3.4.17 (`tailwind.config.ts`) | **4.3.3** (`@theme` in CSS + `@tailwindcss/postcss`) |
| zod                | 3.24.1                        | **4.6.5**                                            |
| better-sqlite3     | 11.7.0                        | **13.0.3** (engines: node ≥22)                       |
| fuse.js            | 7.0.0                         | **7.5.0**                                            |
| vitest             | 2.1.8                         | **5.0.1**                                            |
| lucide-react       | 0.469.0                       | **1.47.0**                                           |
| eslint-config-next | 15.1.0                        | **16.3.5**                                           |

### awesome-cursorrules conventions locked for this project

Primary rule family: `nextjs15-react19-vercelai-tailwind`, `typescript-zod-tailwind-nextjs`, `nextjs-app-router`, `typescript.mdc` — adapted to **Next.js 16** (same App Router / RSC patterns; versions updated via Context7).

| Convention      | Standard                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| Components      | Server Components by default; minimize `'use client'`                                                |
| Naming          | `isLoading` / `hasError`; handlers `handleSubmit`; dirs `lowercase-dashes`; named exports            |
| TypeScript      | Strict; prefer `interface` for objects; avoid `enum`; no `any`; `satisfies` where useful             |
| Async Next APIs | `await cookies()`, `await headers()`, `await params` / `searchParams`                                |
| Special files   | `layout.tsx`, `loading.tsx`, `error.tsx`, Route Handlers in `route.ts`                               |
| Validation      | Zod on client + server; early returns; typed errors                                                  |
| Forms           | Prefer Server Actions / `useActionState` where fit; MVP check may use client `fetch` to `/api/check` |
| Styling         | Tailwind utilities; design tokens (v4 `@theme`); no DaisyUI required for this product                |
| Structure       | `app/`, `components/`, `lib/`; thin routes, logic in services                                        |
| Native modules  | `serverExternalPackages: ['better-sqlite3']` in `next.config.ts`                                     |

Re-verify before major upgrades: `ctx7 docs /vercel/next.js "…"` and `npm view <pkg> version`.

---

## 2. Frontend Stack

### Core Framework

- **Framework:** Next.js
- **Version:** 16.3.5
- **Reason:** App Router, Route Handlers (`NextRequest` / `NextResponse`), Turbopack default in create-next-app, one deployable
- **Documentation:** https://nextjs.org/docs — Context7 `/vercel/next.js`
- **License:** MIT
- **Alternatives Considered:** Vite SPA (rejected: extra API host); Remix (rejected: team familiarity with Next)

### UI Library

- **Library:** React
- **Version:** 19.3.0
- **Reason:** Required peer for Next 16; RSC + client components
- **Documentation:** https://react.dev
- **License:** MIT

### State Management

- **Approach:** React local state / Server Actions for search form/results (MVP)
- **Library:** None required
- **Alternatives Considered:** Zustand (deferred); `nuqs` for URL `?q=` (P1)

### Styling

- **Framework:** Tailwind CSS
- **Version:** 4.3.3
- **Configuration:** CSS-first — `app/globals.css` with `@import "tailwindcss"` and `@theme { … }` tokens from FRONTEND_GUIDELINES.md; `postcss.config.mjs` with `@tailwindcss/postcss`
- **Package:** `@tailwindcss/postcss` 4.3.3
- **Reason:** Current Tailwind standard (v4); utility-first; token mapping without legacy `tailwind.config.ts` for theme
- **Documentation:** https://tailwindcss.com/docs — Context7 `/websites/tailwindcss`
- **License:** MIT
- **Note:** Do **not** use Tailwind v3 `tailwind.config.js` theme.extend as primary path

### Type Safety

- **Language:** TypeScript
- **Version:** 7.0.2
- **tsconfig:** `strict: true`, `noUncheckedIndexedAccess: true`
- **Reason:** Eliminate ambiguous match/API shapes

### Form Handling

- **Library:** React Hook Form
- **Version:** 7.88.0
- **Validation:** Zod 4.6.5 via `@hookform/resolvers` 5.9.1 (supports zod `^3.25 \|\| ^4`)
- **Reason:** Typed validation shared with API

### HTTP Client

- **Browser:** Native `fetch` to same-origin `/api/check`
- **Reason:** No cross-origin needs in MVP

### Routing

- **Built-in:** Next.js App Router
- **Routes:** `/`, `/about`, `POST /api/check`
- **SEO:** `export const metadata` in `layout.tsx` / pages (awesome-cursorrules App Router)

### Icons

- **Library:** lucide-react
- **Version:** 1.47.0
- **Reason:** Consistent SVG icons; no emoji as icons (ui-ux-pro-max)

---

## 3. Backend Stack

### Runtime

- **Platform:** Node.js
- **Version:** 22.14.x LTS (minimum **22.13.0**; engines for better-sqlite3 require `>=22`)
- **Package Manager:** pnpm 10.14.0+ (lock with project; npm latest pnpm line OK — pin in `packageManager` field)
- **Reason:** Performance, LTS, native module support

### Framework

- **Framework:** Next.js Route Handlers (App Router)
- **Pattern:** `export async function POST(request: NextRequest)` → `NextResponse.json(...)`
- **Reason:** Colocated API; Web Request/Response model (Context7 Next 16)
- **Alternatives Considered:** Express sidecar (rejected: ops overhead)

### Database / Index

- **Primary:** SQLite
- **Version:** 3.x via `better-sqlite3` 13.0.3
- **Reason:** Single-file name index; fast local reads; simple backup (copy file)
- **ORM / access:** Direct SQL + typed helpers (no Prisma required for one table MVP)
- **Next config:** `serverExternalPackages: ['better-sqlite3']`
- **Alternatives Considered:** Postgres (overkill for MVP); JSON file (too slow at millions of rows)

#### Full-text / fuzzy

- **Exact / prefix:** SQLite indexes on `normalized_name`
- **Fuzzy:** `fuse.js` 7.5.0 for candidate ranking on prefiltered token set **or** custom Levenshtein on top-K token candidates
- **Phonetic (optional MVP+):** double-metaphone / Soundex helper for Tekno/Techno — if fuse score insufficient
- **Reason:** Transparent scoring; no opaque ML dependency

### Caching

- **MVP:** In-memory LRU for recent queries (optional), max 500 entries, TTL 5 minutes
- **Redis:** Not required for MVP

### Authentication

- **Public check API:** None
- **Ingest scripts:** Local CLI with `CONFIRM_OGD_DOWNLOAD=yes` gate

### File Storage

- **Index path:** `data/companies.sqlite` (gitignored)
- **Fixtures:** `data/fixtures/sample-companies.json` (committed, synthetic)
- **OGD downloads:** `data/raw/` (gitignored) — only after user confirmation

### Email Service

- **None** (MVP)

---

## 4. DevOps & Infrastructure

### Version Control

- **System:** Git
- **Branch Strategy:**
  - `main` (production)
  - `feature/*`
  - `hotfix/*`

### CI/CD

- **Platform:** GitHub Actions
- **Workflows:**
  - PR: lint, type-check, unit tests
  - Main: build + deploy

### Hosting

- **Web:** Vercel **or** Render Web Service
- **Constraint (Render):** Bind to `0.0.0.0:$PORT`; ephemeral disk — attach persistent disk for SQLite **or** bake index into deploy artifact after confirmed ingest
- **Reason:** Simple Node/Next hosting

### Monitoring

- **Errors:** Optional Sentry `@sentry/nextjs` (P1 — pin at install time via npm)
- **MVP logging:** Structured `console` JSON for check latency + error codes

### Testing

- **Unit:** Vitest 5.0.1 (peer: Vite 6/7/8)
- **API:** Vitest + Next request mocks / fetch against test handler
- **E2E:** Playwright 1.63.0 (smoke: home submit with fixtures)
- **Coverage Target:** 80% on `lib/normalize` + `lib/match`

---

## 5. Development Tools

### Code Quality

- **Linter:** ESLint 9.x (compatible with `eslint-config-next` peer `>=9`) + `eslint-config-next` 16.3.5
- **Formatter:** Prettier 3.9.8
- **Git Hooks:** Husky 9.1.7 + lint-staged 15.5.2 (or latest 15.x)

### IDE Recommendations

- **Editor:** VS Code / Cursor
- **Extensions:** ESLint, Prettier, Tailwind CSS IntelliSense (v4-aware)
- **Agent guide:** Commit `AGENTS.md` summarizing these docs (create-next-app default)

---

## 6. Environment Variables

```bash
# App
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Data
COMPANIES_DB_PATH=./data/companies.sqlite
# Must be exactly "yes" to allow network download of OGD ZIP
CONFIRM_OGD_DOWNLOAD=no
# Optional: path to already-downloaded ZIP/CSV (skips network)
OGD_LOCAL_PATH=

# Rate limit
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=30

# MCA deep link (official portal entry — update if MCA moves path)
NEXT_PUBLIC_MCA_VERIFY_URL=https://www.mca.gov.in/content/mca/global/en/mca/fo-llp-services/company-llp-name-search.html
NEXT_PUBLIC_OGD_CATALOG_URL=https://data.gov.in/catalog/company-master-data
```

---

## 7. Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start -H 0.0.0.0 -p ${PORT:-3000}",
    "lint": "next lint",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:fixture": "tsx scripts/load-fixtures.ts",
    "db:ingest": "tsx scripts/ingest-ogd.ts"
  }
}
```

`db:ingest` **must** exit non-zero unless `CONFIRM_OGD_DOWNLOAD=yes` or `OGD_LOCAL_PATH` points to a local file the operator already obtained.

---

## 8. Dependencies Lock

Exact versions verified via `npm view` on 2026-09-19. Re-run before install if months have passed.

### App Dependencies

```json
{
  "next": "16.3.5",
  "react": "19.3.0",
  "react-dom": "19.3.0",
  "typescript": "7.0.2",
  "tailwindcss": "4.3.3",
  "@tailwindcss/postcss": "4.3.3",
  "zod": "4.6.5",
  "react-hook-form": "7.88.0",
  "@hookform/resolvers": "5.9.1",
  "better-sqlite3": "13.0.3",
  "fuse.js": "7.5.0",
  "lucide-react": "1.47.0",
  "clsx": "2.1.1",
  "tailwind-merge": "3.7.0"
}
```

### Dev Dependencies

```json
{
  "vitest": "5.0.1",
  "vite": "6.4.3",
  "@types/better-sqlite3": "9.6.0",
  "@types/node": "22.20.4",
  "@types/react": "19.3.0",
  "@types/react-dom": "19.3.0",
  "eslint": "9.39.5",
  "eslint-config-next": "16.3.5",
  "prettier": "3.9.8",
  "husky": "9.1.7",
  "lint-staged": "15.5.2",
  "tsx": "4.23.13",
  "playwright": "1.63.0",
  "postcss": "8.5.28"
}
```

**Removed vs v3 stack:** `autoprefixer` as a required Tailwind peer (v4 PostCSS plugin owns pipeline). Add only if a non-Tailwind CSS path needs it.

### Scaffold command (Context7 / Next 16)

```bash
npx create-next-app@16.3.5 . --typescript --tailwind --eslint --app --turbopack --yes
```

Then align Tailwind to v4 PostCSS/`@theme` per FRONTEND_GUIDELINES.md if the template still emits transitional files.

---

## 9. Security Considerations

### Public API

- Rate limit by IP (in-memory MVP; Redis later)
- Zod 4 validation on body (`safeParse`)
- No file upload endpoints in MVP
- Security headers via `next.config.ts` `headers()`

### Data Protection

- Store name-level company fields only (see BACKEND_STRUCTURE.md)
- Do not log full request bodies beyond truncated name (max 120 chars)
- Gitignore `data/companies.sqlite`, `data/raw/`

### Ingest Safety

- Confirmation gate for downloads
- Checksum stored in `dataset_meta`
- Atomic replace of DB file (write temp → rename)

### Rate Limiting

- Check endpoint: 30 / 15 min / IP
- Return 429 with clear message

---

## 10. Version Upgrade Policy

### Major Version Updates

- Quarterly review via Context7 + `npm view`
- Test matching + ingest on staging first
- Rollback plan: previous Docker/build + previous SQLite file

### Minor/Patch Updates

- Monthly security patches
- Dependabot PRs reviewed weekly

### Breaking Changes

- Document in CHANGELOG.md
- Bump API only if response shape changes (`/api/v1/check` when needed)

---

## 11. Alignment Notes

- **Context7:** All framework APIs in IMPLEMENTATION_PLAN must match Context7 docs at build time — do not rely on training-data snippets alone.
- **awesome-cursorrules:** RSC-first, strict TS, Zod validation, App Router special files, descriptive boolean names, thin handlers.
- **Render:** listen on `0.0.0.0:$PORT`; treat filesystem as ephemeral unless volume attached.
- **Matching:** fuse / edit distance only — no black-box “AI uniqueness score.”

---

## 12. References

- [PRD.md](PRD.md)
- [BACKEND_STRUCTURE.md](BACKEND_STRUCTURE.md)
- [FRONTEND_GUIDELINES.md](FRONTEND_GUIDELINES.md)
- [RESEARCH_MCA.md](RESEARCH_MCA.md)
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)
- [STANDARDS.md](STANDARDS.md)
- Context7: `/vercel/next.js`, `/websites/tailwindcss`, `/colinhacks/zod`
- awesome-cursorrules: `nextjs15-react19-vercelai-tailwind-cursorrules-prompt-file.mdc`, `typescript-zod-tailwind-nextjs-cursorrules-prompt-.mdc`, `nextjs-app-router-cursorrules-prompt-file.mdc`, `typescript.mdc`
