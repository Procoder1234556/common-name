# Application Flow Documentation — Common Name

## 1. Entry Points

### Primary Entry Points

- **Direct URL:** `/` — single-composition search landing (brand + headline + search)
- **Landing Page:** Same as `/` — no separate marketing multi-section first viewport
- **Deep Links:** `/#check` or `/ ?q=` optional prefill (P1: `?q=Techno%20Solutions` runs after confirm)
- **OAuth/Social Login:** None (MVP — no auth)

### Secondary Entry Points

- **Search Engine:** SEO landing = `/` with title/description about MCA name uniqueness signal
- **About:** `/about` — how it works, data source, disclaimer (linked from footer)
- **Marketing Campaigns:** Same `/` with UTM params only (no alternate first-viewport layouts)

---

## 2. Core User Flows

### Flow 1: Name Uniqueness Check

**Goal:** Learn how common/unique a proposed company name is in the MCA snapshot  
**Entry Point:** `/` search form  
**Frequency:** High — primary product action

#### Happy Path

1. **Page: Home (Search)**
   - Elements: Brand “Common Name”, one headline, one supporting sentence, name input, primary CTA “Check uniqueness”, footer disclaimer link
   - User Action: Types proposed name (e.g. `Zephryn Analytic Works`)
   - Validation (client): required; trim; length 2–120; no only-punctuation
   - Trigger: Submit (Enter or button)

2. **System Action:** `POST /api/check` with `{ "name": "..." }`
   - Loading: Button disabled + spinner; results region `aria-busy=true`

3. **Page: Home (Results — same route)**
   - Elements:
     - Uniqueness signal (text + icon)
     - Counts: exactCount, similarCount
     - Snapshot date + source attribution
     - Match list (name, CIN, status, similarity band)
     - CTA: “Verify on MCA” (external)
   - Success State: Signal + list or empty-match empty state

4. **Optional:** User clicks “Verify on MCA” → official portal (new tab, `rel="noopener noreferrer"`)

#### Error States

- **Empty / too short name**
  - Display: Inline error under input: “Enter at least 2 characters”
  - Action: User corrects; no API call

- **Too long (>120)**
  - Display: Inline error
  - Action: Truncate not auto-applied; user shortens

- **Dataset not loaded**
  - Display: Error alert: “Company name index unavailable. Snapshot not loaded.”
  - Action: Retry; link to `/about` explaining fixture vs OGD
  - Signal: Must **not** say “likely unique”

- **Server / 500**
  - Display: “Something went wrong. Try again.”
  - Action: Retry button keeps form value

- **429 Rate limited**
  - Display: “Too many checks. Wait a minute and try again.”
  - Action: Disable submit until Retry-After if provided

- **Network offline**
  - Display: Offline banner + keep form data
  - Action: User retries when online

#### Edge Cases

- User submits same name twice → return cached response optional (P1); MVP may recompute
- User clears input after results → clear results region
- Index returns exact + similar → exact rows pinned above similar
- Name is only a legal suffix (`Private Limited`) → validation error: “Enter a distinctive name, not only a legal ending”

#### Exit Points

- Success: Remain on `/` with results
- Abandonment: Navigate away
- External: MCA portal

---

### Flow 2: Understand Trust / Data Source

**Goal:** Understand snapshot vs live MCA authority  
**Entry Point:** Footer “How it works” → `/about`

#### Happy Path

1. **Page: About**
   - Elements: Data source (data.gov.in / MCA Company Master), what we store (name-level only), what we don’t (directors), disclaimer, link to RESEARCH notes summary
2. User returns to `/` via “Check a name”

#### Exit Points

- Back to search
- External MCA / data.gov.in links

---

### Flow 3: Operator Ingest (non-UI MVP)

**Goal:** Load OGD company names into local index  
**Entry Point:** CLI / script (not public UI)  
**Gate:** Requires explicit confirmation flag per RESEARCH_MCA.md

#### Happy Path

1. Operator confirms download allowed
2. Script downloads/parses OGD ZIP (or local path)
3. Writes `companies` + `dataset_meta`
4. Health check: `/api/check` with fixture name returns 200

#### Error States

- Missing confirmation flag → abort with message
- Parse failure → rollback to previous index file
- Empty parse → fail closed (do not publish empty as unique)

---

## 3. Navigation Map

### Primary Navigation

```
Common Name
├── /                 Search + Results (public)
├── /about            How it works / disclaimer (public)
└── /api/check        JSON API (public, rate-limited)
```

### Navigation Rules

- **Authentication Required:** None
- **Redirect Logic:** N/A
- **Back Button Behavior:** Preserves input; results may clear unless using history state (P1: restore last result)

---

## 4. Screen Inventory

### Screen: Home — Search / Results

