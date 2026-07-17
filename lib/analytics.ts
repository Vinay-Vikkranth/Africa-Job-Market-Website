import { prisma } from "@/lib/prisma";
import { categorizeSkill } from "@/lib/skill-categories";

const MS_DAY = 24 * 60 * 60 * 1000;

export function growthPct(recent: number, prior: number) {
  if (prior === 0) return recent > 0 ? 100 : 0;
  return Number((((recent - prior) / prior) * 100).toFixed(1));
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

  // Overall index = dominant category's share of demand. High values mean
  // demand is concentrated in one skill category (a lopsided market).
  const overall = Math.max(gaps.technical, gaps.digital, gaps.soft, gaps.business);

  return { ...gaps, overall, totalJobs };
}

export async function getWeeklyGapTrend(where: Record<string, unknown>, weeks = 8) {
  const points: number[] = [];
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
      points.push(0);
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
    points.push(total === 0 ? 0 : Math.round((Math.max(...Object.values(demand)) / total) * 100));
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
  growth: number,
  topSkillName: string | undefined,
  avgSalary: number,
  salaryGrowth: number,
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
      href: "/skills",
    });
  }

  insights.push({
    icon: "salary",
    text:
      salaryGrowth !== 0
        ? `Average posted salary moved ${salaryGrowth > 0 ? "up" : "down"} ${Math.abs(salaryGrowth)}% vs the prior period (${avgSalary > 0 ? `$${avgSalary.toLocaleString()} avg` : "limited salary data"}).`
        : `Average posted salary is ${avgSalary > 0 ? `$${avgSalary.toLocaleString()}` : "not widely disclosed"} across current postings.`,
    href: "/salary",
  });

  if (insights.length < 4) {
    insights.push({
      icon: "chart",
      text: `Job posting volume changed ${growth > 0 ? "+" : ""}${growth}% compared to the previous 30-day window.`,
      href: "/",
    });
  }

  return insights.slice(0, 4);
}

export async function generateAlerts(
  where: Record<string, unknown>,
  skillGaps: { overall: number; technical: number },
) {
  const alerts: { type: "warning" | "info" | "trend"; text: string; time: string; href: string }[] = [];

  if (skillGaps.overall >= 50) {
    alerts.push({
      type: "warning",
      text: `Overall skill gap index is elevated at ${skillGaps.overall}% based on category demand distribution.`,
      time: "Just now",
      href: "/gaps",
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
      time: hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.round(hoursAgo / 24)}d ago`,
      href: "/jobs",
    });
  }

  if (skillGaps.technical >= 40) {
    alerts.push({
      type: "warning",
      text: "Technical skill demand outweighs other categories — consider accelerated tech training pathways.",
      time: "Today",
      href: "/gaps",
    });
  }

  return alerts.slice(0, 6);
}

export async function getWeeklyJobTrend(where: Record<string, unknown>, weeks = 8) {
  const points: number[] = [];
  const now = Date.now();
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(now - i * 7 * MS_DAY);
    const start = new Date(end.getTime() - 7 * MS_DAY);
    const count = await prisma.job.count({
      where: { ...where, postedAt: { gte: start, lt: end } },
    });
    points.push(count);
  }
  return points;
}

export async function getWeeklyCompanyTrend(where: Record<string, unknown>, weeks = 8) {
  const points: number[] = [];
  const now = Date.now();
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(now - i * 7 * MS_DAY);
    const start = new Date(end.getTime() - 7 * MS_DAY);
    const companies = await prisma.job.findMany({
      where: { ...where, postedAt: { gte: start, lt: end } },
      distinct: ["company"],
      select: { company: true },
    });
    points.push(companies.length);
  }
  return points;
}

export async function getWeeklySkillTrend(where: Record<string, unknown>, weeks = 8) {
  const points: number[] = [];
  const now = Date.now();
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(now - i * 7 * MS_DAY);
    const start = new Date(end.getTime() - 7 * MS_DAY);
    const skills = await prisma.jobSkill.groupBy({
      by: ["skillId"],
      where: { job: { ...where, postedAt: { gte: start, lt: end } } },
    });
    points.push(skills.length);
  }
  return points;
}

export async function getWeeklySalaryTrend(where: Record<string, unknown>, weeks = 8) {
  const points: number[] = [];
  const now = Date.now();
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(now - i * 7 * MS_DAY);
    const start = new Date(end.getTime() - 7 * MS_DAY);
    const avg = await prisma.job.aggregate({
      where: { ...where, postedAt: { gte: start, lt: end }, salaryMinUsd: { not: null } },
      _avg: { salaryMinUsd: true },
    });
    points.push(Math.round(avg._avg.salaryMinUsd ?? 0));
  }
  return points;
}
