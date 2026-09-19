# Implementation Plan & Build Sequence — Common Name

## Overview

**Project:** Common Name  
**MVP Target:** 3–4 weeks after OGD download confirmation  
**Approach:** Documentation-first; fixtures first; bulk OGD ingest only after explicit user confirmation

### Build Philosophy

- Code follows these docs (PRD, APP_FLOW, TECH_STACK, FRONTEND_GUIDELINES, BACKEND_STRUCTURE, RESEARCH_MCA, STANDARDS)
- Framework APIs come from **Context7**, not training-data memory
- Style/architecture habits from **awesome-cursorrules** (App Router / strict TS / Zod) as adapted in STANDARDS.md
- Test after every step
- **Never** scrape MCA; **never** download OGD ZIP until user confirms
- Fail closed if index empty (never fake “likely unique”)

---

## Phase 0: Confirmation Gate (blocking)

### Step 0.1: User confirms data path

**Duration:** Async (human)  
**Goal:** Legal/ops green light before network bulk fetch

**Tasks:**

1. Review [RESEARCH_MCA.md](RESEARCH_MCA.md)
2. User confirms one of:
   - `CONFIRM_OGD_DOWNLOAD=yes` allowed for data.gov.in Company Master Data, **or**
   - Operator will supply `OGD_LOCAL_PATH` to an already-obtained official file
3. Until then: use fixtures only

**Success Criteria:**

- [ ] Written confirmation in chat/issue
- [ ] Env policy understood by implementer

**Reference Docs:** RESEARCH_MCA.md sections 4–6

---

## Phase 1: Project Setup & Foundation

### Step 1.1: Initialize Project Structure

**Duration:** 1–2 hours  
**Goal:** Next.js 16 app with TypeScript + Tailwind v4 runs locally

**Tasks:**

1. Scaffold Next.js **16.3.5** App Router (TypeScript, Tailwind, ESLint, Turbopack) per TECH_STACK.md / Context7:

   ```bash
   npx create-next-app@16.3.5 . --typescript --tailwind --eslint --app --turbopack --yes
   ```

2. Install remaining dependencies per TECH_STACK.md exact versions (`better-sqlite3`, `zod@4`, `fuse.js`, etc.)
3. Confirm Tailwind **v4** PostCSS setup (`@tailwindcss/postcss` + `@import "tailwindcss"`); migrate any v3 `tailwind.config` theme into `@theme` (FRONTEND_GUIDELINES §12)
4. Set `serverExternalPackages: ['better-sqlite3']` in `next.config.ts`
5. Configure Prettier + Husky + lint-staged; keep/create `AGENTS.md` pointing at STANDARDS.md
6. Add `.gitignore`: `data/companies.sqlite`, `data/raw/`, `.env*.local`
7. Create folder layout:

```
app/
  page.tsx
  about/page.tsx
  api/check/route.ts
  layout.tsx
  globals.css
components/
lib/
  normalize.ts
  match.ts
  db.ts
  rate-limit.ts
scripts/
  load-fixtures.ts
  ingest-ogd.ts
data/
  fixtures/sample-companies.json
```

**Success Criteria:**

- [ ] `pnpm dev` serves `/`
- [ ] `pnpm type-check` clean
- [ ] `pnpm lint` clean

**Reference Docs:** TECH_STACK.md sections 2, 5, 7

---

### Step 1.2: Environment Setup

**Duration:** 30 minutes  
**Goal:** Env template without secrets committed

**Tasks:**

1. Create `.env.example` from TECH_STACK.md section 6
2. Create local `.env.local` with `CONFIRM_OGD_DOWNLOAD=no` and fixture DB path
3. Document `PORT` / `0.0.0.0` for Render in README

**Success Criteria:**

- [ ] App reads env vars
- [ ] No secrets in git

**Reference Docs:** TECH_STACK.md section 6

---

### Step 1.3: Database Bootstrap + Fixtures

**Duration:** 2 hours  
**Goal:** SQLite schema + synthetic companies for development

**Tasks:**

