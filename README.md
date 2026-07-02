# Skills Observatory (Africa Workforce Insights)

Production-style dashboard tracking labor market demand across Kenya, Ghana, Nigeria, Rwanda, South Africa, and Tanzania.

## Features

- Full dashboard with 8 working pages (Overview, Jobs, Skills, Salary, Tech, Gaps, Reports, Alerts)
- **6 data ingestion sources**: Remotive, Arbeitnow, BrighterMonday, Jobberman, Adzuna (optional), Apify (optional)
- **Auto-sync every 6 hours** via Vercel cron (`/api/cron/sync`)
- **PDF + CSV annual reports**
- **Africa choropleth map** with country-level job intensity
- **Sync history** tracking in database
- **PostgreSQL-ready** for production (SQLite for local dev)

## Quick Start

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Sync Data**.

## Optional API Keys

Copy `.env.example` to `.env` and add:

| Variable | Purpose |
|----------|---------|
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Adzuna jobs for ZA, NG, KE, GH |
| `APIFY_TOKEN` | Scaled BrighterMonday + Jobberman via Apify |
| `CRON_SECRET` | Protects `/api/cron/sync` in production |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Overview dashboard |
| `/jobs` | Live job postings table |
| `/skills` | Skill demand analysis |
| `/salary` | Salary insights |
| `/tech` | Emerging tech growth |
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
- `npm run build` — production build
- `docker compose up -d` — local PostgreSQL
