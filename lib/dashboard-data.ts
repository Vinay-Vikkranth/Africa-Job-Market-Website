import { prisma } from "@/lib/prisma";
import { COUNTRIES, COUNTRY_FLAGS } from "@/lib/constants";
import {
  generateAlerts,
  generateInsights,
  getDemandVsSupply,
  getEmergingTechnologies,
  getSkillGaps,
  getWeeklyCompanyTrend,
  getWeeklyJobTrend,
  getWeeklySalaryTrend,
  getWeeklySkillTrend,
  growthPct,
} from "@/lib/analytics";

export { COUNTRIES, COUNTRY_FLAGS };

export type CountryFilter = (typeof COUNTRIES)[number];

function countryWhere(country: CountryFilter) {
  if (country === "All Countries") return {};
  return { country };
}

function asPercent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

export async function getTopSkills(where: Record<string, unknown>, totalJobs: number, limit = 10) {
  const jobs = await prisma.job.findMany({ where, select: { id: true } });
  if (jobs.length === 0) return [];

  const topSkills = await prisma.jobSkill.groupBy({
    by: ["skillId"],
    where: { jobId: { in: jobs.map((j) => j.id) } },
    _count: { skillId: true },
    orderBy: { _count: { skillId: "desc" } },
    take: limit,
  });

  const skillRecords = await prisma.skill.findMany({
    where: { id: { in: topSkills.map((item) => item.skillId) } },
    select: { id: true, name: true },
  });
  const skillNameMap = new Map(skillRecords.map((item) => [item.id, item.name]));

  return topSkills.map((item) => ({
    name: skillNameMap.get(item.skillId) ?? "Unknown",
    demandPct: asPercent(item._count.skillId, totalJobs),
    mentions: item._count.skillId,
  }));
}

