import { createHash } from "node:crypto";
import { upsertIngestedJob, runSourceSync, extractSkillsFromText, type SyncResult } from "@/lib/ingest/shared";
import { detectCountry } from "@/lib/city-country";
import { ISO2_TO_COUNTRY } from "@/lib/constants";

/**
 * Optional Apify Africa Jobs Aggregator integration.
 * Set APIFY_TOKEN in environment to enable Jobberman + BrighterMonday via Apify.
 */
type ApifyJob = {
  job_id?: string | null;
  title?: string;
  company?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  description?: string;
  apply_url?: string;
  platform?: string;
  posted_at?: string | null;
  scraped_at?: string;
};

function parsePostedAt(postedAt?: string | null, scrapedAt?: string): Date {
  if (postedAt) {
    const includesYear = /\b\d{4}\b/.test(postedAt);
    const value = includesYear ? postedAt : `${postedAt} ${new Date().getUTCFullYear()}`;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const scraped = scrapedAt ? new Date(scrapedAt) : new Date();
  return Number.isNaN(scraped.getTime()) ? new Date() : scraped;
}

function normalizePlatform(platform?: string) {
  const names: Record<string, string> = {
    brightermonday: "BrighterMonday",
    careers24: "Careers24",
    jobberman: "Jobberman",
    myjobmag: "MyJobMag",
  };
  return names[platform?.toLowerCase() ?? ""] ?? "Apify";
}

function safeCity(city?: string | null) {
  if (!city) return "Unknown";
  // Some actor rows place employment metadata in location_city.
  if (/\b(full[\s-]?time|part[\s-]?time|hybrid|remote|contract)\b/i.test(city)) {
    return "Unknown";
  }
  return city.split(",")[0].trim() || "Unknown";
}

export async function syncApifyAfricaJobs(): Promise<SyncResult> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return { inserted: 0, updated: 0, errors: ["APIFY_TOKEN not configured"] };
  }

  const actorId = "jungle_synthesizer~africa-jobs-aggregator-scraper";
  const response = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platforms: ["jobberman", "brightermonday", "myjobmag"],
        maxItems: 100,
      }),
    },
  );

  if (!response.ok) {
    return { inserted: 0, updated: 0, errors: [`Apify error: ${response.status}`] };
  }

  const jobs = (await response.json()) as ApifyJob[];
  let inserted = 0;
  let updated = 0;

  for (const job of jobs) {
    const title = job.title ?? "";
    const url = job.apply_url ?? "";
    if (!title || !url) continue;

    const country =
      (job.location_country ? ISO2_TO_COUNTRY[job.location_country.toUpperCase()] : undefined) ??
      detectCountry(job.location_city);
    if (!country) continue;

    const skills = extractSkillsFromText(title, job.description ?? "");
    const platform = normalizePlatform(job.platform);
    const slug = createHash("sha256").update(url).digest("hex").slice(0, 24);

    const { isNew } = await upsertIngestedJob({
      externalId: `apify-${slug}`,
      title,
      company: job.company ?? "Unknown",
      country,
      city: safeCity(job.location_city),
      source: platform,
      url,
      description: job.description,
      technologies: skills.join(", "),
      postedAt: parsePostedAt(job.posted_at, job.scraped_at),
      skills,
    });

    if (isNew) inserted += 1;
    else updated += 1;
  }

  return { inserted, updated };
}

export async function syncApifyWithLog() {
  return runSourceSync("Apify", syncApifyAfricaJobs);
}
