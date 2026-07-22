import { prisma } from "@/lib/prisma";
import { categorizeSkill, TECH_KEYWORDS } from "@/lib/skill-categories";
import { COUNTRY_CURRICULA, getCurriculumCoverage } from "@/lib/syllabus-data";

const MS_DAY = 24 * 60 * 60 * 1000;

export function growthPct(recent: number, prior: number): number | null {
  // No meaningful % when the prior window is empty — avoid fake +100% / +600% swings.
  if (prior <= 0) return null;
  const pct = Number((((recent - prior) / prior) * 100).toFixed(1));
  // Tiny baselines produce absurd percentages; treat as unavailable for display.
  if (!Number.isFinite(pct) || Math.abs(pct) > 300) return null;
  return pct;
}

export async function getSkillMentionsInPeriod(
  where: Record<string, unknown>,
  from: Date,
  to: Date,
) {
  // Filter through the relation instead of an IN(...) list of job IDs, which
  // exceeds SQLite's bound-parameter limit on large datasets.
  const mentions = await prisma.jobSkill.groupBy({
    by: ["skillId"],
    where: { job: { ...where, postedAt: { gte: from, lt: to } } },
    _count: { skillId: true },
  });
  if (mentions.length === 0) return new Map<string, number>();

  const skills = await prisma.skill.findMany({
    where: { id: { in: mentions.map((m) => m.skillId) } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(skills.map((s) => [s.id, s.name]));

  const result = new Map<string, number>();
  for (const row of mentions) {
    const name = nameMap.get(row.skillId);
    if (name) result.set(name, row._count.skillId);
  }
  return result;
}

export async function getEmergingTechnologies(where: Record<string, unknown>) {
  const now = Date.now();
  const recentFrom = new Date(now - 30 * MS_DAY);
  const priorFrom = new Date(now - 60 * MS_DAY);

  const [recent, prior] = await Promise.all([
    getSkillMentionsInPeriod(where, recentFrom, new Date(now)),
    getSkillMentionsInPeriod(where, priorFrom, recentFrom),
  ]);

  const candidates = new Set<string>([...recent.keys(), ...prior.keys(), ...TECH_KEYWORDS]);
  const ranked = [...candidates]
    .map((name) => {
      const recentCount = recent.get(name) ?? 0;
      const priorCount = prior.get(name) ?? 0;
      const growth = growthPct(recentCount, priorCount) ?? 0;
      return { name, growthPct: growth, recentCount, priorCount };
    })
    .filter((item) => item.recentCount > 0 || item.priorCount > 0)
    .sort((a, b) => b.growthPct - a.growthPct || b.recentCount - a.recentCount)
    .slice(0, 8);

  return ranked.length > 0 ? ranked : TECH_KEYWORDS.map((name) => ({
    name,
    growthPct: 0,
    recentCount: 0,
    priorCount: 0,
  })).slice(0, 5);
}

export async function getSkillGaps(
  where: Record<string, unknown>,
  totalJobs: number,
  postedBefore?: Date,
) {
  const topSkills = await prisma.jobSkill.groupBy({
    by: ["skillId"],
    where: {
      job: { ...where, ...(postedBefore ? { postedAt: { lt: postedBefore } } : {}) },
    },
    _count: { skillId: true },
    orderBy: { _count: { skillId: "desc" } },
    take: 50,
  });

  const skills = await prisma.skill.findMany({
    where: { id: { in: topSkills.map((s) => s.skillId) } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(skills.map((s) => [s.id, s.name]));

  const categoryDemand: Record<string, number> = {
    technical: 0,
    digital: 0,
    soft: 0,
    business: 0,
  };

  for (const row of topSkills) {
    const name = nameMap.get(row.skillId);
    if (!name) continue;
    const cat = categorizeSkill(name);
    if (cat !== "other") categoryDemand[cat] += row._count.skillId;
  }

  const totalDemand = Object.values(categoryDemand).reduce((a, b) => a + b, 0) || 1;
  const gaps = {
    technical: Math.round((categoryDemand.technical / totalDemand) * 100),
    digital: Math.round((categoryDemand.digital / totalDemand) * 100),
    soft: Math.round((categoryDemand.soft / totalDemand) * 100),
    business: Math.round((categoryDemand.business / totalDemand) * 100),
  };

  // Overall = share of demand in the largest category (concentration), not a labour-supply gap.
  const overall = Math.max(gaps.technical, gaps.digital, gaps.soft, gaps.business);

  return { ...gaps, overall, totalJobs };
}

export type SkillGapRow = {
  skill: string;
  tier1: string;
  mentions: number;
  demandPct: number;   // skill's share of total job-skill mentions (0-100)
  supplyPct: number;   // curriculum programme coverage (0-100)
  gapScore: number;    // demandPct - supplyPct (higher = bigger gap)
  programs: string[];  // programmes that cover this skill
};

export type SyllabusGapResult = {
  country: string;
  source: string;
  programNames: string[];
  totalPrograms: number;
  coverageRate: number;   // mention-weighted curriculum coverage
  gapRate: number;        // 100 - coverageRate
  allSkills: SkillGapRow[];      // all skills, sorted by mentions desc
  gapSkills: SkillGapRow[];      // skills with gapScore > 0, sorted by gapScore desc
  coveredSkills: SkillGapRow[];  // skills with supplyPct > 0, sorted by supplyPct desc
  totalMentions: number;
};

export async function getSyllabusGap(
  country: string,
  where: Record<string, unknown>,
): Promise<SyllabusGapResult | null> {
  const curriculum = COUNTRY_CURRICULA[country];
  if (!curriculum) return null;

  const jobCount = await prisma.job.count({ where });
  if (jobCount === 0) return null;

  // Filter through the relation instead of an IN(...) list of job IDs, which
  // exceeds SQLite's bound-parameter limit on large datasets.
  const skillRows = await prisma.jobSkill.groupBy({
    by: ["skillId"],
    where: { job: where },
    _count: { skillId: true },
    orderBy: { _count: { skillId: "desc" } },
  });

  const skillRecords = await prisma.skill.findMany({
    where: { id: { in: skillRows.map((r) => r.skillId) } },
    select: { id: true, name: true, tier1: true },
  });
  const skillMap = new Map(skillRecords.map((s) => [s.id, s]));

  const totalMentions = skillRows.reduce((s, r) => s + r._count.skillId, 0) || 1;

  const allSkills: SkillGapRow[] = [];
  let coveredMentions = 0;

  for (const row of skillRows) {
    const rec = skillMap.get(row.skillId);
    if (!rec) continue;
    const mentions = row._count.skillId;
    const demandPct = Number(((mentions / totalMentions) * 100).toFixed(1));
    const { supplyPct, programs } = getCurriculumCoverage(rec.name, curriculum);
    const gapScore = Number((demandPct - supplyPct).toFixed(1));
    if (supplyPct > 0) coveredMentions += mentions;
    allSkills.push({
      skill: rec.name,
      tier1: rec.tier1 ?? "other",
      mentions,
      demandPct,
      supplyPct,
      gapScore,
      programs,
    });
  }

  const coverageRate = Math.round((coveredMentions / totalMentions) * 100);

  const gapSkills = allSkills
    .filter((r) => r.gapScore > 0)
    .sort((a, b) => b.gapScore - a.gapScore);

  const coveredSkills = allSkills
    .filter((r) => r.supplyPct > 0)
    .sort((a, b) => b.supplyPct - a.supplyPct);

  return {
    country,
    source: curriculum.source,
    programNames: curriculum.programNames,
    totalPrograms: curriculum.totalPrograms,
    coverageRate,
    gapRate: 100 - coverageRate,
    allSkills,
    gapSkills,
    coveredSkills,
    totalMentions,
  };
}

export async function getWeeklyGapTrend(where: Record<string, unknown>, weeks = 8): Promise<WeeklyPoint[]> {
  const points: WeeklyPoint[] = [];
  const now = Date.now();
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(now - i * 7 * MS_DAY);
    const start = new Date(end.getTime() - 7 * MS_DAY);
    const mentions = await prisma.jobSkill.groupBy({
      by: ["skillId"],
      where: { job: { ...where, postedAt: { gte: start, lt: end } } },
      _count: { skillId: true },
    });
    if (mentions.length === 0) {
      points.push({ weekStart: start.toISOString(), weekEnd: end.toISOString(), value: 0 });
      continue;
    }
    const skills = await prisma.skill.findMany({
      where: { id: { in: mentions.map((m) => m.skillId) } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(skills.map((s) => [s.id, s.name]));
    const demand: Record<string, number> = { technical: 0, digital: 0, soft: 0, business: 0 };
    for (const row of mentions) {
      const name = nameMap.get(row.skillId);
      if (!name) continue;
      const cat = categorizeSkill(name);
      if (cat !== "other") demand[cat] += row._count.skillId;
    }
    const total = Object.values(demand).reduce((a, b) => a + b, 0);
    const value = total === 0 ? 0 : Math.round((Math.max(...Object.values(demand)) / total) * 100);
    points.push({ weekStart: start.toISOString(), weekEnd: end.toISOString(), value });
  }
  return points;
}

export async function getDemandVsSupply(
  where: Record<string, unknown>,
  skillNames: { name: string; mentions: number }[],
) {
  const now = Date.now();
  const recentFrom = new Date(now - 30 * MS_DAY);

  const results = [];
  for (const skill of skillNames.slice(0, 8)) {
    const skillRow = await prisma.skill.findUnique({ where: { name: skill.name } });
    if (!skillRow) continue;

    const supplyCount = await prisma.jobSkill.count({
      where: {
        skillId: skillRow.id,
        job: {
          ...where,
          postedAt: { lt: recentFrom },
        },
      },
    });

    const demandCount = await prisma.jobSkill.count({
      where: {
        skillId: skillRow.id,
        job: {
          ...where,
          postedAt: { gte: recentFrom },
        },
      },
    });

    results.push({
      skill: skill.name,
      demand: demandCount,
      supply: supplyCount,
    });
  }

  return results;
}

export async function generateInsights(
  where: Record<string, unknown>,
  jobsLast30Days: number,
  topSkillName: string | undefined,
  avgSalary: number,
) {
  const insights: { icon: string; text: string; href: string }[] = [];

  const dataRoles = await prisma.job.count({
    where: {
      ...where,
      OR: [
        { title: { contains: "Data" } },
        { title: { contains: "Analyst" } },
      ],
    },
  });

  if (dataRoles > 0) {
    insights.push({
      icon: "chart",
      text: `Data and analyst roles represent ${dataRoles} active postings in the current dataset.`,
      href: "/jobs",
    });
  }

  if (topSkillName) {
    insights.push({
      icon: "excel",
      text: `${topSkillName} is the most frequently requested skill across tracked job postings.`,
      href: "/skills",
    });
  }

  const aiJobs = await prisma.job.count({
    where: {
      ...where,
      OR: [
        { title: { contains: "AI" } },
        { technologies: { contains: "ai" } },
        { title: { contains: "Machine Learning" } },
      ],
    },
  });

  if (aiJobs > 0) {
    insights.push({
      icon: "ai",
      text: `${aiJobs} postings reference AI or machine learning capabilities.`,
      href: "/tech",
    });
  }

  insights.push({
    icon: "salary",
    text: `Average posted salary is ${avgSalary > 0 ? `$${avgSalary.toLocaleString()}` : "not widely disclosed"} across current postings.`,
    href: "/salary",
  });

  if (insights.length < 4) {
    insights.push({
      icon: "chart",
      text: `${jobsLast30Days} job postings ingested in the last 30 days across current filters.`,
      href: "/",
    });
  }

  return insights.slice(0, 4);
}

export async function generateAlerts(
  where: Record<string, unknown>,
  skillGaps: { overall: number; technical: number },
  emerging: { name: string; growthPct: number }[],
) {
  const alerts: { type: "warning" | "info" | "trend"; text: string; time: string; href: string }[] = [];

  if (skillGaps.overall >= 50) {
    alerts.push({
      type: "warning",
      text: `Demand is concentrated: the top skill category accounts for ${skillGaps.overall}% of categorized skill mentions.`,
      time: "Based on current postings",
      href: "/gaps",
    });
  }

  const topEmerging = emerging.find((e) => e.growthPct > 20);
  if (topEmerging) {
    alerts.push({
      type: "info",
      text: `Emerging demand detected: ${topEmerging.name} (+${topEmerging.growthPct}% vs prior 30 days).`,
      time: "Recently",
      href: "/tech",
    });
  }

  const recentJobs = await prisma.job.findMany({
    where,
    orderBy: { postedAt: "desc" },
    take: 1,
    select: { postedAt: true, country: true, title: true },
  });

  if (recentJobs[0]) {
    const hoursAgo = Math.round((Date.now() - recentJobs[0].postedAt.getTime()) / (1000 * 60 * 60));
    alerts.push({
      type: "trend",
      text: `Latest ingestion: "${recentJobs[0].title}" in ${recentJobs[0].country}.`,
      time: hoursAgo < 1 ? "Just now" : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.round(hoursAgo / 24)}d ago`,
      href: "/jobs",
    });
  }

  if (skillGaps.technical >= 40) {
    alerts.push({
      type: "info",
      text: `Technical skills are ${skillGaps.technical}% of categorized demand — employers are hiring heavily for tech capabilities.`,
      time: "Based on current postings",
      href: "/gaps",
    });
  }

  return alerts.slice(0, 6);
}

export type WeeklyPoint = { weekStart: string; weekEnd: string; value: number };

export async function getWeeklyJobTrend(where: Record<string, unknown>, weeks = 8): Promise<WeeklyPoint[]> {
  const points: WeeklyPoint[] = [];
  const now = Date.now();
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(now - i * 7 * MS_DAY);
    const start = new Date(end.getTime() - 7 * MS_DAY);
    const count = await prisma.job.count({
      where: { ...where, postedAt: { gte: start, lt: end } },
    });
    points.push({ weekStart: start.toISOString(), weekEnd: end.toISOString(), value: count });
  }
  return points;
}

export async function getWeeklyCompanyTrend(where: Record<string, unknown>, weeks = 8): Promise<WeeklyPoint[]> {
  const points: WeeklyPoint[] = [];
  const now = Date.now();
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(now - i * 7 * MS_DAY);
    const start = new Date(end.getTime() - 7 * MS_DAY);
    const companies = await prisma.job.findMany({
      where: { ...where, postedAt: { gte: start, lt: end } },
      distinct: ["company"],
      select: { company: true },
    });
    points.push({ weekStart: start.toISOString(), weekEnd: end.toISOString(), value: companies.length });
  }
  return points;
}

export async function getWeeklySkillTrend(where: Record<string, unknown>, weeks = 8): Promise<WeeklyPoint[]> {
  const points: WeeklyPoint[] = [];
  const now = Date.now();
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(now - i * 7 * MS_DAY);
    const start = new Date(end.getTime() - 7 * MS_DAY);
    const skills = await prisma.jobSkill.groupBy({
      by: ["skillId"],
      where: { job: { ...where, postedAt: { gte: start, lt: end } } },
    });
    points.push({ weekStart: start.toISOString(), weekEnd: end.toISOString(), value: skills.length });
  }
  return points;
}

export async function getWeeklySalaryTrend(where: Record<string, unknown>, weeks = 8): Promise<WeeklyPoint[]> {
  const points: WeeklyPoint[] = [];
  const now = Date.now();
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(now - i * 7 * MS_DAY);
    const start = new Date(end.getTime() - 7 * MS_DAY);
    const avg = await prisma.job.aggregate({
      where: { ...where, postedAt: { gte: start, lt: end }, salaryMinUsd: { not: null } },
      _avg: { salaryMinUsd: true },
    });
    points.push({ weekStart: start.toISOString(), weekEnd: end.toISOString(), value: Math.round(avg._avg.salaryMinUsd ?? 0) });
  }
  return points;
}
