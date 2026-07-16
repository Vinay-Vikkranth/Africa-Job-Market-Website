/**
 * One-time build script: reads ESCO CSVs + custom terms, outputs lib/esco-taxonomy.json.
 * Run with: npx tsx scripts/build-esco-taxonomy.ts
 */
import * as fs from "fs";
import * as path from "path";

const ESCO_DIR = path.join(
  process.cwd(),
  "public/data/ESCO dataset - v1.2.1 - classification - en - csv",
);
const CUSTOM_TERMS_PATH = path.join(process.cwd(), "lib/esco-custom-terms.json");
const OUTPUT_PATH = path.join(process.cwd(), "lib/esco-taxonomy.json");

export type TaxonomyEntry = {
  uri: string;
  tier2: string;   // canonical skill name, e.g. "Python"
  tier1: string;   // category, e.g. "software and applications development"
  terms: string[]; // all lowercase surface forms for matching
};

export type GroupFallback = {
  pattern: string; // pipe-separated keywords
  tier1: string;
  tier2: string | null;
};

export type Taxonomy = {
  entries: TaxonomyEntry[];
  lookup: Record<string, number>; // lowercase surface form → entries index
  groupFallbacks: GroupFallback[];
  generatedAt: string;
  stats: { totalEntries: number; totalSurfaceForms: number };
};

// ── CSV parser (RFC 4180: quoted fields, embedded commas, \r\n or \n line endings) ──
function parseCSV(content: string): Record<string, string>[] {
  // Normalise line endings to \n so the rest of the parser is simple
  const text = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let i = 0;
  const n = text.length;

  while (i < n) {
    const row: string[] = [];

    // Parse all fields on this row
    while (i < n && text[i] !== "\n") {
      let field = "";

      if (text[i] === '"') {
        // Quoted field — may span multiple lines
        i++; // skip opening quote
        while (i < n) {
          if (text[i] === '"' && i + 1 < n && text[i + 1] === '"') {
            field += '"'; i += 2; // escaped quote
          } else if (text[i] === '"') {
            i++; break; // closing quote
          } else {
            field += text[i]; i++;
          }
        }
      } else {
        // Unquoted field
        while (i < n && text[i] !== "," && text[i] !== "\n") {
          field += text[i]; i++;
        }
      }

      row.push(field);
      if (i < n && text[i] === ",") i++; // consume comma between fields
    }

    if (i < n && text[i] === "\n") i++; // consume row-ending newline

    if (row.length > 0 && !(row.length === 1 && row[0] === "")) rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, j) => { obj[h.trim()] = row[j] ?? ""; });
    return obj;
  });
}

// Strip disambiguating parenthetical suffixes from ESCO preferred labels
// e.g. "Python (computer programming)" → "Python"
function normalizeLabel(label: string): string {
  return label
    .replace(/\s*\(computer programming\)\s*$/i, "")
    .replace(/\s*\(programming language\)\s*$/i, "")
    .replace(/\s*\(operating system\)\s*$/i, "")
    .replace(/\s*\(database\)\s*$/i, "")
    .replace(/\s*\(software\)\s*$/i, "")
    .trim();
}

// ESCO contains many verb-phrase entries ("think creatively", "use spreadsheets software")
// that are useless as canonical skill names in job-market matching.
// We skip them unless a short noun-phrase alt label is available.
const VERB_STARTS =
  /^(use |think |show |adopt |apply |accept |advise |act |demonstrate |give |handle |keep |learn |listen |maintain |monitor |perform |plan |prepare |protect |provide |raise |react |reflect |resolve |respond |set |support |take |understand |work |get |seek |offer |engage |contribute |interact |collaborate |cooperate |consult |delegate |coordinate |facilitate |access |assess |avoid |check |collect |comply |conduct |consider |create |define |deliver |employ |ensure |establish |evaluate |identify |implement |improve |manage |measure |negotiate |organise |organize |participate |present |process |promote |recognise |recognize |reduce |report |request |review |select |solve |specify |test |train |update |validate |verify )/i;

/** Returns canonical tier2 name, or null to skip this entry. */
function bestLabel(prefLabel: string, altLabels: string): string | null {
  const isVerbPhrase = VERB_STARTS.test(prefLabel.trim());
  if (!isVerbPhrase) return normalizeLabel(prefLabel);

  // Verb phrase: look for a concise noun-phrase alt label (≤ 35 chars, not a verb phrase)
  const alts = altLabels.split("|").map((s) => s.trim()).filter(Boolean);
  const good = alts.find((a) => a.length <= 35 && !VERB_STARTS.test(a));
  return good ? good : null; // null = skip this entry
}

