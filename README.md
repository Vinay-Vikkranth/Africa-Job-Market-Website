# Skills Observatory — Africa Workforce Insights

A production-style analytics dashboard tracking labor market demand across Africa. Built to answer: *what skills are employers actually hiring for?*

---

## Live Data Sources

### Currently Active (347 jobs in DB)

| Source | Type | Countries | Jobs | Notes |
|--------|------|-----------|------|-------|
| **Adzuna API** | REST API | South Africa, Nigeria, Kenya, Ghana | ~80 | Official API — salaries auto-converted from local currency to USD |
| **RemoteOK** | Free API | Africa-filtered global | ~111 | Remote tech roles mentioning African countries |
| **Arbeitnow** | Free API | Africa-filtered global | ~92 | European + remote roles filtered to Africa |
| **Remotive** | Free API | Africa-filtered global | ~31 | Remote jobs filtered to Africa |
| **Careers24** | Apify scraper | South Africa | ~15 | Scraped via Apify actor `jungle_synthesizer/africa-jobs-aggregator-scraper` |
| **Fuzu** | HTML scraper | Kenya, East Africa | ~13 | JSON-LD + HTML parsing |
| **Jobberman** | HTML scraper | Nigeria | ~4 | Sparse — JS-rendered site |
| **BrighterMonday** | HTML scraper | Kenya, Ghana | ~1 | Sparse — JS-rendered site |

---

## API Keys Required

Copy `.env.example` to `.env` and fill in:

```env
# Database
DATABASE_URL="file:./dev.db"

# Adzuna — free at developer.adzuna.com
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key

# Apify — africa-jobs-aggregator-scraper (Careers24, Jobberman, BrighterMonday)
APIFY_TOKEN=your_apify_token

# Cron protection (production only)
CRON_SECRET=your_secret
```

---

## Data Coverage by Country

| Country | Flag | Has Data Source | Jobs (approx) |
|---------|------|----------------|---------------|
| South Africa | 🇿🇦 | Adzuna ZA + Careers24 (Apify) | ~50 |
| Nigeria | 🇳🇬 | Adzuna NG + Jobberman | ~30 |
| Kenya | 🇰🇪 | Adzuna KE + BrighterMonday + Fuzu | ~25 |
| Ghana | 🇬🇭 | Adzuna GH + BrighterMonday | ~15 |
| Tanzania | 🇹🇿 | Fuzu (partial) | ~5 |
| Rwanda | 🇷🇼 | Fuzu (partial) | ~3 |
| All others | — | None yet | 0 |

**Countries needing data sources:** Algeria, Angola, Benin, Botswana, Burkina Faso, Burundi, Cameroon, Central African Republic, Chad, DR Congo, Djibouti, Egypt, Equatorial Guinea, Eritrea, Eswatini, Ethiopia, Gabon, Gambia, Guinea, Guinea-Bissau, Lesotho, Liberia, Libya, Madagascar, Malawi, Mali, Mauritania, Morocco, Mozambique, Namibia, Niger, Republic of Congo, Senegal, Sierra Leone, Somalia, South Sudan, Sudan, Togo, Tunisia, Uganda, Zambia, Zimbabwe.

---

## Quick Start

```bash
npm install
npx prisma migrate dev
npx prisma generate
npm run db:seed     # migrates + pulls live data on first run
npm run dev         # http://localhost:3000
```

### Useful commands

```bash
npm run sync        # manually pull fresh jobs from all sources
npm run dev         # start local dev server
npm run build       # production build
```

### Ingest a specific Apify dataset

```bash
npx tsx scripts/ingest-apify-dataset.ts <DATASET_ID>
```

---

## Dashboard Pages

| Route | Description |
|-------|-------------|
| `/` | Overview — KPIs, map, top skills, salary by country |
| `/jobs` | Live job postings table with search/filter |
| `/skills` | Skill demand frequency analysis |
| `/salary` | Salary insights by country and role |
| `/tech` | Emerging technology growth trends |
| `/gaps` | Skill gap analysis (demand vs supply) |
| `/reports` | CSV/PDF export + sync history |
| `/alerts` | Data-driven market alerts |

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/overview?country=Kenya` | Dashboard KPIs + charts data |
| `GET /api/jobs?country=Nigeria&page=1` | Paginated job listings |
| `GET /api/skills?country=Ghana` | Skill frequency data |
| `GET /api/reports?country=Kenya` | CSV export |
| `GET /api/reports/pdf?country=Kenya` | PDF annual report |
| `GET /api/sync/history` | Sync run log |
| `POST /api/sync` | Trigger manual full sync |
| `GET /api/cron/sync` | Scheduled sync (requires `CRON_SECRET`) |

---

## Auto-Sync (Vercel)

Configured in `vercel.json` — syncs all sources every 6 hours automatically when deployed to Vercel:

```json
{
  "crons": [{ "path": "/api/cron/sync", "schedule": "0 */6 * * *" }]
}
```

Locally, use `npm run sync` or click **Sync Data** in the dashboard.

---

## Currency Conversion

Adzuna returns salaries in local currency. The system converts to USD automatically:

| Country | Currency | Rate (approx, 2026-07) |
|---------|----------|------------------------|
| South Africa | ZAR | ÷ 18.5 |
| Nigeria | NGN | ÷ 1,600 |
| Kenya | KES | ÷ 129 |
| Ghana | GHS | ÷ 15.5 |

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Database:** SQLite (local) / PostgreSQL (production)
- **ORM:** Prisma 7
- **Charts:** Recharts
- **Map:** D3-geo + GeoJSON (49 African countries, all clickable)
- **Styling:** Tailwind CSS v4
- **Deployment:** Vercel (with cron) or Docker + Railway

---

## Deployment

See [DEPLOY.md](./DEPLOY.md) for Vercel, Railway, and Docker PostgreSQL setup.
