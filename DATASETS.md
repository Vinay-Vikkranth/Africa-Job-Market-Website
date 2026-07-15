# Datasets — Africa Skills Observatory

> Last updated: 2026-07-07 · Total jobs ingested: **342** · Unique skills tracked: **198**

---

## Data Sources

| Source | Tag | Jobs | Countries covered | Type |
|---|---|---|---|---|
| RemoteOK | `RemoteOK` | 111 | Nigeria, South Africa, Tanzania | Remote job board (API) |
| Arbeitnow | `Arbeitnow` | 90 | Nigeria | Global job board (API) |
| Adzuna | `Adzuna` | 78 | South Africa, Nigeria | Job search API (paid, currency-converted to USD) |
| Remotive | `Remotive` | 30 | Nigeria, South Africa | Remote job board (API) |
| Careers24 | `Careers24` | 15 | South Africa | African job board (Apify scraper) |
| Fuzu | `Fuzu` | 13 | Kenya | East Africa job board (HTML scraper) |
| Jobberman | `Jobberman` | 4 | Nigeria | West Africa job board (Apify scraper) |
| BrighterMonday | `BrighterMonday` | 1 | Kenya | East Africa job board (Apify scraper) |
| **Total** | | **342** | | |

---

## Data Fields by Source

✅ = provided directly by the API/scraper &nbsp;·&nbsp; 🔍 = inferred/extracted from other fields &nbsp;·&nbsp; ⚠️ = rarely present or approximated &nbsp;·&nbsp; ❌ = not available

| Field | RemoteOK | Adzuna | Remotive | Arbeitnow | Careers24 | Fuzu | Jobberman | BrighterMonday |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Job Title** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Company** | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| **Country** | 🔍 | ✅ | 🔍 | 🔍 | ✅ | 🔍 | 🔍 | 🔍 |
| **City** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| **Salary (min)** | ❌ | ✅ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| **Salary (max)** | ❌ | ✅ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| **Salary currency** | — | ✅ local→USD | USD | — | local text | local text | local text | local text |
| **Skills** | 🔍 | 🔍 | 🔍 | 🔍 | 🔍 | 🔍 | 🔍 | 🔍 |
| **Tech tags (raw)** | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Job description** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| **Posted date** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| **Apply URL** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Job category** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Employment type** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Experience level** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

> **Skills** are never given directly by any source — they are extracted by keyword matching the job title, description, and tags against a dictionary of 13 skill categories (Excel, Python, SQL, Power BI, Cloud, ML, AI, Cybersecurity, etc.).  
> **Country** marked 🔍 means it is detected from the location/description text, not a structured field.

---

## Coverage by Country

| Country | Sources | Jobs |
|---|---|---|
| Nigeria | `RemoteOK` · `Arbeitnow` · `Adzuna` · `Remotive` · `Jobberman` | 256 |
| South Africa | `Adzuna` · `Careers24` · `Remotive` · `RemoteOK` | 71 |
| Kenya | `Fuzu` · `BrighterMonday` | 14 |
| Tanzania | `RemoteOK` | 1 |

---

## Source Details

### `RemoteOK` — 111 jobs

| Field | What the API returns |
|---|---|
| Job Title | `position` — raw title string |
| Company | `company` — company name |
| Country | Inferred from `location` + `description` + `position` text |
| City | First segment of `location` (e.g. `"Lagos, Nigeria"` → `"Lagos"`) |
| Salary | Not provided |
| Skills | Extracted by keyword-matching `position` + `description` + `tags` |
| Tech tags | `tags[]` — array of strings (e.g. `["python", "react", "aws"]`) |
| Description | `description` — full HTML job description |
| Posted date | `date` — ISO datetime string |
| Apply URL | `url` |

- **API:** Public JSON feed — `https://remoteok.com/api`
- **Countries:** Nigeria (109), South Africa (1), Tanzania (1)
- **Sync:** Automatic on every `npm run sync`

---

### `Adzuna` — 78 jobs

