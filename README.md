# Skills Observatory (Africa Workforce Insights)

Production-style dashboard tracking labor market demand across all 54 African countries, using 100% real job posting data — no synthetic or demo records.

## Features

- Full dashboard with 7 working pages (Overview, Jobs, Skills, Salary, Gaps, Reports, Alerts)
- **All 54 African countries** covered in filters, detection, and the choropleth map
- **Real data only** — every job record comes from a live API or job board
- **13 data ingestion sources**: Freehire, Remotive, Arbeitnow, RemoteOK, BrighterMonday, Jobberman, UNDP, UN Careers, UN Women, plus optional Adzuna, Jooble, ReliefWeb, and Apify
- **Auto-sync every 6 hours** via Vercel cron (`/api/cron/sync`)
- **PDF + CSV annual reports**
- **Africa choropleth map** with country-level job intensity
- **Sync history** tracking in database
- **PostgreSQL-ready** for production (SQLite for local dev)

## Quick Start

```bash
npm install
npx prisma migrate dev
npm run db:seed   # pulls live jobs from all sources
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Sync Data** to refresh.

## Data Sources

| Source | Key required | Coverage |
|--------|--------------|----------|
| Freehire | No | Africa-wide (regions=africa filter) |
| Remotive | No | Remote jobs mentioning African locations |
| Arbeitnow | No | Remote jobs mentioning African locations |
| RemoteOK | No | Remote jobs mentioning African locations |
| BrighterMonday | No (scraped JSON-LD) | Kenya, Ghana |
| Jobberman | No (scraped JSON-LD) | Nigeria |
| UNDP | No (official careers endpoint) | UNDP vacancies across African duty stations |
| UN Careers | No (official RSS) | UN vacancies across African duty stations |
| UN Women | No (official RSS) | UN Women vacancies across African duty stations |
| Adzuna | `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` | South Africa |
| Jooble | `JOOBLE_COUNTRY_KEYS` (per-country African hosts) | Only with country-specific keys; a US key returns US false positives |
| ReliefWeb | `RELIEFWEB_APPNAME` | UN/NGO jobs, all of Africa |
| Apify | `APIFY_TOKEN` | Jobberman, BrighterMonday, Careers24, MyJobMag |

Copy `.env.example` to `.env` and add keys to unlock the optional sources — all free tiers:

- Adzuna: https://developer.adzuna.com
- Jooble: https://jooble.org/api/about
- ReliefWeb: https://apidoc.reliefweb.int/parameters#appname
- Apify: https://apify.com

## Data Integrity

- No seeded/synthetic records — the database only contains ingested postings
- Country assignment uses structured source location fields only; matching supports all 54 countries, aliases, capitals, and major cities
- Salaries are stored only when clearly annual USD (parsed `$`/`USD` amounts with `k` handling, plausibility bounds); local-currency salaries are not mislabeled
- Scrapers ingest only structured JSON-LD `JobPosting` data, never navigation links

## Pages

| Route | Description |
|-------|-------------|
| `/` | Overview dashboard |
| `/jobs` | Live job postings table |
| `/skills` | Skill demand analysis |
| `/salary` | Salary insights |
| `/gaps` | Skill gap analysis |
| `/reports` | CSV/PDF export + sync history |
| `/alerts` | Data-driven alerts |

## API Endpoints

- `GET /api/overview?country=Kenya`
- `GET /api/jobs?country=Nigeria&page=1`
- `GET /api/reports?country=Kenya` — CSV
- `GET /api/reports/pdf?country=Kenya` — PDF
- `GET /api/sync/history` — sync run log
- `POST /api/sync` — manual full sync
- `GET /api/cron/sync` — scheduled sync (requires `CRON_SECRET`)

## Deployment

See [DEPLOY.md](./DEPLOY.md) for Vercel, Railway, and Docker PostgreSQL setup.

## Commands

- `npm run dev` — local development
- `npm run sync` — pull from all job sources
- `npm run sync:official` — pull only official UNDP, UN Careers, and UN Women feeds
- `npm run build` — production build
- `docker compose up -d` — local PostgreSQL
