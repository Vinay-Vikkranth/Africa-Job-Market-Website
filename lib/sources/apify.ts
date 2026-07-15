import { upsertIngestedJob, runSourceSync, extractSkillsFromText, parseSalaryFromText, type SyncResult } from "@/lib/ingest/shared";

// ISO-2 country codes returned by this actor → our country names
const ISO2_TO_COUNTRY: Record<string, string> = {
  ZA: "South Africa",
  NG: "Nigeria",
  KE: "Kenya",
  GH: "Ghana",
  TZ: "Tanzania",
  RW: "Rwanda",
  UG: "Uganda",
  ET: "Ethiopia",
  EG: "Egypt",
  SN: "Senegal",
  CM: "Cameroon",
  CI: "Ivory Coast",
};

// Actual actor: jungle_synthesizer/africa-jobs-aggregator-scraper
// Supports platforms: careers24, jobberman, brightermonday, myjobmag
const ACTOR_ID = "6fF8mqZ0K0JhnB0RM";

type ApifyJob = {
  job_id?: string;
  platform?: string;
  title?: string;
  company?: string | null;
  location_country?: string | null;
  location_city?: string | null;
  employment_type?: string | null;
  salary_range?: string | null;
  currency?: string | null;
  description?: string | null;
  experience_level?: string | null;
  posted_at?: string | null;
  apply_url?: string;
  scraped_at?: string;
};

function parsePostedAt(raw: string | null | undefined): Date {
  if (!raw) return new Date();
  // Format: "Posted: 07 Jul 2026 \r\n\r\n                        30 Days left"
  const match = raw.match(/Posted:\s*(\d{1,2}\s+\w+\s+\d{4})/i);
  if (match) {
    const parsed = new Date(match[1]);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  // Try ISO date fallback
  const iso = new Date(raw);
  return isNaN(iso.getTime()) ? new Date() : iso;
}

export async function syncApifyAfricaJobs(): Promise<SyncResult> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return { inserted: 0, updated: 0, errors: ["APIFY_TOKEN not configured"] };
  }

  const response = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${token}&timeout=120`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platforms: ["careers24", "jobberman", "brightermonday", "myjobmag"],
        maxItems: 200,
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
    const title = job.title?.trim() ?? "";
    const url = job.apply_url ?? "";
    if (!title || !url) continue;

    // Resolve country from ISO-2 code first, then fall back to text detection
    const isoCountry = job.location_country ? ISO2_TO_COUNTRY[job.location_country.toUpperCase()] : undefined;
    const country = isoCountry ?? "South Africa"; // careers24 is ZA-only
    const city = job.location_city?.split(",")[0]?.trim() ?? "Unknown";
    const platform = job.platform ?? "Apify";
    const salary = parseSalaryFromText(job.salary_range);
    const skills = extractSkillsFromText(title, job.description ?? "");
    const slug = Buffer.from(url).toString("base64url").slice(0, 40);

    const { isNew } = await upsertIngestedJob({
      externalId: `apify-${platform}-${job.job_id ?? slug}`,
      title,
      company: job.company ?? "Unknown",
      country,
      city,
      source: platform === "careers24" ? "Careers24" : platform === "jobberman" ? "Jobberman" : platform === "brightermonday" ? "BrighterMonday" : "Apify",
      url,
      description: job.description ?? undefined,
      technologies: skills.join(", "),
      salaryMinUsd: salary.min,
      salaryMaxUsd: salary.max,
      postedAt: parsePostedAt(job.posted_at ?? job.scraped_at),
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
