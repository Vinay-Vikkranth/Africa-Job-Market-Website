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

const FUZU_PATHS = [
  { path: "/jobs", country: "Kenya" },
  { path: "/jobs?page=2", country: "Kenya" },
  { path: "/jobs?query=data", country: "Kenya" },
  { path: "/jobs?query=finance", country: "Kenya" },
  { path: "/jobs?query=technology", country: "Kenya" },
  { path: "/jobs?query=marketing", country: "Kenya" },
];

const BASE_URL = "https://fuzu.com";

type ParsedListing = {
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  salaryText?: string;
  postedAt: Date;
};

function parseJsonLd(html: string): ParsedListing[] {
  const listings: ParsedListing[] = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]) as unknown;
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const rec = item as Record<string, unknown>;
        if (rec["@type"] !== "JobPosting") continue;

        const title = String(rec.title ?? "");
        const company =
          typeof rec.hiringOrganization === "object" && rec.hiringOrganization
            ? String((rec.hiringOrganization as Record<string, unknown>).name ?? "Unknown")
            : "Unknown";
        const location =
          typeof rec.jobLocation === "object" && rec.jobLocation
            ? JSON.stringify(rec.jobLocation)
            : String(rec.jobLocation ?? "");
        const url = String(rec.url ?? rec.sameAs ?? "");
        const description = String(rec.description ?? "");
        const salaryText =
          typeof rec.baseSalary === "object"
            ? JSON.stringify(rec.baseSalary)
            : String(rec.baseSalary ?? "");
        const postedAt = rec.datePosted ? new Date(String(rec.datePosted)) : new Date();

        if (title && url) {
          listings.push({ title, company, location, url, description, salaryText, postedAt });
        }
      }
    } catch {
      // skip malformed JSON-LD
    }
  }
  return listings;
}

function parseHtmlCards(html: string): ParsedListing[] {
  const $ = cheerio.load(html);
  const listings: ParsedListing[] = [];

  // Fuzu uses <a> tags with /jobs/ paths for individual listings
  $("a[href*='/jobs/']").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (!href || href === "/jobs/" || href.includes("?") || href.split("/").length < 3) return;

    const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
    const parent = $(el).closest("article, li, div[class*='job'], div[class*='card'], .job");

    const title =
      $(el).find("h2, h3, h4, [class*='title'], [class*='name']").first().text().trim() ||
      $(el).text().trim().split("\n")[0]?.trim();
    if (!title || title.length < 4 || title.length > 140) return;

    const company =
      parent.find("[class*='company'], [class*='employer'], [class*='org']").first().text().trim() ||
      "Unknown";
    const location =
      parent.find("[class*='location'], [class*='city'], [class*='country']").first().text().trim() ||
      "";

    listings.push({
      title,
      company: company || "Unknown",
      location,
      url: fullUrl,
      description: parent.text().slice(0, 2000),
      postedAt: new Date(),
    });
  });

  return listings;
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function dedupe(listings: ParsedListing[]) {
  const seen = new Set<string>();
  return listings.filter((item) => {
    const key = item.url || item.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function syncFuzuJobs(): Promise<SyncResult> {
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];
  const allListings: ParsedListing[] = [];

  for (const { path } of FUZU_PATHS) {
    const html = await fetchPage(`${BASE_URL}${path}`);
    if (!html) {
      errors.push(`Failed to fetch ${BASE_URL}${path}`);
      continue;
    }
    allListings.push(...parseJsonLd(html), ...parseHtmlCards(html));
  }

  for (const listing of dedupe(allListings).slice(0, 120)) {
    const country =
      detectCountryFromText(`${listing.location} ${listing.description} ${listing.title}`) ??
      "Kenya";
    const city = listing.location.split(",")[0]?.trim() || "Unknown";
    const salary = parseSalaryFromText(listing.salaryText);
    const skills = extractSkillsFromText(listing.title, listing.description);

    const slug = Buffer.from(listing.url).toString("base64url").slice(0, 40);
    const { isNew } = await upsertIngestedJob({
      externalId: `fuzu-${slug}`,
      title: listing.title,
      company: listing.company,
      country,
      city,
      source: "Fuzu",
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

export async function syncFuzuWithLog() {
  return runSourceSync("Fuzu", syncFuzuJobs);
}