1. Implement `lib/db.ts` — open DB, create tables per BACKEND_STRUCTURE.md
2. Author `data/fixtures/sample-companies.json` (≥ 30 rows) including:
   - Exact suffix variants (`ACME PVT LTD` / `Acme Private Limited`)
   - Fuzzy pair (`Tekno Solutions` / `Techno Solutions`)
   - Unrelated sparse names
3. Implement `scripts/load-fixtures.ts`
4. Set `dataset_meta` for fixtures

**Success Criteria:**

- [ ] `pnpm db:fixture` creates DB
- [ ] Tables match BACKEND_STRUCTURE.md
- [ ] No director fields exist

**Reference Docs:** BACKEND_STRUCTURE.md sections 2–3, 12

---

## Phase 2: Matching Engine

### Step 2.1: Normalize Module

**Duration:** 2 hours  
**Goal:** Pure normalize function with tests

**Tasks:**

1. Implement `lib/normalize.ts` per BACKEND_STRUCTURE.md section 4
2. Vitest cases for all suffix variants + empty-after-strip

**Success Criteria:**

- [ ] Tests pass for documented examples
- [ ] Suffix-only → empty normalized

**Reference Docs:** BACKEND_STRUCTURE.md §4; PRD Feature 2

---

### Step 2.2: Match Module

**Duration:** 4 hours  
**Goal:** Exact + fuzzy ranking

**Tasks:**

1. Implement exact SQL lookup
2. Implement candidate retrieval + Fuse.js / Levenshtein scoring
3. Map to signal codes: `EXACT_TAKEN` | `SIMILAR` | `LIKELY_UNIQUE`
4. Unit tests: Tekno↔Techno similar; ACME variants exact; unique sparse name

**Success Criteria:**

- [ ] Deterministic ordering
- [ ] ≥ 80% coverage on match+normalize
- [ ] Empty DB path returns error code path (tested at API layer next)

**Reference Docs:** BACKEND_STRUCTURE.md §5; PRD matching logic

---

### Step 2.3: API Route

**Duration:** 3 hours  
**Goal:** Working `POST /api/check`

**Tasks:**

1. Zod schema for body
2. Rate limiter
3. Wire normalize + match + meta + disclaimer + MCA link
4. 400 / 429 / 503 / 500 mapping
5. Integration tests with fixture DB

**Success Criteria:**

- [ ] Curl/fixture tests return shapes from BACKEND_STRUCTURE.md
- [ ] Index-missing → 503, never LIKELY_UNIQUE
- [ ] Rate limit returns 429 after burst

**Reference Docs:** BACKEND_STRUCTURE.md §6–11; APP_FLOW.md decisions

---

## Phase 3: Design System & UI

### Step 3.1: Tokens in Tailwind v4

**Duration:** 2 hours  
**Goal:** `@theme` tokens in `globals.css` per FRONTEND_GUIDELINES + Context7 Tailwind v4

**Tasks:**

1. `next/font` — Fraunces, Source Sans 3, IBM Plex Mono
2. Map colors, radii, shadows, fonts in `@theme { }` inside `app/globals.css` (not v3 `tailwind.config.ts` theme.extend)
3. Atmospheric background on `globals.css`
4. `prefers-reduced-motion` rules
5. Verify utilities (`bg-primary-500`, `font-display`) resolve

**Success Criteria:**

- [ ] No raw hex in components
- [ ] Brand uses display font at hero scale
- [ ] PostCSS uses `@tailwindcss/postcss` only

**Reference Docs:** FRONTEND_GUIDELINES.md §2–3, §6, §12; STANDARDS.md; Context7 `/websites/tailwindcss`

---

### Step 3.2: Core Components

**Duration:** 3 hours  
**Goal:** Button, Input, Signal, MatchList, Alert

**Tasks:**

1. Build components per FRONTEND_GUIDELINES.md §4
2. Ensure 44px targets, labels, focus rings
3. Icons via lucide-react (no emoji)

**Success Criteria:**

- [ ] Story-less manual checklist: keyboard, contrast, loading disable
- [ ] Signal always text + icon

**Reference Docs:** FRONTEND_GUIDELINES.md; ui-ux-pro-max a11y rules

---

### Step 3.3: Home Search + Results Flow

**Duration:** 4 hours  
**Goal:** End-to-end UX on `/`

