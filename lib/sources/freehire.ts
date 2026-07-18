import { detectCountry } from "@/lib/city-country";
import { ISO2_TO_COUNTRY } from "@/lib/constants";
import {
  extractSkillsFromText,
  runSourceSync,
  upsertIngestedJob,
  type SyncResult,
} from "@/lib/ingest/shared";

/**
 * Freehire public API — no key required.
 * https://freehire.dev/docs/api — GET /api/v1/jobs/search?regions=africa
 *
 * Freehire returns HTTP 400 once offset exceeds ~10,000, so deep pagination
 * must stop gracefully instead of aborting the whole multi-source sync.
 */
type FreehireJob = {
  public_slug: string;
  external_id?: string;
  url: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  countries?: string[];
  cities?: string[];
  skills?: string[];
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_period?: string;
  posted_at?: string;
  created_at?: string;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function syncFreehireJobs(): Promise<SyncResult> {
  let inserted = 0;
  let updated = 0;
  const pageSize = 100;
  const maxOffset = 10_000;

  for (let offset = 0; offset <= maxOffset; offset += pageSize) {
    const url = new URL("https://freehire.dev/api/v1/jobs/search");
    url.searchParams.set("regions", "africa");
    url.searchParams.set("sort", "posted_at");
    url.searchParams.set("order", "desc");
    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("offset", String(offset));

    const response = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (response.status === 400) break;
    if (!response.ok) throw new Error(`Freehire fetch failed: ${response.status}`);

    const payload = (await response.json()) as {
      data: FreehireJob[];
      meta?: { total?: number };
    };
    const jobs = payload.data ?? [];
    if (jobs.length === 0) break;

    for (const job of jobs) {
      const isoCountry = job.countries?.map((code) => ISO2_TO_COUNTRY[code]).find(Boolean);
      const description = stripHtml(job.description ?? "");
      const country =
        isoCountry ??
        detectCountry(job.cities?.join(", "), job.location);
      if (!country) continue;

      const skills = extractSkillsFromText(job.title, description, job.skills ?? []);
      const isAnnualUsd = job.salary_currency === "USD" && (job.salary_period ?? "year") === "year";

      const { isNew } = await upsertIngestedJob({
        externalId: `freehire-${job.public_slug}`,
        title: job.title,
        company: job.company || "Unknown",
        country,
        city: job.cities?.[0] ?? job.location?.split(",")[0]?.trim() ?? "Unknown",
        source: "Freehire",
        url: job.url,
        technologies: (job.skills ?? []).join(", "),
        salaryMinUsd: isAnnualUsd ? job.salary_min : undefined,
        salaryMaxUsd: isAnnualUsd ? job.salary_max : undefined,
        currency: isAnnualUsd ? "USD" : undefined,
        postedAt: new Date(job.posted_at ?? job.created_at ?? Date.now()),
        skills,
      });

      if (isNew) inserted += 1;
      else updated += 1;
    }

    const total = payload.meta?.total ?? 0;
    if (total && offset + pageSize >= total) break;
  }

  return { inserted, updated };
}

export async function syncFreehireWithLog() {
  return runSourceSync("Freehire", syncFreehireJobs);
}
