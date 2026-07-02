# Deployment Guide

## Vercel (recommended for frontend + cron)

1. Push the repo to GitHub and import in [Vercel](https://vercel.com).
2. Set root directory to `skills-observatory`.
3. Add environment variables:
   - `DATABASE_URL` — PostgreSQL connection string (Neon, Supabase, or Railway)
   - `CRON_SECRET` — random string; Vercel cron sends `Authorization: Bearer <CRON_SECRET>`
   - Optional: `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `APIFY_TOKEN`
4. For PostgreSQL, change `provider` in `prisma/schema.prisma` from `sqlite` to `postgresql`, then run migrations against your production DB.
5. Deploy. Cron runs `/api/cron/sync` every 6 hours (see `vercel.json`).

## Railway

1. Create a new project → add **PostgreSQL** plugin.
2. Deploy from GitHub; set `skills-observatory` as root.
3. Set `DATABASE_URL` from Railway Postgres credentials.
4. Add a **cron job** or use [Railway cron](https://docs.railway.app/guides/cron-jobs) hitting `GET /api/cron/sync` with `Authorization: Bearer <CRON_SECRET>`.

## Local PostgreSQL (Docker)

```bash
docker compose up -d
```

Update `.env`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/skills_observatory"
```

Change `prisma/schema.prisma` provider to `postgresql`, then:

```bash
npx prisma migrate dev --name postgres_init
npm run db:seed
```

## Data sources

| Source | Type | Env required |
|--------|------|--------------|
| Remotive | Public API | — |
| Arbeitnow | Public API | — |
| BrighterMonday | HTML / JSON-LD scrape | — |
| Jobberman | HTML / JSON-LD scrape | — |
| Adzuna | Public API | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` |
| Apify Africa aggregator | Paid API | `APIFY_TOKEN` |

## Manual sync

```bash
npm run sync
# or
curl -X POST http://localhost:3000/api/sync
```

## Reports

- CSV: `GET /api/reports?country=Kenya`
- PDF: `GET /api/reports/pdf?country=Kenya`
