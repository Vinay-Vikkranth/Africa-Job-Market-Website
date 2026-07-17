import { prisma } from "@/lib/prisma";

const KEYWORD_SKILLS: Record<string, string[]> = {
  Excel: ["excel", "spreadsheet"],
  Communication: ["communication", "stakeholder", "presentation"],
  "Project Management": ["project management", "scrum", "agile", "kanban"],
  "Data Analysis": ["data analysis", "analytics", "insights"],
  SQL: ["sql", "postgres", "mysql", "sqlite"],
  Python: ["python", "pandas", "numpy"],
  "Power BI": ["power bi", "powerbi"],
  "Cloud Computing": ["aws", "azure", "gcp", "cloud"],
  "Machine Learning": ["machine learning", "ml model"],
  "Artificial Intelligence": ["artificial intelligence", "ai tools", "llm"],
  Cybersecurity: ["cybersecurity", "security operations", "soc"],
  Salesforce: ["salesforce"],
  "Digital Marketing": ["digital marketing", "seo", "ads", "social media"],
};

const CANONICAL_SKILLS = new Map(
  [
    ...Object.keys(KEYWORD_SKILLS),
    "API",
    "AWS",
    "CSS",
    "Data Science",
    "DevOps",
    "GCP",
    "HTML",
    "JavaScript",
    "Node.js",
    "React.js",
    "TypeScript",
    "UI",
    "UX",
  ].map((skill) => [skill.toLocaleLowerCase(), skill]),
);

/**
 * Gives equivalent skill labels one stable database name. This prevents tags
 * such as "SQL", "sql", "data-science", and "Data science" from becoming
 * separate skills.
 */
export function normalizeSkillName(value: string) {
  const cleaned = value.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (!cleaned) return "";

  const canonical = CANONICAL_SKILLS.get(cleaned.toLocaleLowerCase());
  if (canonical) return canonical;

  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1).toLocaleLowerCase())
    .join(" ");
}

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
  const content = `${title} ${category} ${tags.join(" ")} ${description}`.toLowerCase();
  const skills = new Set<string>();

  for (const [skill, keywords] of Object.entries(KEYWORD_SKILLS)) {
    if (keywords.some((keyword) => content.includes(keyword))) {
      skills.add(skill);
    }
  }

  for (const tag of tags) {
    const normalized = normalizeSkillName(tag);
    if (normalized.length > 2 && normalized.length < 40) {
      skills.add(normalized);
    }
  }

  return [...new Set([...skills].map(normalizeSkillName).filter(Boolean))].slice(0, 12);
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

export async function upsertIngestedJob(job: IngestJobInput) {
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

  const uniqueSkills = new Set(job.skills.map(normalizeSkillName).filter(Boolean));
  for (const skillName of uniqueSkills) {
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