- **Route:** `/`
- **Access:** Public
- **Purpose:** Submit proposed name; view uniqueness signal and matches
- **Key Elements:**
  - Brand wordmark
  - Headline (does not overpower brand)
  - Supporting sentence
  - Name input + Check button
  - Results region (signal, counts, table/list, disclaimer, MCA CTA)
- **Actions Available:**
  - Submit check → Results on same page
  - Verify on MCA → External
  - About → `/about`
- **State Variants:** Idle, Loading, Success (unique / exact / similar), Error (validation / empty-index / server / rate-limit), Offline

### Screen: About

- **Route:** `/about`
- **Access:** Public
- **Purpose:** Explain method, sources, limitations
- **Key Elements:** Source links, field policy, disclaimer
- **Actions:** Back to check, external OGD/MCA links
- **State Variants:** Static

### Screen: API (non-visual)

- **Route:** `POST /api/check`
- **Access:** Public rate-limited
- **Purpose:** Machine-readable check
- **State Variants:** 200 / 400 / 429 / 503 (index missing) / 500

---

## 5. Interaction Patterns

### Pattern: Name Check Submission

- Validation: Client-side instant + server-side on submit
- Loading: Disabled button, spinner, `aria-busy` on results
- Success: Inline results below form (no navigation)
- Error: Inline under field or alert above results; keep form data

### Pattern: External Authority Link

- Always new tab
- Label: “Verify on MCA (official)”
- Shown even when 0 matches

### Pattern: Match List

- Not a dashboard of cards; simple list/table for interaction/scan
- Keyboard: focusable rows optional; links on CIN if deep-link available (P1)

---

## 6. Decision Points

### Decision: Input Validity

```
IF name trimmed length < 2 OR length > 120
THEN show validation error AND do not call API
ELSE IF name normalizes to empty (suffix-only)
THEN show “Enter a distinctive name…” AND do not call API
ELSE
THEN POST /api/check
```

### Decision: Uniqueness Signal

```
IF dataset_meta missing OR company count = 0
THEN signal = UNAVAILABLE (error) — never “likely unique”
ELSE IF exactCount >= 1
THEN signal = EXACT_TAKEN (“N exact matches — name appears taken”)
ELSE IF similarCount >= 1
THEN signal = SIMILAR (“N similar names exist — review carefully”)
ELSE
THEN signal = LIKELY_UNIQUE (“0 matches — likely unique in snapshot”)
```

### Decision: Rate Limit

```
IF requests from IP > 30 per 15 minutes
THEN return 429 AND disable submit with wait message
ELSE process check
```

---

## 7. Error Handling Flows

### 404 Not Found

- Display: Simple not-found with link Home
- Actions: Home
- Log: path

### 500 Server Error

- Display: Friendly alert on home results region
- Actions: Retry
- Fallback: Keep typed name

### Network Offline

- Display: Banner “You appear offline”
- Actions: Retry when online
- Recovery: Re-enable submit on `online` event

### Index Unavailable (503)

- Display: Clear operator-facing message for public: “Index unavailable”
- Actions: Link About; Retry

---

## 8. Responsive Behavior

### Mobile-Specific Flows

- Navigation: Brand + About text link (no hamburger needed — 2 destinations)
- Forms: Full-width input; CTA full-width below
- Match list: Stacked rows (name primary; CIN/status secondary)

### Desktop-Specific Flows

- Search composition centered, max-width ~40rem for form
- Match list: Multi-column table (Name | CIN | Status | Match type)

---

## 9. Animation & Transitions

### Page Transitions

- **Navigation:** Fade 200ms (respect `prefers-reduced-motion`)
- **Results appear:** Opacity 0→1 200ms; no layout jump (reserve results min-height)

### Micro-interactions

- **Button Click:** Press feedback (scale 0.98)
- **Form Focus:** Border + ring via tokens
- **Loading:** Spinner only — no decorative noise

### Motion Rules (ui-ux-pro-max aligned)

- Animate transform/opacity only
- Disable non-essential motion when `prefers-reduced-motion: reduce`
- Loading feedback mandatory on async check

---

## 10. Copy Bank (Canonical)

| Context        | Copy                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------- |
| Headline       | See how unique your company name is in India’s register                                      |
| Supporting     | Snapshot from official MCA company master open data — not a reservation                      |
| CTA            | Check uniqueness                                                                             |
| Exact signal   | {n} exact matches — name appears taken                                                       |
| Similar signal | {n} similar names exist — review carefully                                                   |
| Unique signal  | 0 matches — likely unique in snapshot                                                        |
| Disclaimer     | This is a snapshot uniqueness signal. MCA live search and SPICe+ approval are authoritative. |
| MCA CTA        | Verify on MCA (official)                                                                     |

---

## 11. Consistency with PRD

- Screens map to PRD information architecture (`/`, `/about`, `/api/check`)
- No auth flows (out of MVP)
- No bulk scrape flows in product UI
- Implementation style: [STANDARDS.md](STANDARDS.md) (Context7 + awesome-cursorrules App Router)
