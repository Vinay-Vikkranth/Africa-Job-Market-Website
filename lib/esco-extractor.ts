/**
 * ESCO-based skill extractor.
 * Replaces the old 13-keyword dictionary in lib/ingest/shared.ts.
 *
 * Algorithm:
 *  1. Lowercase the full text.
 *  2. Walk every surface form in the taxonomy (longest first so "machine learning"
 *     beats "machine" and "learning" individually).
 *  3. Deduplicate by ESCO URI so "python" and "python3" count once.
 *  4. Group-level fallbacks fire for vague terms ("coding") that never produced a
 *     specific Tier-2 match — they return a Tier-1-only entry.
 */
import taxonomyRaw from "@/lib/esco-taxonomy.json";
import type { Taxonomy, TaxonomyEntry } from "@/scripts/build-esco-taxonomy";

const taxonomy = taxonomyRaw as Taxonomy;

// Pre-sort all surface forms by length descending so longer phrases win
const SORTED_TERMS: [string, number][] = Object.entries(taxonomy.lookup)
  .sort((a, b) => b[0].length - a[0].length);

// Compile group-fallback patterns once
const GROUP_FALLBACKS = taxonomy.groupFallbacks.map((fb) => ({
  patterns: fb.pattern.split("|").map((p) => p.trim().toLowerCase()),
  tier1: fb.tier1,
  tier2: fb.tier2 ?? null,
}));

export type ExtractedSkill = {
  tier2: string;   // canonical skill name, e.g. "Python"
  tier1: string;   // skill category, e.g. "software and applications development"
  uri: string;     // ESCO URI or "custom:..." or "group:..."
};

export function extractSkillsFromText(
  title: string,
  description: string,
  tags: string[] = [],
  category = "",
): ExtractedSkill[] {
  const text = ` ${title} ${category} ${tags.join(" ")} ${description} `.toLowerCase();

  const matchedUris = new Set<string>();
  const results: ExtractedSkill[] = [];

  // Phase 1: exact / phrase matching against taxonomy lookup
  for (const [term, idx] of SORTED_TERMS) {
    const entry: TaxonomyEntry = taxonomy.entries[idx];
    if (matchedUris.has(entry.uri)) continue;

    // Word-boundary aware: term must not be surrounded by alphanumeric chars
    // Use indexOf for speed; add spaces to handle boundaries
    const padded = ` ${term} `;
    if (text.includes(padded) || text.includes(` ${term},`) || text.includes(` ${term};`) || text.includes(`(${term})`) || text.includes(`/${term}`) || text.includes(`${term}/`) || text.startsWith(term + " ")) {
      matchedUris.add(entry.uri);
      results.push({ tier2: entry.tier2, tier1: entry.tier1, uri: entry.uri });
    }
  }

  // Phase 2: group-level fallbacks for vague terms not matched above
  for (const fb of GROUP_FALLBACKS) {
    if (fb.tier2 && matchedUris.has(`group:${fb.tier1}`)) continue;
    for (const pattern of fb.patterns) {
      if (text.includes(` ${pattern} `) || text.includes(` ${pattern},`)) {
        if (fb.tier2) {
          // Treat as a specific skill if tier2 is set
          const uri = `group:${fb.tier2}`;
          if (!matchedUris.has(uri)) {
            matchedUris.add(uri);
            results.push({ tier2: fb.tier2, tier1: fb.tier1, uri });
          }
        } else {
          // Pure group-level fallback (tier2 = null) — skip; don't store category
          // names as skill rows.
        }
        break;
      }
    }
  }

  return results.slice(0, 25);
}

/** Returns just the canonical skill names (backward-compatible with old API) */
export function extractSkillNames(
  title: string,
  description: string,
  tags: string[] = [],
  category = "",
): string[] {
  return extractSkillsFromText(title, description, tags, category).map((s) => s.tier2);
}
