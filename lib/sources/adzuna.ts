import { detectCountry } from "@/lib/city-country";
import {
  extractSkillsFromText,
  runSourceSync,
  upsertIngestedJob,
  type SyncResult,
} from "@/lib/ingest/shared";

/**
 * Adzuna public API — set ADZUNA_APP_ID and ADZUNA_APP_KEY in .env.
 * South Africa ("za") is Adzuna's only supported African market.
 */
const ADZUNA_QUERIES = ["data", "software", "engineer", "finance", "marketing", "sales"];

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
  const errors: string[] = [];

  for (const query of ADZUNA_QUERIES) {
    const url = new URL("https://api.adzuna.com/v1/api/jobs/za/search/1");
    url.searchParams.set("app_id", appId);
    url.searchParams.set("app_key", appKey);
    url.searchParams.set("results_per_page", "50");
    url.searchParams.set("what", query);

    const response = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!response.ok) {
      errors.push(`Adzuna query "${query}" failed: ${response.status}`);
      continue;
    }

    const data = (await response.json()) as { results: AdzunaJob[] };
    for (const job of data.results ?? []) {
      const country =
        detectCountry(job.location?.display_name) ?? "South Africa";
      const skills = extractSkillsFromText(job.title, job.description);
      // Adzuna ZA salaries are annual ZAR; not converted, so they are not
      // stored as USD figures.
      const { isNew } = await upsertIngestedJob({
        externalId: `adzuna-za-${job.id}`,
        title: job.title,
        company: job.company?.display_name ?? "Unknown",
        country,
        city: job.location?.display_name?.split(",")[0] ?? "Unknown",
        source: "Adzuna",
        url: job.redirect_url,
        description: job.description,
        postedAt: new Date(job.created),
        skills,
      });
      if (isNew) inserted += 1;
      else updated += 1;
    }
  }

  return { inserted, updated, errors: errors.length ? errors : undefined };
}

export async function syncAdzunaWithLog() {
  return runSourceSync("Adzuna", syncAdzunaJobs);
}
