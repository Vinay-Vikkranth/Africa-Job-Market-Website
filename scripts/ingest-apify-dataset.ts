/**
 * One-time ingestion of an existing Apify dataset by ID.
 * Usage: npx tsx scripts/ingest-apify-dataset.ts <datasetId>
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { extractSkillsFromText, parseSalaryFromText, upsertIngestedJob } from "@/lib/ingest/shared";

const ISO2_TO_COUNTRY: Record<string, string> = {
  ZA: "South Africa", NG: "Nigeria", KE: "Kenya", GH: "Ghana",
  TZ: "Tanzania", RW: "Rwanda", UG: "Uganda", ET: "Ethiopia",
  EG: "Egypt", SN: "Senegal", CM: "Cameroon", CI: "Ivory Coast",
};

const datasetId = process.argv[2] ?? "UugwgVxcjEGjERZhm";
const token = process.env.APIFY_TOKEN!;

async function main() {
  const res = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&limit=1000`,
  );
  if (!res.ok) throw new Error(`Dataset fetch failed: ${res.status}`);
  const jobs = (await res.json()) as Record<string, unknown>[];
  console.log(`Fetched ${jobs.length} items from dataset ${datasetId}`);

  let inserted = 0; let updated = 0;

  for (const job of jobs) {
    const title = String(job.title ?? "").trim();
    const url = String(job.apply_url ?? "");
    if (!title || !url) continue;

    const iso = String(job.location_country ?? "ZA").toUpperCase();
    const country = ISO2_TO_COUNTRY[iso] ?? "South Africa";
    const city = String(job.location_city ?? "Unknown").split(",")[0].trim();
    const platform = String(job.platform ?? "careers24");
    const source = platform === "careers24" ? "Careers24"
      : platform === "jobberman" ? "Jobberman"
      : platform === "brightermonday" ? "BrighterMonday" : "Apify";
    const jobId = String(job.job_id ?? Buffer.from(url).toString("base64url").slice(0, 20));
    const salary = parseSalaryFromText(String(job.salary_range ?? ""));
    const skills = extractSkillsFromText(title, String(job.description ?? ""));

    const rawDate = String(job.posted_at ?? job.scraped_at ?? "");
    const dateMatch = rawDate.match(/(\d{1,2}\s+\w+\s+\d{4})/);
    const postedAt = dateMatch ? new Date(dateMatch[1]) : new Date(rawDate);

    const { isNew } = await upsertIngestedJob({
      externalId: `apify-${platform}-${jobId}`,
      title, company: String(job.company ?? "Unknown"),
      country, city, source, url,
      description: job.description ? String(job.description) : undefined,
      technologies: skills.join(", "),
      salaryMinUsd: salary.min, salaryMaxUsd: salary.max,
      postedAt: isNaN(postedAt.getTime()) ? new Date() : postedAt,
      skills,
    });
    if (isNew) inserted++; else updated++;
  }

  console.log(`Done — inserted: ${inserted}, updated: ${updated}`);
  const bySrc = await prisma.job.groupBy({ by: ["source"], _count: { id: true } });
  console.log("\nAll sources:");
  for (const r of bySrc.sort((a, b) => b._count.id - a._count.id))
    console.log(`  ${r.source}: ${r._count.id}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
