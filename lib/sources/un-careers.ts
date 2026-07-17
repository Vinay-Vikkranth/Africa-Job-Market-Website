import * as cheerio from "cheerio";
import { detectCountry } from "@/lib/city-country";
import { prisma } from "@/lib/prisma";
import {
  extractSkillsFromText,
  runSourceSync,
  upsertIngestedJob,
  type SyncResult,
} from "@/lib/ingest/shared";

/**
 * Official United Nations Careers RSS feed.
 * Public, no authentication: https://careers.un.org/jobfeed
 */
type UnFeedJob = {
  title: string;
  link: string;
  description: string;
};

function readField(description: string, label: string): string {
  const pattern = new RegExp(`${label}\\s*:\\s*([^<\\r\\n]*)`, "i");
  return description.match(pattern)?.[1]?.trim() ?? "";
}

function parsePostedDate(value: string): Date {
  const datePart = value.match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0];
  if (!datePart) return new Date();
  const parsed = new Date(`${datePart} UTC`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function syncUnCareersJobs(): Promise<SyncResult> {
  const response = await fetch("https://careers.un.org/jobfeed", {
    headers: { Accept: "application/rss+xml, application/xml" },
    next: { revalidate: 0 },
  });
  if (!response.ok) throw new Error(`UN Careers feed failed: ${response.status}`);

  const xml = await response.text();
  const $ = cheerio.load(xml, { xmlMode: true });
  const feedJobs: UnFeedJob[] = [];

  $("item").each((_, element) => {
    feedJobs.push({
      title: $(element).find("title").text().trim(),
      link: $(element).find("link").text().trim(),
      description: $(element).find("description").text().trim(),
    });
  });

  let inserted = 0;
  let updated = 0;
  const activeExternalIds: string[] = [];

  for (const job of feedJobs) {
    const dutyStation = readField(job.description, "Duty Station");
    const country = detectCountry(dutyStation);
    if (!country || !job.title || !job.link) continue;

    const jobId =
      readField(job.description, "Job ID") ||
      job.link.match(/jobSearchDescription\/(\d+)/i)?.[1];
    if (!jobId) continue;
    const externalId = `un-careers-${jobId}`;
    activeExternalIds.push(externalId);

    const department = readField(job.description, "Department/Office");
    const jobFamily = readField(job.description, "Job Family");
    const jobNetwork = readField(job.description, "Job Network");
    const level = readField(job.description, "Level");
    const postedDate = readField(job.description, "Posted Date");
    const context = [jobFamily, jobNetwork, level].filter(Boolean);
    const skills = extractSkillsFromText(job.title, context.join(" "), context);

    const { isNew } = await upsertIngestedJob({
      externalId,
      title: job.title,
      company: department || "United Nations",
      country,
      city: dutyStation || "Unknown",
      source: "UN Careers",
      url: job.link,
      technologies: context.join(", "),
      postedAt: parsePostedDate(postedDate),
      skills,
    });

    if (isNew) inserted += 1;
    else updated += 1;
  }

  if (activeExternalIds.length > 0) {
    await prisma.job.deleteMany({
      where: {
        source: "UN Careers",
        externalId: { notIn: activeExternalIds },
      },
    });
  }

  return { inserted, updated };
}

export async function syncUnCareersWithLog() {
  return runSourceSync("UN Careers", syncUnCareersJobs);
}
