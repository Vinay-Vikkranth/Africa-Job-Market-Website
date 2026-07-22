/**
 * Build a compact youth-employment snapshot from ILOSTAT (rplumber API).
 *
 * Indicators (latest Total observation per country):
 * - POP_XWAP_SEX_AGE_NB  → youth population 15–24 (thousands)
 * - EAP_2WAP_SEX_AGE_RT  → labour force participation 15–24 (%)
 * - EIP_NEET_SEX_RT      → youth NEET rate (%)
 * - UNE_2EAP_SEX_AGE_RT  → youth unemployment 15–24 (%)
 * - EMP_NIFL_SEX_RT      → informal employment rate (%)
 *
 * Run: node scripts/build-youth-employment.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "lib", "data", "youth-employment-ilo.json");

/** Our display names → ILO ref_area.label variants. */
const COUNTRY_ALIASES = {
  Algeria: ["Algeria"],
  Angola: ["Angola"],
  Benin: ["Benin"],
  Botswana: ["Botswana"],
  "Burkina Faso": ["Burkina Faso"],
  Burundi: ["Burundi"],
  "Cabo Verde": ["Cabo Verde", "Cape Verde"],
  Cameroon: ["Cameroon"],
  "Central African Republic": ["Central African Republic"],
  Chad: ["Chad"],
  Comoros: ["Comoros"],
  "Democratic Republic of the Congo": [
    "Congo, Democratic Republic of the",
    "Democratic Republic of the Congo",
    "Congo (Democratic Republic of the)",
  ],
  "Republic of the Congo": ["Congo", "Congo, Republic of the"],
  "Ivory Coast": ["Côte d'Ivoire", "Cote d'Ivoire", "Ivory Coast"],
  Djibouti: ["Djibouti"],
  Egypt: ["Egypt"],
  "Equatorial Guinea": ["Equatorial Guinea"],
  Eritrea: ["Eritrea"],
  Eswatini: ["Eswatini", "Swaziland"],
  Ethiopia: ["Ethiopia"],
  Gabon: ["Gabon"],
  Gambia: ["Gambia", "Gambia, The"],
  Ghana: ["Ghana"],
  Guinea: ["Guinea"],
  "Guinea-Bissau": ["Guinea-Bissau"],
  Kenya: ["Kenya"],
  Lesotho: ["Lesotho"],
  Liberia: ["Liberia"],
  Libya: ["Libya"],
  Madagascar: ["Madagascar"],
  Malawi: ["Malawi"],
  Mali: ["Mali"],
  Mauritania: ["Mauritania"],
  Mauritius: ["Mauritius"],
  Morocco: ["Morocco"],
  Mozambique: ["Mozambique"],
  Namibia: ["Namibia"],
  Niger: ["Niger"],
  Nigeria: ["Nigeria"],
  Rwanda: ["Rwanda"],
  "Sao Tome and Principe": ["Sao Tome and Principe", "São Tomé and Príncipe"],
  Senegal: ["Senegal"],
  Seychelles: ["Seychelles"],
  "Sierra Leone": ["Sierra Leone"],
  Somalia: ["Somalia"],
  "South Africa": ["South Africa"],
  "South Sudan": ["South Sudan"],
  Sudan: ["Sudan"],
  Tanzania: ["Tanzania, United Republic of", "United Republic of Tanzania", "Tanzania"],
  Togo: ["Togo"],
  Tunisia: ["Tunisia"],
  Uganda: ["Uganda"],
  Zambia: ["Zambia"],
  Zimbabwe: ["Zimbabwe"],
};

const ILO_TO_COUNTRY = new Map();
for (const [canonical, aliases] of Object.entries(COUNTRY_ALIASES)) {
  for (const alias of aliases) ILO_TO_COUNTRY.set(alias.toLowerCase(), canonical);
}

const INDICATORS = [
  { id: "POP_XWAP_SEX_AGE_NB", key: "youthPopulationThousands", needsYouthAge: true },
  { id: "EAP_2WAP_SEX_AGE_RT", key: "labourForceParticipationPct", needsYouthAge: true },
  { id: "EIP_NEET_SEX_RT", key: "neetPct", needsYouthAge: false },
  { id: "UNE_2EAP_SEX_AGE_RT", key: "youthUnemploymentPct", needsYouthAge: true },
  { id: "EMP_NIFL_SEX_RT", key: "informalEmploymentPct", needsYouthAge: false },
];

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function isYouthAgeBand(label) {
  if (!label) return false;
  // Prefer the standard youth/adults 15-24 band; avoid 5-year sub-bands duplicates.
  return /Age \(Youth, adults\):\s*15-24/i.test(label);
}