**Tasks:**

1. One-composition hero: brand, headline, sentence, form
2. Submit → `/api/check` → results region
3. Copy bank from APP_FLOW.md
4. MCA verify external link
5. Disclaimer always visible on results

**Success Criteria:**

- [ ] Happy paths: unique / similar / exact
- [ ] Validation + 503 + 429 UI states
- [ ] First viewport has no stats/cards clutter

**Reference Docs:** APP_FLOW.md Flow 1; PRD UI principles; FRONTEND_GUIDELINES hero rules

---

### Step 3.4: About Page

**Duration:** 1 hour  
**Goal:** Trust + method explanation

**Tasks:**

1. `/about` content: source, name-only policy, disclaimer, links to OGD + MCA
2. Link from footer

**Success Criteria:**

- [ ] User can understand snapshot vs live authority

**Reference Docs:** APP_FLOW.md Flow 2; RESEARCH_MCA.md

---

## Phase 4: OGD Ingest (after Phase 0 confirmation)

### Step 4.1: Implement Ingest Script

**Duration:** 4–6 hours  
**Goal:** Load official Company Master names into SQLite

**Tasks:**

1. Gate: require `CONFIRM_OGD_DOWNLOAD=yes` or `OGD_LOCAL_PATH`
2. Parse ZIP/CSV; map columns with aliases; import CIN + name-level fields only
3. Atomic DB replace + bak + checksum in `dataset_meta`
4. Log row counts; abort if zero rows

**Success Criteria:**

- [x] Without confirmation, script exits non-zero
- [x] With local fixture-sized sample file, ingest works
- [x] Full OGD run only after user confirm
- [x] No personal/director fields imported

**Reference Docs:** RESEARCH_MCA.md §5; BACKEND_STRUCTURE.md §12; TECH_STACK.md scripts

---

### Step 4.2: Performance Pass on Full Index

**Duration:** 2–4 hours  
**Goal:** p95 check < 3s on warm index

**Tasks:**

1. Indexes on `normalized_name`
2. Candidate prefilter before Fuse
3. Optional FTS5 if needed
4. Measure with sample names

**Success Criteria:**

- [x] p95 < 3s locally on sample / warm index (`pnpm db:bench`)
- [x] Memory acceptable for host plan (sql.js sample; full OGD needs confirm + durable disk)

**Reference Docs:** PRD NFR; TECH_STACK.md

---

## Phase 5: Testing & Refinement

### Step 5.1: Unit + API Tests

**Duration:** 3 hours  
**Goal:** Critical paths covered

**Tasks:**

1. Expand normalize/match fixtures to ≥ 30 cases
2. API tests for validation, signal codes, 503
3. `pnpm test` in CI

**Success Criteria:**

- [x] Coverage ≥ 80% on normalize + match
- [x] CI green

---

### Step 5.2: E2E Smoke

**Duration:** 2 hours  
**Goal:** Playwright happy path

**Tasks:**

1. Load fixtures → open `/` → submit → assert signal region
2. Assert MCA link present

**Success Criteria:**

- [x] `pnpm test:e2e` passes against local server

**Reference Docs:** APP_FLOW.md

---

### Step 5.3: Accessibility Sweep

**Duration:** 1–2 hours  
**Goal:** WCAG 2.1 AA basics

**Tasks:**

1. Keyboard-only pass
2. Contrast check on signal colors
3. `aria-live` on results
4. Reduced-motion check

**Success Criteria:**

- [x] Checklist signed off in PR (`docs/A11Y_CHECKLIST.md`)

**Reference Docs:** FRONTEND_GUIDELINES.md §5

---

## Phase 6: Deployment

### Step 6.1: Staging

**Duration:** 2 hours  
**Goal:** Hosted app with fixture or confirmed index

**Tasks:**

1. Deploy Next to Vercel or Render (`0.0.0.0:$PORT`)
2. Attach persistent disk **or** ship prebuilt SQLite artifact
3. Set env vars; `CONFIRM_OGD_DOWNLOAD=no` on server by default
4. Smoke `/api/check` + UI

**Success Criteria:**

