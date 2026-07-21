import { prisma } from "@/lib/prisma";
import { COUNTRIES, COUNTRY_FLAGS } from "@/lib/constants";
import {
  generateAlerts,
  generateInsights,
  getDemandVsSupply,
  getEmergingTechnologies,
  getSkillGaps,
  getSyllabusGap,
  getWeeklyCompanyTrend,
  getWeeklyGapTrend,
  getWeeklyJobTrend,
  getWeeklySalaryTrend,
  getWeeklySkillTrend,
  growthPct,
} from "@/lib/analytics";
import { hasSyllabus } from "@/lib/syllabus-data";
import { getWorkforceContext } from "@/lib/world-bank";
import { getNigeriaEducationAttainment } from "@/lib/dhs-nigeria";

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

export async function getTopSkills(where: Record<string, unknown>, totalJobs: number) {
  if (totalJobs === 0) return [];

  // Filter through the relation instead of an IN(...) list of job IDs, which
  // exceeds SQLite's bound-parameter limit on large datasets.
  const topSkills = await prisma.jobSkill.groupBy({
    by: ["skillId"],
    where: { job: where },
    _count: { skillId: true },
    orderBy: { _count: { skillId: "desc" } },
  });

  const skillRecords = await prisma.skill.findMany({
    where: { id: { in: topSkills.map((item) => item.skillId) } },
    select: { id: true, name: true, tier1: true },
  });
  const skillMap = new Map(skillRecords.map((item) => [item.id, item]));

  // Use total mentions across displayed skills so all bars share 100%
  const totalMentions = topSkills.reduce((sum, item) => sum + item._count.skillId, 0);

  return topSkills.map((item) => {
    const rec = skillMap.get(item.skillId);
    return {
      name: rec?.name ?? "Unknown",
      tier1: rec?.tier1 ?? "other",
      demandPct: asPercent(item._count.skillId, totalMentions),
      mentions: item._count.skillId,
    };
  });
}

export async function getDashboardData(country: CountryFilter = "All Countries") {
  const where = countryWhere(country);
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);
  const [
    totalJobs,
    companies,
    jobsWithSalary,
    averageSalaryData,
    recentJobs,
    olderJobs,
    recentCompanies,
    olderCompanies,
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
    prisma.job.findMany({
      where: { ...where, postedAt: { gte: thirtyDaysAgo } },
      distinct: ["company"],
      select: { company: true },
    }),
    prisma.job.findMany({
      where: { ...where, postedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      distinct: ["company"],
      select: { company: true },
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
  const companyGrowth = growthPct(recentCompanies.length, olderCompanies.length);
  const skillsGrowth = growthPct(recentSkillCount, olderSkillCount);
  const salaryGrowth = growthPct(
    Math.round(recentSalaryAvg._avg.salaryMinUsd ?? 0),
    Math.round(olderSalaryAvg._avg.salaryMinUsd ?? 0),
  );

  const [jobsByCountry, jobsByCity, salaryByCountry, topSkillsWithName] = await Promise.all([
    // Always fetch ALL countries for the map — it's the navigation tool, not a filtered view
    prisma.job.groupBy({
      by: ["country"],
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
    getTopSkills(where, totalJobs),
  ]);

  const [emergingTechnologies, skillGap, priorSkillGap, demandVsSupply, syllabusGap, workforceContext, nigeriaEducation] = await Promise.all([
    getEmergingTechnologies(where),
    getSkillGaps(where, totalJobs),
    getSkillGaps(where, totalJobs, thirtyDaysAgo),
    getDemandVsSupply(where, topSkillsWithName),
    hasSyllabus(country) ? getSyllabusGap(country, where) : Promise.resolve(null),
    getWorkforceContext(country),
    getNigeriaEducationAttainment(),
  ]);

  const gapChange = growthPct(skillGap.overall, priorSkillGap.overall);

  const [jobsTrend, companiesTrend, skillsTrend, salaryTrend, gapTrend] = await Promise.all([
    getWeeklyJobTrend(where),
    getWeeklyCompanyTrend(where),
    getWeeklySkillTrend(where),
    getWeeklySalaryTrend(where),
    getWeeklyGapTrend(where),
  ]);

  const avgSalaryUsd = Math.round(averageSalaryData._avg.salaryMinUsd ?? 0);

  const [insights, alerts] = await Promise.all([
    generateInsights(
      where,
      recentJobs,
      topSkillsWithName[0]?.name,
      avgSalaryUsd,
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
      jobsLast30Days: recentJobs,
      companiesLast30Days: recentCompanies.length,
      skillsLast30Days: recentSkillCount,
      growthPct: jobGrowth,
      companyGrowthPct: Number(companyGrowth.toFixed(1)),
      skillsGrowthPct: skillsGrowth,
      salaryGrowthPct: salaryGrowth,
      gapChangePct: syllabusGap ? 0 : gapChange,
      overallGapPct: syllabusGap?.gapRate ?? skillGap.overall,
    },
    trends: {
      jobs: jobsTrend,
      companies: companiesTrend,
      skills: skillsTrend,
      salary: salaryTrend,
      gap: gapTrend,
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
    syllabusGap,
    workforceContext,
    nigeriaEducation,
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
  source?: string,
) {
  const where = {
    ...countryWhere(country),
    ...(source ? { source } : {}),
  };
  const skip = (page - 1) * limit;
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);
  const [jobs, total, companies, recentJobs, olderJobs] = await Promise.all([
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
    prisma.job.findMany({ where, distinct: ["company"], select: { company: true } }),
    prisma.job.count({ where: { ...where, postedAt: { gte: thirtyDaysAgo } } }),
    prisma.job.count({
      where: { ...where, postedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
    }),
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
    uniqueCompanies: companies.length,
    jobsLast30Days: recentJobs,
    growthPct: growthPct(recentJobs, olderJobs),
    source: source ?? null,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
