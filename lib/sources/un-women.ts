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
 * Official UN Women vacancy RSS feed, maintained by UNDP.
 * Public, no authentication:
 * https://jobs.undp.org/rss_feeds/UNWomen.xml
 */
export async function syncUnWomenJobs(): Promise<SyncResult> {
  const response = await fetch("https://jobs.undp.org/rss_feeds/UNWomen.xml", {
    headers: { "User-Agent": "SkillsObservatory/1.0" },
    next: { revalidate: 0 },
  });
  if (!response.ok) throw new Error(`UN Women feed failed: ${response.status}`);

  const xml = await response.text();
  const $ = cheerio.load(xml, { xmlMode: true });
  let inserted = 0;
  let updated = 0;
  const activeExternalIds: string[] = [];

  for (const element of $("item").toArray()) {
    const item = $(element);
    const title =
      item.find("undpjobs\\:job_title").text().trim() ||
      item.find("title").text().trim();
    const url = item.find("link").text().trim();
    const dutyStation = item.find("undpjobs\\:duty_station").text().trim();
    const countryName = item.find("undpjobs\\:duty_station_cty").text().trim();
    const country = detectCountry(countryName, dutyStation);
    if (!country || !title || !url) continue;

    const jobFunction = item.find("undpjobs\\:job_function").text().trim();
    const recruitingType = item.find("undpjobs\\:recruiting_type").text().trim();
    const postLevel = item.find("undpjobs\\:post_level").text().trim();
    const published = item.find("dc\\:date").text().trim();
    const context = [jobFunction, recruitingType, postLevel].filter(Boolean);
    const skills = extractSkillsFromText(title, context.join(" "), context);
    const jobId =
      url.match(/\/job\/(\d+)/i)?.[1] ??
      Buffer.from(url).toString("base64url").slice(-32);
    const externalId = `un-women-${jobId}`;
    activeExternalIds.push(externalId);

    const { isNew } = await upsertIngestedJob({
      externalId,
      title,
      company: "UN Women",
      country,
      city: dutyStation || "Unknown",
      source: "UN Women",
      url,
      technologies: context.join(", "),
      postedAt: published ? new Date(published) : new Date(),
      skills,
    });

    if (isNew) inserted += 1;
    else updated += 1;
  }

  if (activeExternalIds.length > 0) {
    await prisma.job.deleteMany({
      where: {
        source: "UN Women",
        externalId: { notIn: activeExternalIds },
      },
    });
  }

  return { inserted, updated };
}

export async function syncUnWomenWithLog() {
  return runSourceSync("UN Women", syncUnWomenJobs);
}