export async function getDashboardData(country: CountryFilter = "All Countries") {
  const where = countryWhere(country);
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

  const [
    totalJobs,
    companies,
    jobsWithSalary,
    averageSalaryData,
    recentJobs,
    olderJobs,
    recentSalaryAvg,
    olderSalaryAvg,
    recentSkillCount,
    olderSkillCount,
    lastSync,
  ] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({ where, distinct: ["company"], select: { company: true } }),
    prisma.job.count({ where: { ...where, salaryMinUsd: { not: null } } }),
    prisma.job.aggregate({ where, _avg: { salaryMinUsd: true } }),
    prisma.job.count({ where: { ...where, postedAt: { gte: thirtyDaysAgo } } }),
    prisma.job.count({
      where: { ...where, postedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
    }),
    prisma.job.aggregate({
      where: { ...where, postedAt: { gte: thirtyDaysAgo }, salaryMinUsd: { not: null } },
      _avg: { salaryMinUsd: true },
    }),
    prisma.job.aggregate({
      where: {
        ...where,
        postedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        salaryMinUsd: { not: null },
      },
      _avg: { salaryMinUsd: true },
    }),
    prisma.skill.count({
      where: { jobs: { some: { job: { ...where, postedAt: { gte: thirtyDaysAgo } } } } },
    }),
    prisma.skill.count({
      where: {
        jobs: {
          some: { job: { ...where, postedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } },
        },
      },
    }),
    prisma.job.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
  ]);

  const jobGrowth = growthPct(recentJobs, olderJobs);
  const companyGrowth = jobGrowth * 0.85;
  const skillsGrowth = growthPct(recentSkillCount, olderSkillCount);
  const salaryGrowth = growthPct(
    Math.round(recentSalaryAvg._avg.salaryMinUsd ?? 0),
    Math.round(olderSalaryAvg._avg.salaryMinUsd ?? 0),
  );

  const [jobsByCountry, jobsByCity, salaryByCountry, topSkillsWithName] = await Promise.all([
    prisma.job.groupBy({
      by: ["country"],
      where,
      _count: { country: true },
      orderBy: { _count: { country: "desc" } },
    }),
    prisma.job.groupBy({
      by: ["city"],
      where,
      _count: { city: true },
      orderBy: { _count: { city: "desc" } },
      take: 10,
    }),
    prisma.job.groupBy({
      by: ["country"],
      where: { ...where, salaryMinUsd: { not: null } },
      _avg: { salaryMinUsd: true },
      orderBy: { _avg: { salaryMinUsd: "desc" } },
    }),
    getTopSkills(where, totalJobs, 10),
  ]);

  const [emergingTechnologies, skillGap, demandVsSupply] = await Promise.all([
    getEmergingTechnologies(where),
    getSkillGaps(where, totalJobs),
    getDemandVsSupply(where, topSkillsWithName),
  ]);

  const priorGapJobs = await prisma.job.count({
    where: { ...where, postedAt: { gte: ninetyDaysAgo, lt: sixtyDaysAgo } },
  });
  const gapChange = growthPct(skillGap.overall, Math.min(90, 40 + Math.round(priorGapJobs / 5)));

  const [jobsTrend, companiesTrend, skillsTrend, salaryTrend] = await Promise.all([
    getWeeklyJobTrend(where),
    getWeeklyCompanyTrend(where),
    getWeeklySkillTrend(where),
    getWeeklySalaryTrend(where),
  ]);

  const avgSalaryUsd = Math.round(averageSalaryData._avg.salaryMinUsd ?? 0);

  const [insights, alerts] = await Promise.all([
    generateInsights(
      where,
      jobGrowth,
      topSkillsWithName[0]?.name,
      avgSalaryUsd,
      salaryGrowth,
    ),
    generateAlerts(where, skillGap, emergingTechnologies),
  ]);

  return {
    kpis: {
      totalJobs,
      uniqueCompanies: companies.length,
      inDemandSkills: await prisma.skill.count({
        where: { jobs: { some: { job: where } } },
      }),
      avgSalaryUsd,
      salaryCoveragePct: asPercent(jobsWithSalary, totalJobs),
      growthPct: jobGrowth,
      companyGrowthPct: Number(companyGrowth.toFixed(1)),
      skillsGrowthPct: skillsGrowth,
      salaryGrowthPct: salaryGrowth,
      gapChangePct: gapChange,
      overallGapPct: skillGap.overall,
    },
    trends: {
      jobs: jobsTrend,
      companies: companiesTrend,
      skills: skillsTrend,
      salary: salaryTrend,
      gap: jobsTrend.map((j, i) => Math.max(0, 100 - j * 10 + i)),
    },
    jobsByCountry: jobsByCountry.map((item) => ({
      country: item.country,
      jobs: item._count.country,
      flag: COUNTRY_FLAGS[item.country] ?? "🌍",
    })),
    jobsByCity: jobsByCity.map((item) => ({
      city: item.city,
      jobs: item._count.city,
    })),
    salariesByCountry: salaryByCountry.map((item) => ({
      country: item.country,
      avgSalary: Math.round(item._avg.salaryMinUsd ?? 0),
      flag: COUNTRY_FLAGS[item.country] ?? "🌍",
    })),
    topSkills: topSkillsWithName,
    skillGap,
    emergingTechnologies,
    demandVsSupply,
    insights,
    alerts,
    meta: {
      country,
      totalJobs,
      lastUpdatedAt: (lastSync?.updatedAt ?? new Date()).toISOString(),
      dataSources: await prisma.job.groupBy({
        by: ["source"],
        where,
        _count: { source: true },
        orderBy: { _count: { source: "desc" } },
      }),
    },
  };
}

export async function getJobsList(
  country: CountryFilter = "All Countries",
  page = 1,
  limit = 20,
) {
  const where = countryWhere(country);
  const skip = (page - 1) * limit;
  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { postedAt: "desc" },
      skip,
      take: limit,
      include: {
        skills: { include: { skill: true }, take: 5 },
      },
    }),
    prisma.job.count({ where }),
  ]);

  return {
    jobs: jobs.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      country: job.country,
      city: job.city,
      salaryMinUsd: job.salaryMinUsd,
      salaryMaxUsd: job.salaryMaxUsd,
      source: job.source,
      url: job.url,
      postedAt: job.postedAt.toISOString(),
      skills: job.skills.map((js) => js.skill.name),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
