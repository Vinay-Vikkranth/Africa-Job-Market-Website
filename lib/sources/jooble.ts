import { detectCountry } from "@/lib/city-country";
import {
  extractSkillsFromText,
  runSourceSync,
  upsertIngestedJob,
  type SyncResult,
} from "@/lib/ingest/shared";

/**
 * Jooble API — free key at https://jooble.org/api/about.
 *
 * Important: each Jooble key is bound to one regional index. A US key will
 * return US towns that share African country names (e.g. "Angola, NY").
 * Only use per-country African hosts/keys, and never fall back to the query
 * country when the job location itself does not resolve to Africa.
 *
 * Configure as JSON in JOOBLE_COUNTRY_KEYS, for example:
 * [{"country":"Nigeria","host":"ng.jooble.org","key":"..."}]
 */
type JoobleEndpoint = {
  country: string;
  host: string;
  key: string;
};

type JoobleJob = {
  id: number | string;
  title: string;
  location: string;
  snippet: string;
  salary: string;
  company: string;
  link: string;
  updated: string;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function looksLikeUsStateSuffix(location: string) {
  return /,\s*[A-Z]{2}$/.test(location.trim());
}

function loadJoobleEndpoints(): JoobleEndpoint[] {
  const raw = process.env.JOOBLE_COUNTRY_KEYS;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as JoobleEndpoint[];
    return parsed.filter((item) => item.country && item.host && item.key);
  } catch {
    return [];
  }
}

export async function syncJoobleJobs(): Promise<SyncResult> {
  const endpoints = loadJoobleEndpoints();
  if (endpoints.length === 0) {
    return {
      inserted: 0,
      updated: 0,
      errors: [
        "JOOBLE_COUNTRY_KEYS not configured. A single US Jooble key cannot safely provide African coverage.",
      ],
    };
  }

  let inserted = 0;
  let updated = 0;

  for (const endpoint of endpoints) {
    for (let page = 1; page <= 5; page += 1) {
      const response = await fetch(`https://${endpoint.host}/api/${endpoint.key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: "", location: "", page }),
        next: { revalidate: 0 },
      });
      if (!response.ok) break;

      const payload = (await response.json()) as { jobs?: JoobleJob[] };
      const jobs = payload.jobs ?? [];
      if (jobs.length === 0) break;

      for (const job of jobs) {
        const description = stripHtml(job.snippet ?? "");
        if (looksLikeUsStateSuffix(job.location ?? "")) continue;
        const country = detectCountry(job.location);
        if (!country || country !== endpoint.country) continue;

        const skills = extractSkillsFromText(job.title, description);
        const { isNew } = await upsertIngestedJob({
          externalId: `jooble-${endpoint.country.toLowerCase().replace(/\s+/g, "-")}-${job.id}`,
          title: job.title,
          company: job.company || "Unknown",
          country,
          city: job.location?.split(",")[0]?.trim() || "Unknown",
          source: "Jooble",
          url: job.link,
          postedAt: job.updated ? new Date(job.updated) : new Date(),
          skills,
        });

        if (isNew) inserted += 1;
        else updated += 1;
      }
    }
  }

  return { inserted, updated };
}

export async function syncJoobleWithLog() {
  return runSourceSync("Jooble", syncJoobleJobs);
}
