import { detectCountry } from "@/lib/city-country";
import {
  extractSkillsFromText,
  parseSalaryFromText,
  runSourceSync,
  upsertIngestedJob,
  type SyncResult,
} from "@/lib/ingest/shared";
import { syncAfricanJobBoards } from "@/lib/sources/african-boards";
import { syncAdzunaWithLog } from "@/lib/sources/adzuna";
import { syncApifyWithLog } from "@/lib/sources/apify";
import { syncFreehireWithLog } from "@/lib/sources/freehire";
import { syncFuzuWithLog } from "@/lib/sources/fuzu";
import { syncJoobleWithLog } from "@/lib/sources/jooble";
import { syncReliefWebWithLog } from "@/lib/sources/reliefweb";
import { syncRemoteOkWithLog } from "@/lib/sources/remoteok";
import { syncUndpWithLog } from "@/lib/sources/undp";
import { syncUnCareersWithLog } from "@/lib/sources/un-careers";
import { syncUnWomenWithLog } from "@/lib/sources/un-women";

type RemotiveJob = {
  id: number;
  title: string;
  company_name: string;
  candidate_required_location: string;
  salary: string | null;
  url: string;
  publication_date: string;
  category: string;
  tags: string[];
  description: string;
};

function detectCity(location: string): string {
  const cleaned = location.replace("Only", "").trim();
  if (!cleaned) return "Unknown";
  const city = cleaned.split(",")[0].split("|")[0].trim();
  return city || "Unknown";
}

async function syncRemotiveJobs(limit = 300) {
  const response = await fetch("https://remotive.com/api/remote-jobs", { next: { revalidate: 0 } });
  if (!response.ok) throw new Error(`Remotive fetch failed: ${response.status}`);

  const data = (await response.json()) as { jobs: RemotiveJob[] };
  let inserted = 0;
  let updated = 0;

  for (const job of data.jobs.slice(0, limit)) {
    const country = detectCountry(job.candidate_required_location);
    if (!country) continue;

    const salary = parseSalaryFromText(job.salary);
    const skills = extractSkillsFromText(job.title, job.description, job.tags, job.category);
    const hasSalary = salary.min !== undefined;

    const { isNew } = await upsertIngestedJob({
      externalId: `remotive-${job.id}`,
      title: job.title,
      company: job.company_name || "Unknown",
      country,
      city: detectCity(job.candidate_required_location),
      salaryMinUsd: salary.min,
      salaryMaxUsd: salary.max,
      currency: hasSalary ? "USD" : undefined,
      source: "Remotive",
      url: job.url,
      technologies: job.tags.join(", "),
      postedAt: new Date(job.publication_date),
      skills,
    });

    if (isNew) inserted += 1;
    else updated += 1;
  }

  return { inserted, updated };
}

type ArbeitnowJob = {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  url: string;
  tags: string[];
  location: string;
  created_at: number;
};

async function syncArbeitnowJobs(): Promise<SyncResult> {
  const response = await fetch("https://www.arbeitnow.com/api/job-board-api", {
    next: { revalidate: 0 },
  });
  if (!response.ok) throw new Error(`Arbeitnow fetch failed: ${response.status}`);

  const payload = (await response.json()) as { data: ArbeitnowJob[] };
  let inserted = 0;
  let updated = 0;

  for (const job of payload.data) {
    const country = detectCountry(job.location);
    if (!country) continue;

    const skills = extractSkillsFromText(job.title, job.description, job.tags);
    const { isNew } = await upsertIngestedJob({
      externalId: `arbeitnow-${job.slug}`,
      title: job.title,
      company: job.company_name || "Unknown",
      country,
      city: detectCity(job.location),
      source: "Arbeitnow",
      url: job.url,
      technologies: job.tags.join(", "),
      postedAt: new Date(job.created_at * 1000),
      skills,
    });

    if (isNew) inserted += 1;
    else updated += 1;
  }

  return { inserted, updated };
}

export async function syncAllJobSources(limit = 300) {
  const [
    adzuna,
    africanBoards,
    apify,
    freehire,
    fuzu,
    jooble,
    reliefweb,
    remoteok,
    undp,
    unCareers,
    unWomen,
    remotive,
    arbeitnow,
  ] = await Promise.all([
    syncAdzunaWithLog(),
    syncAfricanJobBoards(),
    syncApifyWithLog(),
    syncFreehireWithLog(),
    syncFuzuWithLog(),
    syncJoobleWithLog(),
    syncReliefWebWithLog(),
    syncRemoteOkWithLog(),
    syncUndpWithLog(),
    syncUnCareersWithLog(),
    syncUnWomenWithLog(),
    runSourceSync("Remotive", () => syncRemotiveJobs(limit)),
    runSourceSync("Arbeitnow", syncArbeitnowJobs),
  ]);

  const results = [
    adzuna,
    africanBoards.brighterMonday,
    africanBoards.jobberman,
    apify,
    freehire,
    fuzu,
    jooble,
    reliefweb,
    remoteok,
    undp,
    unCareers,
    unWomen,
    remotive,
    arbeitnow,
  ];

  const inserted = results.reduce((sum, r) => sum + r.inserted, 0);
  const updated = results.reduce((sum, r) => sum + r.updated, 0);

  return {
    adzuna,
    brighterMonday: africanBoards.brighterMonday,
    jobberman: africanBoards.jobberman,
    apify,
    freehire,
    fuzu,
    jooble,
    reliefweb,
    remoteok,
    undp,
    unCareers,
    unWomen,
    remotive,
    arbeitnow,
    inserted,
    updated,
  };
}

export { syncRemotiveJobs, syncArbeitnowJobs };
