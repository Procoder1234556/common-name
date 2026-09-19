# Engineering Standards — Common Name

**Last verified:** 2026-09-19  
**Sources:** Context7 MCP + [awesome-cursorrules](awesome-cursorrules/rules/) + [TECH_STACK.md](TECH_STACK.md)

This file is the cross-doc contract so PRD / APP_FLOW / FRONTEND / BACKEND / IMPLEMENTATION stay aligned with **current** library docs and project coding rules.

---

## 1. Documentation authority order

1. **Context7** (live library docs) — wins for API signatures, install steps, version-specific behavior
2. **TECH_STACK.md** — pinned versions for this product
3. **awesome-cursorrules** (Next / TS / Zod / Tailwind / App Router family) — code style & architecture habits
4. **PRD / APP_FLOW / FRONTEND_GUIDELINES / BACKEND_STRUCTURE** — product behavior
5. **IMPLEMENTATION_PLAN** — build order

If Context7 and a cursorrules example conflict on an API (e.g. pages router `getServerSideProps` vs App Router), **follow Context7 + App Router**.

---

## 2. Context7 usage (mandatory for implementers)

Before writing framework code:

```text
resolve-library-id → query-docs
```

| Topic                               | Library ID                                                     |
| ----------------------------------- | -------------------------------------------------------------- |
| Next.js App Router / Route Handlers | `/vercel/next.js` (prefer latest version pin, e.g. `v16.2.9`+) |
| Tailwind v4 `@theme` / PostCSS      | `/websites/tailwindcss`                                        |
| Zod schemas                         | `/colinhacks/zod` (v4)                                         |
| React 19 client/server              | `/facebook/react`                                              |

CLI alternative: `npx ctx7@latest library …` then `npx ctx7@latest docs <id> "…"`.

Do **not** invent Next/Tailwind/Zod APIs from memory when Context7 is available.

---

## 3. awesome-cursorrules checklist (apply on every PR)

### Structure & style

- [ ] TypeScript everywhere; `strict`; no `any`
- [ ] Prefer `interface` for object shapes; `type` for unions
- [ ] Named exports; `function` for pure helpers
- [ ] Dirs: `lowercase-with-dashes`
- [ ] Booleans: `isX` / `hasX`; handlers: `handleX`
- [ ] Early returns; explicit error types on critical paths

### Next.js App Router

- [ ] Server Components default; `'use client'` only for interactivity
- [ ] Route Handlers in `app/api/.../route.ts`
- [ ] Use `loading.tsx` / `error.tsx` where useful
- [ ] `await cookies()` / `await headers()` / async `params`
- [ ] `metadata` export for SEO on public pages
- [ ] `serverExternalPackages: ['better-sqlite3']`

### Validation & errors

- [ ] Zod 4 on API body and forms
- [ ] User-friendly messages; no swallowed exceptions
- [ ] Index missing → 503 fail-closed (never fake “likely unique”)

### UI

- [ ] Tailwind v4 utilities + `@theme` tokens (FRONTEND_GUIDELINES)
- [ ] Accessibility: labels, focus rings, live regions, color not sole signal
- [ ] No emoji icons; lucide-react SVGs

### Out of scope (never “just for now”)

- [ ] MCA portal scrape / CAPTCHA bypass
- [ ] Director/shareholder PII columns
- [ ] Pages Router patterns (`getServerSideProps`, etc.)

---

## 4. Document sync matrix

| Doc                    | Must reflect                                                         |
| ---------------------- | -------------------------------------------------------------------- |
| TECH_STACK.md          | Context7-verified versions + install patterns                        |
| FRONTEND_GUIDELINES.md | Tailwind **v4** `@theme` (not v3 `tailwind.config` theme as primary) |
| BACKEND_STRUCTURE.md   | Zod 4 + Next 16 Route Handler shapes                                 |
| IMPLEMENTATION_PLAN.md | `create-next-app@16`, Turbopack, Tailwind v4 PostCSS                 |
| PRD.md                 | Quality bar: strict TS, RSC-friendly, no scrape                      |
| APP_FLOW.md            | Unchanged product flows; copy remains source of truth                |
| RESEARCH_MCA.md        | Data access policy (unchanged by stack bump)                         |

---

## 5. Anti-patterns from legacy cursorrules snippets

Some awesome-cursorrules files still mention **Pages Router**, **DaisyUI**, or **tailwind.config.js** as the only theme path. For Common Name:

| Legacy snippet                  | Use instead                                    |
| ------------------------------- | ---------------------------------------------- |
| `getServerSideProps` / `pages/` | App Router `page.tsx` + Route Handlers         |
| DaisyUI required                | Custom tokens + lucide (product design system) |
| Tailwind v3 `theme.extend` only | Tailwind v4 `@theme` in `globals.css`          |
| Next.js 15 pinned forever       | Next.js **16.3.x** per TECH_STACK              |

---

## 6. Re-verification cadence

- Before MVP implementation start: re-run `npm view` for `next`, `react`, `tailwindcss`, `zod`
- After any major bump: update TECH_STACK §1b table + this file’s date
- Never download OGD without user confirmation (RESEARCH_MCA.md)
