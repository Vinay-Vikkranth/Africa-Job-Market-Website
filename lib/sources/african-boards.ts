import * as cheerio from "cheerio";
import { detectCountryFromText } from "@/lib/city-country";
import {
  extractSkillsFromText,
  parseSalaryFromText,
  runSourceSync,
  upsertIngestedJob,
  type SyncResult,
} from "@/lib/ingest/shared";

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; SkillsObservatory/1.0; +https://skills-observatory.local)",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
};

const BOARD_CONFIG = [
  {
    source: "BrighterMonday",
    country: "Kenya",
    baseUrl: "https://www.brightermonday.co.ke",
    searchPaths: ["/jobs?q=data", "/jobs?q=software", "/jobs?q=marketing"],
  },
  {
    source: "BrighterMonday",
    country: "Ghana",
    baseUrl: "https://www.brightermonday.com.gh",
    searchPaths: ["/jobs?q=data", "/jobs?q=finance"],
  },
  {
    source: "Jobberman",
    country: "Nigeria",
    baseUrl: "https://www.jobberman.com",
    searchPaths: ["/jobs", "/jobs?location=lagos"],
  },
] as const;

type ParsedListing = {
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  salaryText?: string;
  postedAt: Date;
};

function parseJsonLdJobs(html: string): ParsedListing[] {
  const listings: ParsedListing[] = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]) as unknown;
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        if (record["@type"] !== "JobPosting") continue;

        const title = String(record.title ?? "");
        const company =
          typeof record.hiringOrganization === "object" && record.hiringOrganization
            ? String((record.hiringOrganization as Record<string, unknown>).name ?? "Unknown")
            : "Unknown";
        const location =
          typeof record.jobLocation === "object" && record.jobLocation
            ? JSON.stringify(record.jobLocation)
            : String(record.jobLocation ?? "");
        const url = String(record.url ?? record.sameAs ?? "");
        const description = String(record.description ?? "");
        const salaryText =
          typeof record.baseSalary === "object"
            ? JSON.stringify(record.baseSalary)
            : String(record.baseSalary ?? "");
        const postedAt = record.datePosted
          ? new Date(String(record.datePosted))
          : new Date();

        if (title && url) {
          listings.push({ title, company, location, url, description, salaryText, postedAt });
        }
      }
    } catch {
      // skip malformed JSON-LD blocks
    }
  }

  return listings;
}

function parseHtmlCards(html: string, baseUrl: string): ParsedListing[] {
  const $ = cheerio.load(html);
  const listings: ParsedListing[] = [];

  $("a[href*='/job']").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (!href || href.includes("login")) return;

    const title = $(el).find("h2, h3, .job-title, [class*='title']").first().text().trim()
      || $(el).text().trim().split("\n")[0]?.trim();
    if (!title || title.length < 4 || title.length > 120) return;

    const parent = $(el).closest("article, li, div[class*='job'], div[class*='card']");
    const company =
      parent.find("[class*='company'], .company, [data-testid*='company']").first().text().trim()
      || "Unknown";
    const location =
      parent.find("[class*='location'], .location, [data-testid*='location']").first().text().trim()
      || "";
    const url = href.startsWith("http") ? href : `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;

    listings.push({
      title,
      company: company || "Unknown",
      location,
      url,
      description: parent.text().slice(0, 2000),
      postedAt: new Date(),
    });
  });

  return listings;
}

async function fetchBoardPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const response = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function dedupeListings(listings: ParsedListing[]) {
  const seen = new Set<string>();
  return listings.filter((item) => {
    const key = item.url || item.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function syncBoard(
  config: (typeof BOARD_CONFIG)[number],
): Promise<SyncResult> {
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];
  const allListings: ParsedListing[] = [];

  for (const path of config.searchPaths) {
    const html = await fetchBoardPage(`${config.baseUrl}${path}`);
    if (!html) {
      errors.push(`Failed to fetch ${config.baseUrl}${path}`);
      continue;
    }
    allListings.push(...parseJsonLdJobs(html), ...parseHtmlCards(html, config.baseUrl));
  }

  for (const listing of dedupeListings(allListings).slice(0, 80)) {
    const country =
      detectCountryFromText(`${listing.location} ${listing.description} ${listing.title}`) ??
      config.country;
    const city = listing.location.split(",")[0]?.trim() || "Unknown";
    const salary = parseSalaryFromText(listing.salaryText);
    const skills = extractSkillsFromText(listing.title, listing.description);

    const slug = Buffer.from(listing.url).toString("base64url").slice(0, 40);
    const { isNew } = await upsertIngestedJob({
      externalId: `${config.source.toLowerCase()}-${slug}`,
      title: listing.title,
      company: listing.company,
      country,
      city,
      source: config.source,
      url: listing.url,
      technologies: skills.join(", "),
      salaryMinUsd: salary.min,
      salaryMaxUsd: salary.max,
      currency: "USD",
      postedAt: listing.postedAt,
      skills,
    });

    if (isNew) inserted += 1;
    else updated += 1;
  }

  return { inserted, updated, errors: errors.length ? errors : undefined };
}

export async function syncBrighterMondayJobs() {
  const kenya = await syncBoard(BOARD_CONFIG[0]);
  const ghana = await syncBoard(BOARD_CONFIG[1]);
  return {
    inserted: kenya.inserted + ghana.inserted,
    updated: kenya.updated + ghana.updated,
    errors: [...(kenya.errors ?? []), ...(ghana.errors ?? [])],
  };
}

export async function syncJobbermanJobs() {
  return syncBoard(BOARD_CONFIG[2]);
}

export async function syncAfricanJobBoards() {
  const [brighterMonday, jobberman] = await Promise.all([
    runSourceSync("BrighterMonday", syncBrighterMondayJobs),
    runSourceSync("Jobberman", syncJobbermanJobs),
  ]);
  return { brighterMonday, jobberman };
}
