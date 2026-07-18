import { detectCountry } from "@/lib/city-country";
import { AFRICAN_COUNTRIES } from "@/lib/constants";
import {
  extractSkillsFromText,
  runSourceSync,
  upsertIngestedJob,
  type SyncResult,
} from "@/lib/ingest/shared";

/**
 * ReliefWeb (UN OCHA) jobs API — free, but requires an approved appname.
 * Request one at https://apidoc.reliefweb.int/parameters#appname and set
 * RELIEFWEB_APPNAME in .env. Excellent coverage of NGO/UN jobs across Africa.
 */
type ReliefWebJob = {
  id: string;
  fields: {
    title: string;
    url_alias?: string;
    url?: string;
    body?: string;
    country?: { name: string }[];
    city?: { name: string }[];
    source?: { name: string; shortname?: string }[];
    career_categories?: { name: string }[];
    date?: { created?: string };
  };
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function syncReliefWebJobs(): Promise<SyncResult> {
  const appname = process.env.RELIEFWEB_APPNAME;
  if (!appname) {
    return { inserted: 0, updated: 0, errors: ["RELIEFWEB_APPNAME not configured"] };
  }

  const response = await fetch(
    `https://api.reliefweb.int/v2/jobs?appname=${encodeURIComponent(appname)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        limit: 200,
        sort: ["date.created:desc"],
        fields: {
          include: ["title", "url_alias", "body", "country", "city", "source", "career_categories", "date"],
        },
        filter: {
          field: "country.name",
          value: [...AFRICAN_COUNTRIES],
          operator: "OR",
        },
      }),
      next: { revalidate: 0 },
    },
  );
  if (!response.ok) throw new Error(`ReliefWeb fetch failed: ${response.status}`);

  const payload = (await response.json()) as { data: ReliefWebJob[] };
  let inserted = 0;
  let updated = 0;

  for (const job of payload.data ?? []) {
    const fields = job.fields;
    const countryNames = (fields.country ?? []).map((c) => c.name).join(", ");
    const country = detectCountry(countryNames);
    if (!country) continue;

    const description = stripHtml(fields.body ?? "");
    const categories = (fields.career_categories ?? []).map((c) => c.name);
    const skills = extractSkillsFromText(fields.title, description, categories);
    const url = fields.url_alias ?? fields.url ?? `https://reliefweb.int/job/${job.id}`;

    const { isNew } = await upsertIngestedJob({
      externalId: `reliefweb-${job.id}`,
      title: fields.title,
      company: fields.source?.[0]?.name ?? "Unknown",
      country,
      city: fields.city?.[0]?.name ?? "Unknown",
      source: "ReliefWeb",
      url,
      technologies: categories.join(", "),
      postedAt: fields.date?.created ? new Date(fields.date.created) : new Date(),
      skills,
    });

    if (isNew) inserted += 1;
    else updated += 1;
  }

  return { inserted, updated };
}

export async function syncReliefWebWithLog() {
  return runSourceSync("ReliefWeb", syncReliefWebJobs);
}
