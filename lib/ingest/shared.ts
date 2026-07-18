import { prisma } from "@/lib/prisma";
import { extractSkillsFromText as escoExtract } from "@/lib/esco-extractor";

/**
 * Parses annual USD salaries from free-form text. Returns {} unless the text
 * is clearly USD-denominated ("$" or "USD"), handles "k" suffixes ($90k), and
 * discards implausible annual figures so hourly rates or stray numbers are
 * never stored as salaries.
 */
export function parseSalaryFromText(salaryText: string | null | undefined): {
  min?: number;
  max?: number;
} {
  if (!salaryText) return {};
  const text = salaryText.toLowerCase();
  if (!text.includes("$") && !text.includes("usd")) return {};

  const matches = [...text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(k)?/g)];
  const parsed = matches
    .map((m) => {
      const base = Number(m[1].replace(/,/g, ""));
      return m[2] ? base * 1000 : base;
    })
    .filter((value) => Number.isFinite(value) && value >= 5000 && value <= 1_000_000);

  if (parsed.length === 0) return {};
  if (parsed.length === 1) return { min: parsed[0], max: parsed[0] };
  return { min: Math.min(...parsed), max: Math.max(...parsed) };
}

export function extractSkillsFromText(
  title: string,
  description: string,
  tags: string[] = [],
  category = "",
): string[] {
  return escoExtract(title, description, tags, category).map((s) => s.tier2);
}

export type IngestJobInput = {
  externalId: string;
  title: string;
  company: string;
  country: string;
  city: string;
  source: string;
  url: string;
  description?: string;
  technologies?: string;
  salaryMinUsd?: number;
  salaryMaxUsd?: number;
  currency?: string;
  postedAt: Date;
  skills: string[];
};

function dedupKey(title: string, company: string, country: string) {
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  return `${n(title)}||${n(company)}||${n(country)}`;
}

export async function upsertIngestedJob(job: IngestJobInput) {
  // Cross-source duplicate check: if a known-company job with the same
  // title+company+country already exists under a different externalId, skip it.
  if (job.company !== "Unknown") {
    const key = dedupKey(job.title, job.company, job.country);
    const existing = await prisma.job.findFirst({
      where: {
        title: job.title,
        company: job.company,
        country: job.country,
        NOT: { externalId: job.externalId },
      },
      select: { id: true },
    });
    if (existing) {
      // Already stored from another source — treat as seen, not new
      void key;
      return { isNew: false };
    }
  }

  const createdJob = await prisma.job.upsert({
    where: { externalId: job.externalId },
    create: {
      externalId: job.externalId,
      title: job.title,
      company: job.company,
      country: job.country,
      city: job.city,
      salaryMinUsd: job.salaryMinUsd,
      salaryMaxUsd: job.salaryMaxUsd,
      currency: job.currency ?? "USD",
      source: job.source,
      url: job.url,
      technologies: job.technologies,
      postedAt: job.postedAt,
    },
    update: {
      title: job.title,
      company: job.company,
      country: job.country,
      city: job.city,
      salaryMinUsd: job.salaryMinUsd,
      salaryMaxUsd: job.salaryMaxUsd,
      url: job.url,
      technologies: job.technologies,
      postedAt: job.postedAt,
    },
    select: { id: true, createdAt: true, updatedAt: true },
  });

  const isNew = createdJob.createdAt.getTime() === createdJob.updatedAt.getTime();

  for (const skillName of new Set(job.skills)) {
    const skill = await prisma.skill.upsert({
      where: { name: skillName },
      create: { name: skillName },
      update: {},
    });
    await prisma.jobSkill.upsert({
      where: { jobId_skillId: { jobId: createdJob.id, skillId: skill.id } },
      create: { jobId: createdJob.id, skillId: skill.id, weight: 1 },
      update: {},
    });
  }

  return { isNew };
}

export async function recordSyncRun(
  source: string,
  inserted: number,
  updated: number,
  status: "success" | "error",
  message?: string,
) {
  await prisma.syncRun.create({
    data: { source, inserted, updated, status, message },
  });
}

export type SyncResult = { inserted: number; updated: number; errors?: string[] };

export async function runSourceSync(
  source: string,
  fn: () => Promise<SyncResult>,
): Promise<SyncResult & { source: string }> {
  try {
    const result = await fn();
    const hasErrors = (result.errors?.length ?? 0) > 0;
    await recordSyncRun(
      source,
      result.inserted,
      result.updated,
      hasErrors && result.inserted === 0 && result.updated === 0 ? "error" : "success",
      result.errors?.join("; "),
    );
    return { ...result, source };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await recordSyncRun(source, 0, 0, "error", message);
    return { inserted: 0, updated: 0, source, errors: [message] };
  }
}