| Field | What the API returns |
|---|---|
| Job Title | `title` |
| Company | `company.display_name` |
| Country | `location.display_name` → text detection, falls back to queried market country |
| City | First segment of `location.display_name` |
| Salary min | `salary_min` — local currency, converted to USD at ingest |
| Salary max | `salary_max` — local currency, converted to USD at ingest |
| Skills | Extracted by keyword-matching `title` + `description` |
| Description | `description` — full text |
| Posted date | `created` — ISO datetime |
| Apply URL | `redirect_url` |

- **API:** `https://api.adzuna.com/v1/api/jobs/{market}/search`
- **Auth required:** `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` in `.env`
- **Currency conversion (2026-07 rates):**

  | Market | Local currency | Conversion |
  |---|---|---|
  | South Africa (`za`) | ZAR | ÷ 18.5 → USD |
  | Nigeria (`ng`) | NGN | ÷ 1,600 → USD |
  | Kenya (`ke`) | KES | ÷ 129 → USD |
  | Ghana (`gh`) | GHS | ÷ 15.5 → USD |

- **Countries:** South Africa (51), Nigeria (27)
- **Sync:** Automatic on every `npm run sync`

---

### `Remotive` — 30 jobs

| Field | What the API returns |
|---|---|
| Job Title | `title` |
| Company | `company_name` |
| Country | Inferred from `candidate_required_location` + `description` text |
| City | First segment of `candidate_required_location` |
| Salary | `salary` — free-text string (e.g. `"$80,000 - $120,000"`) → parsed to min/max |
| Skills | Extracted from `title` + `description` + `tags` + `category` |
| Tech tags | `tags[]` |
| Job category | `category` (e.g. `"Software Development"`, `"Finance"`) |
| Description | `description` — full HTML |
| Posted date | `publication_date` — ISO datetime |
| Apply URL | `url` |

- **API:** `https://remotive.com/api/remote-jobs` — free public API
- **Countries:** Nigeria (26), South Africa (4)
- **Sync:** Automatic on every `npm run sync`

---

### `Arbeitnow` — 90 jobs

| Field | What the API returns |
|---|---|
| Job Title | `title` |
| Company | `company_name` |
| Country | Inferred from `location` + `description` + `title` text |
| City | First segment of `location` |
| Salary | Not provided |
| Skills | Extracted from `title` + `description` + `tags` |
| Tech tags | `tags[]` |
| Description | `description` — full HTML |
| Posted date | `created_at` — Unix timestamp (seconds) |
| Apply URL | `url` |

- **API:** `https://www.arbeitnow.com/api/job-board-api` — free public API
- **Countries:** Nigeria (90)
- **Sync:** Automatic on every `npm run sync`

---

### `Careers24` — 15 jobs  _(via Apify)_

| Field | What the scraper returns |
|---|---|
| Job Title | `title` |
| Company | `company` (sometimes null → stored as `"Unknown"`) |
| Country | `location_country` — ISO-2 code (e.g. `"ZA"`) → mapped to country name |
| City | `location_city` |
| Salary | `salary_range` — free-text string → parsed to min/max |
| Currency | `currency` field (if present) |
| Skills | Extracted from `title` + `description` |
| Description | `description` |
| Employment type | `employment_type` (e.g. `"Full-time"`, `"Contract"`) |
| Experience level | `experience_level` (e.g. `"Senior"`, `"Mid-level"`) |
| Posted date | `posted_at` — text like `"Posted: 07 Jul 2026 … 30 Days left"` → parsed |
| Apply URL | `apply_url` |

- **Ingestion:** Apify actor `6fF8mqZ0K0JhnB0RM` — runs `careers24`, `jobberman`, `brightermonday`, `myjobmag` platforms
- **Countries:** South Africa (15)
- **Sync:** Via `npm run sync` or `npx tsx scripts/ingest-apify-dataset.ts <DATASET_ID>`

---

### `Fuzu` — 13 jobs

