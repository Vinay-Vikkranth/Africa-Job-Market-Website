import { createHash } from "node:crypto";
import { detectCountry } from "@/lib/city-country";
import {
  extractSkillsFromText,
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
  postedAt: Date;
};

function textFromJsonLdLocation(location: unknown): string {
  if (!location) return "";
  if (typeof location === "string") return location;
  if (Array.isArray(location)) return location.map(textFromJsonLdLocation).join(", ");
  if (typeof location === "object") {
    const record = location as Record<string, unknown>;
    const address = record.address;
    if (address && typeof address === "object") {
      const a = address as Record<string, unknown>;
      return [a.addressLocality, a.addressRegion, a.addressCountry]
        .filter(Boolean)
        .join(", ");
    }
    return String(record.name ?? "");
  }
  return "";
}

// Only structured JSON-LD JobPosting entries are ingested. Loose HTML link
// scraping was removed because it captured navigation links ("Post A Job",
// category pages) as fake job records.
function parseJsonLdJobs(html: string): ParsedListing[] {
  const listings: ParsedListing[] = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]) as unknown;
      const roots = Array.isArray(json) ? json : [json];
      const items = roots.flatMap((root) => {
        if (root && typeof root === "object" && Array.isArray((root as Record<string, unknown>)["@graph"])) {
          return (root as Record<string, unknown>)["@graph"] as unknown[];
        }
        return [root];
      });

      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        if (record["@type"] !== "JobPosting") continue;

        const title = String(record.title ?? "").trim();
        const company =
          typeof record.hiringOrganization === "object" && record.hiringOrganization
            ? String((record.hiringOrganization as Record<string, unknown>).name ?? "Unknown")
            : "Unknown";
        const location = textFromJsonLdLocation(record.jobLocation);
        const url = String(record.url ?? record.sameAs ?? "").trim();
        const description = String(record.description ?? "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const postedAt = record.datePosted ? new Date(String(record.datePosted)) : new Date();

        if (title && url) {
          listings.push({ title, company, location, url, description, postedAt });
        }
      }
    } catch {
      // skip malformed JSON-LD blocks
    }
  }

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

async function syncBoard(config: (typeof BOARD_CONFIG)[number]): Promise<SyncResult> {
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
    allListings.push(...parseJsonLdJobs(html));
  }

  for (const listing of dedupeListings(allListings).slice(0, 100)) {
    const country =
      detectCountry(listing.location) ?? config.country;
    const city = listing.location.split(",")[0]?.trim() || "Unknown";
    const skills = extractSkillsFromText(listing.title, listing.description);

    // Full-URL hash prevents the ID collisions caused by truncated base64 slugs.
    const slug = createHash("sha256").update(listing.url).digest("hex").slice(0, 24);
    const { isNew } = await upsertIngestedJob({
      externalId: `${config.source.toLowerCase()}-${slug}`,
      title: listing.title,
      company: listing.company,
      country,
      city,
      source: config.source,
      url: listing.url,
      technologies: skills.join(", "),
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