async function fetchIndicatorCsv(id) {
  const url = `https://rplumber.ilo.org/data/indicator?id=${id}&type=label&format=.csv`;
  console.log(`Fetching ${id}…`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ILO ${id} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // Strip UTF-8 BOM / leading junk
  let text = buf.toString("utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (text.startsWith("?")) text = text.slice(1);
  return text;
}

function pickLatest(rows) {
  const maxYear = new Date().getFullYear();
  /** @type {Map<string, { year: number, value: number, source: string }>} */
  const best = new Map();

  function score(obs) {
    // Prefer non-future years, then newest year.
    const futurePenalty = obs.year > maxYear ? 1000 : 0;
    return obs.year - futurePenalty;
  }

  for (const row of rows) {
    const prev = best.get(row.country);
    if (!prev || score(row) > score(prev)) {
      best.set(row.country, { year: row.year, value: row.value, source: row.source });
    }
  }
  return best;
}

function extractRows(csv, needsYouthAge) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.replace(/^\uFEFF/, ""));
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  const areaI = idx["ref_area.label"];
  const sexI = idx["sex.label"];
  const timeI = idx["time"];
  const valueI = idx["obs_value"];
  const classifI = idx["classif1.label"];
  const sourceI = idx["source.label"];

  if (areaI == null || sexI == null || timeI == null || valueI == null) {
    throw new Error(`Unexpected header: ${header.join(",")}`);
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols[sexI] !== "Total") continue;
    if (needsYouthAge) {
      if (!isYouthAgeBand(cols[classifI] ?? "")) continue;
    }
    const country = ILO_TO_COUNTRY.get((cols[areaI] ?? "").toLowerCase());
    if (!country) continue;
    const year = Number(cols[timeI]);
    const value = Number(cols[valueI]);
    if (!Number.isFinite(year) || !Number.isFinite(value)) continue;
    // Prefer not to use future modelled years beyond current+1 when older exists —
    // still keep all; pickLatest takes max year.
    rows.push({
      country,
      year,
      value,
      source: cols[sourceI] ?? "ILOSTAT",
    });
  }
  return rows;
}

const byCountry = {};
for (const name of Object.keys(COUNTRY_ALIASES)) {
  byCountry[name] = { country: name };
}

for (const ind of INDICATORS) {
  const csv = await fetchIndicatorCsv(ind.id);
  const rows = extractRows(csv, ind.needsYouthAge);
  const latest = pickLatest(rows);
  console.log(`  ${ind.key}: ${latest.size} African countries`);
  for (const [country, obs] of latest) {
    byCountry[country][ind.key] = Number(obs.value.toFixed(3));
    byCountry[country][`${ind.key}Year`] = obs.year;
    byCountry[country].source = obs.source;
  }
}

// Africa aggregate (All Countries): sum populations, mean of rates where present.
const countries = Object.values(byCountry).filter(
  (c) =>
    c.youthPopulationThousands != null ||
    c.neetPct != null ||
    c.youthUnemploymentPct != null,
);

function mean(values) {
  if (values.length === 0) return null;
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(3));
}

const africa = {
  country: "All Countries",
  youthPopulationThousands: Number(
    countries
      .map((c) => c.youthPopulationThousands ?? 0)
      .reduce((a, b) => a + b, 0)
      .toFixed(3),
  ),
  labourForceParticipationPct: mean(
    countries.map((c) => c.labourForceParticipationPct).filter((v) => v != null),
  ),
  neetPct: mean(countries.map((c) => c.neetPct).filter((v) => v != null)),
  youthUnemploymentPct: mean(
    countries.map((c) => c.youthUnemploymentPct).filter((v) => v != null),
  ),
  informalEmploymentPct: mean(
    countries.map((c) => c.informalEmploymentPct).filter((v) => v != null),
  ),
  source: "ILOSTAT (Africa aggregate from available country observations)",
};

const payload = {
  generatedAt: new Date().toISOString(),
  source: "ILOSTAT via rplumber.ilo.org",
  ageGroup: "15-24",
  africa,
  countries: byCountry,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(`\nWrote ${outPath}`);
console.log(`Countries with NEET: ${countries.filter((c) => c.neetPct != null).length}`);
console.log(`Nigeria:`, byCountry.Nigeria);
