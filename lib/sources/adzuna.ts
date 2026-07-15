import { detectCountryFromText } from "@/lib/city-country";
import {
  extractSkillsFromText,
  runSourceSync,
  upsertIngestedJob,
  type SyncResult,
} from "@/lib/ingest/shared";

/** Adzuna public API — set ADZUNA_APP_ID and ADZUNA_APP_KEY in .env */
const ADZUNA_MARKETS: { code: string; country: string; query: string }[] = [
  { code: "za", country: "South Africa", query: "data analyst" },
  { code: "za", country: "South Africa", query: "software developer" },
  { code: "ng", country: "Nigeria", query: "data analyst" },
  { code: "ng", country: "Nigeria", query: "technology" },
  { code: "ke", country: "Kenya", query: "technology" },
  { code: "ke", country: "Kenya", query: "finance" },
  { code: "gh", country: "Ghana", query: "finance" },
  { code: "gh", country: "Ghana", query: "data" },
];

// Adzuna returns salaries in local currency — convert to USD (rates as of 2026-07)
const MARKET_TO_USD: Record<string, number> = {
  za: 1 / 18.5,   // ZAR
  ng: 1 / 1600,   // NGN
  ke: 1 / 129,    // KES
  gh: 1 / 15.5,   // GHS
};

type AdzunaJob = {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  redirect_url: string;
  created: string;
  salary_min?: number;
  salary_max?: number;
};

export async function syncAdzunaJobs(): Promise<SyncResult> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    return { inserted: 0, updated: 0, errors: ["Adzuna API keys not configured"] };
  }

  let inserted = 0;
  let updated = 0;

  for (const market of ADZUNA_MARKETS) {
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${market.code}/search/1`);
    url.searchParams.set("app_id", appId);
    url.searchParams.set("app_key", appKey);
    url.searchParams.set("results_per_page", "25");
    url.searchParams.set("what", market.query);

    const response = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!response.ok) continue;

    const data = (await response.json()) as { results: AdzunaJob[] };
    const rate = MARKET_TO_USD[market.code] ?? 1;
    for (const job of data.results ?? []) {
      const country =
        detectCountryFromText(`${job.location?.display_name} ${job.description}`) ?? market.country;
      const skills = extractSkillsFromText(job.title, job.description);
      const { isNew } = await upsertIngestedJob({
        externalId: `adzuna-${market.code}-${job.id}`,
        title: job.title,
        company: job.company?.display_name ?? "Unknown",
        country,
        city: job.location?.display_name?.split(",")[0] ?? "Unknown",
        source: "Adzuna",
        url: job.redirect_url,
        description: job.description,
        salaryMinUsd: job.salary_min != null ? Math.round(job.salary_min * rate) : undefined,
        salaryMaxUsd: job.salary_max != null ? Math.round(job.salary_max * rate) : undefined,
        currency: "USD",
        postedAt: new Date(job.created),
        skills,
      });
      if (isNew) inserted += 1;
      else updated += 1;
    }
  }

  return { inserted, updated };
}

export async function syncAdzunaWithLog() {
  return runSourceSync("Adzuna", syncAdzunaJobs);
}