function buildTerms(tier2: string, prefLabel: string, altLabels: string): string[] {
  const terms = new Set<string>();
  const add = (s: string) => { const t = s.trim().toLowerCase(); if (t.length > 1) terms.add(t); };

  add(tier2);
  add(normalizeLabel(prefLabel));
  add(prefLabel);

  for (const alt of altLabels.split("|")) add(alt);
  for (const alt of altLabels.split("\n")) add(alt);

  return [...terms].sort((a, b) => b.length - a.length);
}

function processCollection(
  filePath: string,
  defaultTier1: string | null,
  seen: Set<string>,
  entries: TaxonomyEntry[],
) {
  const content = fs.readFileSync(filePath, "utf8");
  const rows = parseCSV(content);

  for (const row of rows) {
    if (row["status"] !== "released") continue;

    const uri = row["conceptUri"]?.trim();
    const prefLabel = row["preferredLabel"]?.trim();
    if (!uri || !prefLabel || seen.has(uri)) continue;

    const altLabels = row["altLabels"] ?? "";
    const tier2 = bestLabel(prefLabel, altLabels);
    if (!tier2) continue; // skip verb-phrase entries with no good alt label

    seen.add(uri);
    const broaderPT = row["broaderConceptPT"] ?? "";
    const tier1 = defaultTier1 ?? (broaderPT.split("|")[0].trim() || "other");
    const terms = buildTerms(tier2, prefLabel, altLabels);

    entries.push({ uri, tier2, tier1, terms });
  }
}

// Capitalise the first letter only if the label is entirely lowercase
function canonicalize(label: string): string {
  if (!label) return label;
  if (label === label.toLowerCase()) {
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return label;
}

function main() {
  const entries: TaxonomyEntry[] = [];
  const seen = new Set<string>();

  // Load custom terms FIRST so they take priority over ESCO alt-label collisions
  console.log("Processing esco-custom-terms.json…");
  const custom = JSON.parse(fs.readFileSync(CUSTOM_TERMS_PATH, "utf8")) as {
    entries: { uri: string; tier2: string; tier1: string; terms: string[] }[];
    groupFallbacks: GroupFallback[];
  };
  for (const ce of custom.entries) {
    seen.add(ce.uri);
    entries.push({
      uri: ce.uri,
      tier2: ce.tier2,
      tier1: ce.tier1,
      terms: ce.terms.map((t) => t.toLowerCase()),
    });
  }

  // 1. Digital skills collection (~1 284 entries) — skip URIs already in custom
  console.log("Processing digitalSkillsCollection_en.csv…");
  processCollection(
    path.join(ESCO_DIR, "digitalSkillsCollection_en.csv"),
    null,
    seen,
    entries,
  );

  // Transversal skills are covered entirely by custom entries above —
  // the ESCO collection adds only broad verb-phrase noise, so we skip it.

  // Canonicalize tier2 labels (capitalize first letter for lowercase ESCO labels)
  for (const e of entries) {
    e.tier2 = canonicalize(e.tier2);
  }

  // 3. Build flat lookup: surface form → entry index
  //    Custom terms (indices 0..n_custom-1) were added first, so when we iterate
  //    in index order, their terms win over ESCO entries for any surface-form conflict.
  for (const e of entries) {
    e.terms.sort((a, b) => b.length - a.length);
  }

  const lookup: Record<string, number> = {};
  for (let i = 0; i < entries.length; i++) {
    for (const term of entries[i].terms) {
      if (!(term in lookup)) {
        lookup[term] = i;
      }
    }
  }

  const output: Taxonomy = {
    entries,
    lookup,
    groupFallbacks: custom.groupFallbacks ?? [],
    generatedAt: new Date().toISOString(),
    stats: {
      totalEntries: entries.length,
      totalSurfaceForms: Object.keys(lookup).length,
    },
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output));
  console.log(`\n✓ Generated ${entries.length} skill entries, ${Object.keys(lookup).length} surface forms`);
  console.log(`  Output → ${OUTPUT_PATH}`);

  // Quick sanity check for key skills
  const check = ["python", "react", "docker", "aws", "excel", "machine learning", "sql", "typescript", "communication"];
  console.log("\nSanity check:");
  for (const kw of check) {
    const idx = lookup[kw];
    if (idx !== undefined) {
      console.log(`  ✓ "${kw}" → ${entries[idx].tier2} [${entries[idx].tier1}]`);
    } else {
      console.log(`  ✗ "${kw}" NOT FOUND`);
    }
  }
}

main();
