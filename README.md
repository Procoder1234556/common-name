# Common Name

Check proposed Indian company names against a **local Company Master snapshot** (name-level fields only). Advisory signal — always verify on MCA before filing.

## Status

**Phase 6+:** https://common-name.onrender.com — cache → OGD SQLite → MCA deep-link. Build bakes public **Goa** Company Master OGD (**~7.3k** names) into `companies.sqlite.seed`; start copies seed onto empty Render disk (`/var/data`). 404 + mobile + disclaimer shipped. Full nationwide RoC dump: browser download per state on data.gov.in, then replace disk SQLite.

## Prerequisites

- Node.js **≥ 22.13** (better-sqlite3 engines)
- pnpm 10.x

## Setup

```bash
pnpm install
cp .env.example .env.local   # already defaults CONFIRM_OGD_DOWNLOAD=no
pnpm db:fixture
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script                      | Purpose                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                  | Next.js + Turbopack                                                                                           |
| `pnpm build` / `pnpm start` | Production build; bind `0.0.0.0` (Render sets `PORT`)                                                         |
| `pnpm deploy:prepare`       | Fixture bake + build (same as Render build, local)                                                            |
| `pnpm type-check`           | `tsc --noEmit`                                                                                                |
| `pnpm lint`                 | ESLint                                                                                                        |
| `pnpm test`                 | Vitest (normalize, match, API, ingest, health)                                                                |
| `pnpm test:coverage`        | Vitest + ≥80% gate on `lib/normalize` + `lib/match`                                                           |
| `pnpm test:e2e`             | Playwright smoke (fixtures → home → signal + MCA)                                                             |
| `pnpm db:fixture`           | Load synthetic companies into `data/companies.sqlite`                                                         |
| `pnpm db:ingest`            | OGD ZIP/CSV ingest — **refuses** unless `CONFIRM_OGD_DOWNLOAD=yes` (+ `OGD_DOWNLOAD_URL`) or `OGD_LOCAL_PATH` |
| `pnpm db:ingest-api`        | Nationwide via official **data.gov.in API** — needs `CONFIRM_OGD_DOWNLOAD=yes` + `DATA_GOV_IN_API_KEY`        |
| `pnpm db:bench`             | Warm-index match latency (target p95 &lt; 3s)                                                                 |
| `pnpm db:gen-ogd-sample`    | Regenerate `data/fixtures/ogd-sample.csv`                                                                     |

### Local sample ingest (no network)

```bash
# PowerShell
$env:OGD_LOCAL_PATH=".\data\fixtures\ogd-sample.csv"
pnpm db:ingest
pnpm db:bench
```

Restart `pnpm dev` after ingest so the sql.js singleton re-reads the DB file.

### Confirmed OGD download (required before any network fetch)

1. Set `CONFIRM_OGD_DOWNLOAD=yes`
2. **Best (nationwide):** create a free API key at [data.gov.in](https://data.gov.in/) → set `DATA_GOV_IN_API_KEY` → `pnpm db:ingest-api` (optional `OGD_MAX_ROWS=5000` smoke first). Resource id defaults to RoC-wise Company Master (`4dbe5667-…`).
3. Or set `OGD_DOWNLOAD_URL` to a **direct HTTPS** Company Master ZIP/CSV from data.gov.in
4. Or set `OGD_LOCAL_PATH` to a file you already obtained under OGD terms
5. Never scrape the MCA live portal — UI “Verify on MCA” deep-links to official FO name search
6. Keep prior `data/companies.sqlite.bak` for rollback after ingest
7. After ingest: `pnpm db:seed-artifact` then redeploy / copy SQLite onto Render disk (`/var/data`)

## Database

Schema matches [BACKEND_STRUCTURE.md](BACKEND_STRUCTURE.md). Runtime uses **sql.js** (WASM) by default (`COMPANIES_DB_DRIVER=sqljs`). Ingest builds the file with **better-sqlite3** (indexes + FTS5).

`better-sqlite3` stays available for Linux/CI native reads when rebuild works. sql.js WASM build lacks FTS5 — match uses token `LIKE` prefilter (FTS path activates when a driver with FTS5 is used).

## Hosting (Render)

### Staging (fixtures)

1. Push this repo to GitHub/GitLab/Bitbucket (done: https://github.com/Procoder1234556/common-name)
2. Open Blueprint: [Apply on Render](https://dashboard.render.com/blueprint/new?repo=https://github.com/Procoder1234556/common-name)
3. Apply `render.yaml` — build runs `pnpm db:fixture && pnpm build` only (no scrape jobs)
4. Set `NEXT_PUBLIC_APP_URL` to the HTTPS service URL after first deploy
5. Keep `CONFIRM_OGD_DOWNLOAD=no` on the server
6. Smoke: `GET /api/health` → `ok: true`; `POST /api/check`; UI shows snapshot + disclaimer

Connect GitHub to Render if Dashboard asks (Account → Linked Accounts). Bind: `pnpm start` uses host `0.0.0.0`; Render injects `PORT`.

### Production (confirmed index)

- Attach a **persistent disk** — Render ephemeral FS wipes local writes on restart
- `COMPANIES_DB_PATH=/var/data/companies.sqlite`; build still bakes Goa seed for first boot
- `COMPANIES_DB_DRIVER=better-sqlite3` (FTS5/BM25 at runtime)
- Upload nationwide SQLite after local ingest (see **Free all-India index** above) — skip Supabase
- Monitor structured JSON logs for `SERVER_ERROR` / `INDEX_UNAVAILABLE` on `/api/check` and `/api/health`
- `GET /api/health` returns `index.rowCount`, `snapshotLabel`, `snapshotAt` for scope checks

Optional image: `Dockerfile` bakes fixtures the same way (still no OGD/MCA network in build).

### Disclaimer (MVP)

Every successful check returns: _This is a snapshot uniqueness signal. MCA live search and SPICe+ approval are authoritative._ Snapshot label/date appear in the results meta.

## Docs

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), [STANDARDS.md](STANDARDS.md), [TECH_STACK.md](TECH_STACK.md), [RESEARCH_MCA.md](RESEARCH_MCA.md).
