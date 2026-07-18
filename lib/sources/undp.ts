import { ISO2_TO_COUNTRY } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  extractSkillsFromText,
  runSourceSync,
  upsertIngestedJob,
  type SyncResult,
} from "@/lib/ingest/shared";

/**
 * Official UNDP Oracle Recruiting public endpoint.
 * This is the same first-party endpoint used by the UNDP careers site.
 */
const UNDP_ORACLE_ORIGIN = "https://estm.fa.em2.oraclecloud.com";
const UNDP_SITE = "CX_1";
const PAGE_SIZE = 25;

type UndpJob = {
  Id: string;
  Title: string;
  PostedDate?: string;
  PrimaryLocationCountry?: string;
  PrimaryLocation?: string;
  JobFamily?: string | null;
  JobFunction?: string | null;
  WorkerType?: string | null;
  ContractType?: string | null;
  ShortDescriptionStr?: string | null;
};

type UndpSearchResult = {
  TotalJobsCount?: number;
  requisitionList?: UndpJob[];
};

async function fetchPage(offset: number): Promise<UndpSearchResult> {
  const url = new URL(
    `${UNDP_ORACLE_ORIGIN}/hcmRestApi/resources/latest/recruitingCEJobRequisitions`,
  );
  url.searchParams.set("onlyData", "true");
  url.searchParams.set("expand", "requisitionList.workLocation");
  url.searchParams.set(
    "finder",
    `findReqs;siteNumber=${UNDP_SITE},limit=${PAGE_SIZE},offset=${offset}`,
  );

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!response.ok) throw new Error(`UNDP careers fetch failed: ${response.status}`);

  const payload = (await response.json()) as { items?: UndpSearchResult[] };
  return payload.items?.[0] ?? {};
}

export async function syncUndpJobs(): Promise<SyncResult> {
  let inserted = 0;
  let updated = 0;
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  const activeExternalIds: string[] = [];

  while (offset < total && offset < 500) {
    const page = await fetchPage(offset);
    total = page.TotalJobsCount ?? 0;
    const jobs = page.requisitionList ?? [];
    if (jobs.length === 0) break;

    for (const job of jobs) {
      const countryCode = job.PrimaryLocationCountry?.toUpperCase();
      const country = countryCode ? ISO2_TO_COUNTRY[countryCode] : undefined;
      if (!country || !job.Id || !job.Title) continue;
      const externalId = `undp-${job.Id}`;
      activeExternalIds.push(externalId);

      const context = [
        job.JobFamily,
        job.JobFunction,
        job.WorkerType,
        job.ContractType,
        job.ShortDescriptionStr,
      ].filter((value): value is string => Boolean(value));
      const skills = extractSkillsFromText(job.Title, context.join(" "), context);
      const url =
        `${UNDP_ORACLE_ORIGIN}/hcmUI/CandidateExperience/en/sites/` +
        `${UNDP_SITE}/requisitions/job/${job.Id}`;

      const { isNew } = await upsertIngestedJob({
        externalId,
        title: job.Title,
        company: "United Nations Development Programme (UNDP)",
        country,
        city: job.PrimaryLocation?.split(",")[0]?.trim() || "Unknown",
        source: "UNDP",
        url,
        technologies: context.join(", "),
        postedAt: job.PostedDate ? new Date(`${job.PostedDate}T00:00:00Z`) : new Date(),
        skills,
      });

      if (isNew) inserted += 1;
      else updated += 1;
    }

    offset += PAGE_SIZE;
  }

  if (activeExternalIds.length > 0) {
    await prisma.job.deleteMany({
      where: {
        source: "UNDP",
        externalId: { notIn: activeExternalIds },
      },
    });
  }

  return { inserted, updated };
}

export async function syncUndpWithLog() {
  return runSourceSync("UNDP", syncUndpJobs);
}
