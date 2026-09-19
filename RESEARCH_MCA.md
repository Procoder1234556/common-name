# MCA Data Access Research — Common Name

**Product:** Common Name  
**Research date:** 2026-09-19  
**Status:** Locked for MVP documentation  
**Action gate:** Do **not** download bulk datasets or hit rate-limited endpoints until the user explicitly confirms.

---

## 1. Executive finding

India’s Ministry of Corporate Affairs (MCA) publishes **company master data** as open government data. There is **no official public API** for programmatic “check company name availability.” The live MCA21 / V3 portal offers a public name/master-data search UI (often CAPTCHA-gated). Third-party “MCA APIs” are non-official and out of scope.

**Chosen integration:** ingest official **Company Master Data** (OGD / NDSAP) into a local name-only index; single-query fuzzy/exact lookup; always deep-link users to the official MCA portal for live verification and SPICe+ name reservation.

---

## 2. Sources evaluated

| Source                                           | URL                                                                                       | Access model                                                                            | Verdict                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| MCA portal (home / MCA21 V3)                     | https://www.mca.gov.in/                                                                   | Live UI; login for filing; CAPTCHA on many services                                     | **Do not scrape.** Use for “Verify on MCA” links only    |
| Check Company/LLP Name (FO Services)             | Path via MCA Services → FO Services → Check Company/LLP Name                              | Public single-query UI                                                                  | Manual / deep-link only                                  |
| Company/LLP Master Data (V3)                     | https://www.mca.gov.in/content/mca/global/en/mca/master-data/MDS/company-master-info.html | Live lookup; CAPTCHA on some actions                                                    | Authoritative live check; no automation                  |
| Company Master Data (data.gov.in)                | https://data.gov.in/catalog/company-master-data                                           | ZIP / catalog under NDSAP; Contributor: MCA; Updated On noted as 22/07/2026 in research | **Primary bulk source** for MVP index                    |
| CDM MCA Company Master Details                   | https://www.mcacdm.nic.in/company-master-details                                          | Filter + Export with CAPTCHA; snapshot dated in UI (e.g. 6 Aug 2026)                    | Manual refresh option only — no automated CAPTCHA bypass |
| IndiaAI / AIKosh mirror                          | https://aikosh.indiaai.gov.in/home/datasets/details/company_master_data.html              | Open Government License, India; monthly granularity                                     | Secondary / mirror if OGD ZIP unavailable                |
| Third-party MCA APIs (e.g. commercial resellers) | Various                                                                                   | Paid / unverified provenance                                                            | **Out of scope**                                         |

---

## 3. What the open dataset contains (name-level)

Company Master Data typically includes (non-exhaustive):

- Corporate Identification Number (CIN)
- Company Name
- Company Status
- Company Class / Category
- Authorized / Paid-up Capital (INR)
- Date of Registration
- Registered State
- Registrar of Companies (RoC)

**Common Name will persist only:** CIN, company name, normalized name, status, class, state, registration date, plus dataset metadata (snapshot date, source URL, ingest checksum).

**Explicitly excluded from storage and UI:** director names, DIN/DPIN, shareholder data, emails, residential addresses of individuals, DSC/signatory personal fields.

---

## 4. Terms and compliance stance

1. Prefer **official open data** released under NDSAP / Open Government License, India over any portal scrape.
2. Treat MCA live portal Terms of Service as prohibiting unauthorized automated bulk access and CAPTCHA bypass.
3. Product is a **snapshot-based uniqueness signal**, not a substitute for statutory name reservation (SPICe+ Part A / MCA approval).
4. Do not claim “name available” as a legal guarantee; copy must say “likely unique in snapshot” / “N similar names in snapshot.”
5. Respect robots.txt and catalog rate limits when downloading OGD assets — **user confirmation required before first download.**
6. No personal/director-level data collection or display.

---

## 5. Confirm-before-download gate

Before any implementation step that:

- Downloads the Company Master Data ZIP from data.gov.in / mirrors
- Hits data.gov.in catalog APIs repeatedly
- Triggers CDM “Export Data”

…the agent or developer **must stop and get explicit user confirmation**.

Allowed without that gate:

- Writing documentation (this file and sibling docs)
- Scaffolding app code with empty/fixture index
- Unit tests against synthetic company-name fixtures

---

## 6. Fallback if bulk ingest is blocked or unavailable

1. Ship UI that guides the user through the official MCA “Check Company/LLP Name” / Master Data search (step-by-step + deep links).
2. Optionally accept a user-uploaded official CSV/ZIP they obtained themselves under OGD terms.
3. Do **not** fall back to scraping MCA or buying unofficial scraper APIs for MVP.

---

## 7. Matching approach (preview)

Documented fully in `PRD.md` and `BACKEND_STRUCTURE.md`:

- Normalize legal suffixes (`Private Limited` ↔ `Pvt Ltd` ↔ `Ltd`, `LLP`, punctuation, case)
- Exact match on normalized form
- Fuzzy / phonetic similarity (token overlap + edit distance; e.g. Tekno ↔ Techno)
- Output: uniqueness signal + ranked closest matches + snapshot date + MCA verify link

---

## 8. References

- MCA: https://www.mca.gov.in/
- OGD Company Master Data: https://data.gov.in/catalog/company-master-data
- CDM portal: https://www.mcacdm.nic.in/
- CDM company master: https://www.mcacdm.nic.in/company-master-details
- Master Data Services: https://www.mca.gov.in/content/mca/global/en/mca/master-data/MDS.html
- Public explainers (non-authoritative UX guides): LegalWiz / Legal Suvidha MCA name-check articles (2025–2026)

---

## 9. Decision log

| Decision               | Choice                         | Rationale                                                             |
| ---------------------- | ------------------------------ | --------------------------------------------------------------------- |
| Primary data           | OGD Company Master Data        | Official bulk names; NDSAP; no CAPTCHA bypass                         |
| Live MCA automation    | None                           | No public API; CAPTCHA; ToS risk                                      |
| Scope of stored fields | Name-level only                | Brief + privacy boundary                                              |
| App stack              | Next 16 / Tailwind 4 / Zod 4   | Context7 + npm verified 2026-09-19 — see TECH_STACK.md / STANDARDS.md |
| Next write action      | Full product docs in repo root | Plan phase — no ingest yet                                            |