| Field | What the scraper returns |
|---|---|
| Job Title | `title` — from JSON-LD `JobPosting.title` or HTML heading |
| Company | `hiringOrganization.name` from JSON-LD, or HTML element |
| Country | Inferred from `jobLocation` + `description` text; defaults to Kenya |
| City | First segment of location text |
| Salary | `baseSalary` from JSON-LD → parsed to min/max (rarely present) |
| Skills | Extracted from `title` + `description` |
| Description | `description` from JSON-LD or page body text |
| Posted date | `datePosted` from JSON-LD; defaults to now if absent |
| Apply URL | `url` / `sameAs` from JSON-LD |

- **Ingestion:** Direct HTML scraper — fetches `https://fuzu.com/jobs` + 5 search paths, parses JSON-LD first then falls back to HTML card parsing
- **Countries:** Kenya (13)
- **Sync:** Automatic on every `npm run sync`

---

### `Jobberman` — 4 jobs

| Field | What the scraper returns |
|---|---|
| Job Title | `title` — from JSON-LD or HTML heading |
| Company | `hiringOrganization.name` or HTML element (often missing) |
| Country | Inferred from location + description text; defaults to Nigeria |
| City | First segment of location text |
| Salary | `baseSalary` from JSON-LD or text (rarely present) |
| Skills | Extracted from `title` + page body text |
| Description | Page body text (up to 2,000 chars) |
| Posted date | `datePosted` from JSON-LD; defaults to now (JS-rendered) |
| Apply URL | Job listing URL |

- **Ingestion:** Apify actor `6fF8mqZ0K0JhnB0RM` + HTML scraper fallback (`lib/sources/african-boards.ts`)
- **Countries:** Nigeria (4)
- **Note:** Page is JavaScript-rendered — scraper yields are low without Apify

---

### `BrighterMonday` — 1 job

| Field | What the scraper returns |
|---|---|
| Job Title | `title` — from JSON-LD or HTML heading |
| Company | `hiringOrganization.name` or HTML element (often missing) |
| Country | Inferred from location + description text; defaults to Kenya |
| City | First segment of location text |
| Salary | `baseSalary` from JSON-LD (rarely present) |
| Skills | Extracted from `title` + page body text |
| Description | Page body text (up to 2,000 chars) |
| Posted date | `datePosted` from JSON-LD; defaults to now (JS-rendered) |
| Apply URL | Job listing URL |

- **Ingestion:** Apify actor `6fF8mqZ0K0JhnB0RM` + HTML scraper fallback (`lib/sources/african-boards.ts`)
- **Countries:** Kenya (1)
- **Note:** JavaScript-rendered; low yield from current scraper

---

## Latest Sync Runs

| Ran at (UTC) | Source | Inserted | Updated | Status |
|---|---|---|---|---|
| 2026-07-07 18:33 | `Apify` | 0 | 0 | ✅ success |
| 2026-07-07 18:31 | `Fuzu` | 0 | 10 | ✅ success |
| 2026-07-07 18:31 | `BrighterMonday` | 0 | 80 | ✅ success |
| 2026-07-07 18:31 | `Jobberman` | 0 | 80 | ✅ success |
| 2026-07-07 18:31 | `RemoteOK` | 0 | 77 | ✅ success |
| 2026-07-07 18:31 | `Arbeitnow` | 0 | 54 | ✅ success |
| 2026-07-07 18:31 | `Adzuna` | 0 | 50 | ✅ success |
| 2026-07-07 18:31 | `Remotive` | 0 | 27 | ✅ success |

---

## Deduplication

Cross-source duplicates are skipped at ingest time. If a job with the same **title + company + country** already exists in the database under a different external ID, the incoming record is discarded. Jobs from unknown/anonymous companies are exempt from this check to avoid false positives.

---

## Adding More Data

To ingest a specific Apify dataset run:

```bash
npx tsx scripts/ingest-apify-dataset.ts <DATASET_ID>
```

To trigger a full sync across all sources:

```bash
npm run sync
```

To add a new country or source, see `lib/sources/` and register it in `lib/sync-jobs.ts`.