- [x] HTTPS URL works (Render Blueprint after push — see README)
- [x] Health/index ready (`GET /api/health`)
- [x] No scrape jobs in deploy scripts (`render.yaml` / `Dockerfile` bake fixtures only)

**Reference Docs:** TECH_STACK.md hosting; Render ephemeral FS constraint

---

### Step 6.2: Production

**Duration:** 2 hours  
**Goal:** Public MVP

**Tasks:**

1. Final disclaimer review
2. Production deploy
3. Monitor 5xx on `/api/check`
4. Keep previous SQLite bak for rollback

**Success Criteria:**

- [x] P0 features live (check + about + fail-closed empty index)
- [x] Snapshot date visible (results meta + health)
- [x] README documents confirm-before-ingest

---

## Milestones & Timeline

### Milestone 1: Foundation + Fixtures

**Target:** End of Week 1

- [ ] App scaffold
- [ ] Fixture DB
- [ ] Normalize + match tests green

### Milestone 2: API + UI

**Target:** End of Week 2

- [ ] `/api/check` complete
- [ ] Home + About UI per guidelines
- [ ] E2E smoke

### Milestone 3: OGD Ingest (blocked on confirmation)

**Target:** Week 3 (after Phase 0)

- [ ] Ingest script gated
- [ ] Full index performance OK

### Milestone 4: MVP Launch

**Target:** End of Week 3–4

- [x] Staging + production (Render Blueprint + health; fixture bake or disk for OGD)
- [x] Docs + README current

---

## Risk Mitigation

### Technical Risks

| Risk                        | Impact   | Mitigation                                                 |
| --------------------------- | -------- | ---------------------------------------------------------- |
| OGD schema differs          | High     | Alias map; inspect headers before full load                |
| Ephemeral disk wipes SQLite | High     | Volume or bake DB into artifact                            |
| Fuzzy too noisy             | Med      | Show list; tune threshold; separate exact band             |
| Accidental scrape code      | Critical | Code review; RESEARCH_MCA out-of-scope; no MCA HTTP client |

### Timeline Risks

| Risk                           | Impact | Mitigation                 |
| ------------------------------ | ------ | -------------------------- |
| Waiting on download confirm    | Med    | Ship fixture mode UI first |
| Scope creep (auth, trademarks) | High   | Stick to PRD P0            |

---

## Success Criteria (Overall)

MVP succeeds when:

1. All P0 features from PRD.md work
2. Flows from APP_FLOW.md work
3. UI matches FRONTEND_GUIDELINES.md
4. API matches BACKEND_STRUCTURE.md
5. Normalize/match coverage ≥ 80%
6. No MCA scrape; OGD only after confirm
7. Empty index fails closed
8. Snapshot date + MCA verify on every successful result
9. Page load < 2s shell; check < 3s p95 warm
10. WCAG 2.1 AA basics met

---

## Post-MVP Roadmap

1. P1: multi-name paste, CSV export, LLP filter
2. User-uploaded official ZIP ingest UI (still no scrape)
3. Optional IP India trademark **link** guidance (not clearance)
4. Redis rate limits / Sentry
5. Hindi UI (P2)
6. CLI package (P2)

---

## Document Index

| Doc                                              | Role                                     |
| ------------------------------------------------ | ---------------------------------------- |
| [RESEARCH_MCA.md](RESEARCH_MCA.md)               | Sources + confirm gate                   |
| [STANDARDS.md](STANDARDS.md)                     | Context7 + awesome-cursorrules contract  |
| [PRD.md](PRD.md)                                 | What / who / success                     |
| [APP_FLOW.md](APP_FLOW.md)                       | Navigation + states                      |
| [TECH_STACK.md](TECH_STACK.md)                   | Exact tools/versions (Context7-verified) |
| [FRONTEND_GUIDELINES.md](FRONTEND_GUIDELINES.md) | Visual system (Tailwind v4 `@theme`)     |
| [BACKEND_STRUCTURE.md](BACKEND_STRUCTURE.md)     | Schema + API (Zod 4 / Next 16 handlers)  |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Build order (this file)                  |

---

## Next Action After Docs

Stop. Do **not** download OGD or implement app until user asks to start Phase 1 and (for Phase 4) confirms ingest.
