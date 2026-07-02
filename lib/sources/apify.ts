import { upsertIngestedJob, runSourceSync, extractSkillsFromText, type SyncResult } from "@/lib/ingest/shared";
import { detectCountryFromText } from "@/lib/city-country";

/**
 * Optional Apify Africa Jobs Aggregator integration.
 * Set APIFY_TOKEN in environment to enable Jobberman + BrighterMonday via Apify.
 */
type ApifyJob = {
  title?: string;
  company?: string;
  location?: string;
  salary?: string;
  description?: string;
  applyUrl?: string;
  url?: string;
  platform?: string;
  datePosted?: string;
};

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
    const url = job.applyUrl ?? job.url ?? "";
    if (!title || !url) continue;

    const country = detectCountryFromText(`${job.location ?? ""} ${job.description ?? ""} ${title}`);
    if (!country) continue;

    const skills = extractSkillsFromText(title, job.description ?? "");
    const platform = job.platform ?? "Apify";
    const slug = Buffer.from(url).toString("base64url").slice(0, 36);

    const { isNew } = await upsertIngestedJob({
      externalId: `apify-${slug}`,
      title,
      company: job.company ?? "Unknown",
      country,
      city: (job.location ?? "Unknown").split(",")[0],
      source: platform,
      url,
      description: job.description,
      technologies: skills.join(", "),
      postedAt: job.datePosted ? new Date(job.datePosted) : new Date(),
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
