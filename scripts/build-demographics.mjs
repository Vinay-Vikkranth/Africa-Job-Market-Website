/**
 * Build Africa demographics dataset from World Bank + ILOSTAT.
 *
 * Run: node scripts/build-demographics.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "lib", "data", "africa-demographics.json");

const ISO3_TO_COUNTRY = {
  DZA: "Algeria",
  AGO: "Angola",
  BEN: "Benin",
  BWA: "Botswana",
  BFA: "Burkina Faso",
  BDI: "Burundi",
  CPV: "Cabo Verde",
  CMR: "Cameroon",
  CAF: "Central African Republic",
  TCD: "Chad",
  COM: "Comoros",
  COD: "Democratic Republic of the Congo",
  COG: "Republic of the Congo",
  CIV: "Ivory Coast",
  DJI: "Djibouti",
  EGY: "Egypt",
  GNQ: "Equatorial Guinea",
  ERI: "Eritrea",
  SWZ: "Eswatini",
  ETH: "Ethiopia",
  GAB: "Gabon",
  GMB: "Gambia",
  GHA: "Ghana",
  GIN: "Guinea",
  GNB: "Guinea-Bissau",
  KEN: "Kenya",
  LSO: "Lesotho",
  LBR: "Liberia",
  LBY: "Libya",
  MDG: "Madagascar",
  MWI: "Malawi",
  MLI: "Mali",
  MRT: "Mauritania",
  MUS: "Mauritius",
  MAR: "Morocco",
  MOZ: "Mozambique",
  NAM: "Namibia",
  NER: "Niger",
  NGA: "Nigeria",
  RWA: "Rwanda",
  STP: "Sao Tome and Principe",
  SEN: "Senegal",
  SYC: "Seychelles",
  SLE: "Sierra Leone",
  SOM: "Somalia",
  ZAF: "South Africa",
  SSD: "South Sudan",
  SDN: "Sudan",
  TZA: "Tanzania",
  TGO: "Togo",
  TUN: "Tunisia",
  UGA: "Uganda",
  ZMB: "Zambia",
  ZWE: "Zimbabwe",
};

const ILO_NAME_TO_COUNTRY = new Map(
  Object.entries({
    Algeria: "Algeria",
    Angola: "Angola",
    Benin: "Benin",
    Botswana: "Botswana",
    "Burkina Faso": "Burkina Faso",
    Burundi: "Burundi",
    "Cabo Verde": "Cabo Verde",
    "Cape Verde": "Cabo Verde",
    Cameroon: "Cameroon",
    "Central African Republic": "Central African Republic",
    Chad: "Chad",
    Comoros: "Comoros",
    "Congo, Democratic Republic of the": "Democratic Republic of the Congo",
    "Democratic Republic of the Congo": "Democratic Republic of the Congo",
    Congo: "Republic of the Congo",
    "Côte d'Ivoire": "Ivory Coast",
    "Cote d'Ivoire": "Ivory Coast",
    Djibouti: "Djibouti",
    Egypt: "Egypt",
    "Equatorial Guinea": "Equatorial Guinea",
    Eritrea: "Eritrea",
    Eswatini: "Eswatini",
    Ethiopia: "Ethiopia",
    Gabon: "Gabon",
    Gambia: "Gambia",
    Ghana: "Ghana",
    Guinea: "Guinea",
    "Guinea-Bissau": "Guinea-Bissau",
    Kenya: "Kenya",
    Lesotho: "Lesotho",
    Liberia: "Liberia",
    Libya: "Libya",
    Madagascar: "Madagascar",
    Malawi: "Malawi",
    Mali: "Mali",
    Mauritania: "Mauritania",
    Mauritius: "Mauritius",
    Morocco: "Morocco",
    Mozambique: "Mozambique",
    Namibia: "Namibia",
    Niger: "Niger",
    Nigeria: "Nigeria",
    Rwanda: "Rwanda",
    "Sao Tome and Principe": "Sao Tome and Principe",
    Senegal: "Senegal",
    Seychelles: "Seychelles",
    "Sierra Leone": "Sierra Leone",
    Somalia: "Somalia",
    "South Africa": "South Africa",
    "South Sudan": "South Sudan",
    Sudan: "Sudan",
    "Tanzania, United Republic of": "Tanzania",
    Tanzania: "Tanzania",
    Togo: "Togo",
    Tunisia: "Tunisia",
    Uganda: "Uganda",
    Zambia: "Zambia",
    Zimbabwe: "Zimbabwe",
  }).map(([k, v]) => [k.toLowerCase(), v]),
);

const WB_INDICATORS = [
  { id: "SP.POP.TOTL", key: "populationTotal", mrv: 1 },
  { id: "SP.POP.TOTL.FE.IN", key: "populationFemale", mrv: 1 },
  { id: "SP.POP.TOTL.MA.IN", key: "populationMale", mrv: 1 },
  { id: "SP.URB.TOTL.IN.ZS", key: "urbanPct", mrv: 1 },
  { id: "SP.POP.0014.TO.ZS", key: "age0to14Pct", mrv: 1 },
  { id: "SP.POP.1564.TO.ZS", key: "age15to64Pct", mrv: 1 },
  { id: "SP.POP.65UP.TO.ZS", key: "age65PlusPct", mrv: 1 },
  { id: "SP.POP.GROW", key: "populationGrowthPct", mrv: 1 },
  { id: "SE.ADT.LITR.ZS", key: "literacyPct", mrv: 20 },
  { id: "SE.ADT.LITR.FE.ZS", key: "literacyFemalePct", mrv: 20 },
  { id: "SE.ADT.LITR.MA.ZS", key: "literacyMalePct", mrv: 20 },
  { id: "SL.TLF.CACT.FE.ZS", key: "lfprFemalePct", mrv: 1 },
  { id: "SL.TLF.CACT.MA.ZS", key: "lfprMalePct", mrv: 1 },
  { id: "SL.UEM.TOTL.FE.ZS", key: "unemploymentFemalePct", mrv: 1 },
  { id: "SL.UEM.TOTL.MA.ZS", key: "unemploymentMalePct", mrv: 1 },
  { id: "SE.SEC.ENRR", key: "secondaryEnrollmentPct", mrv: 20 },
  { id: "SE.TER.ENRR", key: "tertiaryEnrollmentPct", mrv: 20 },
  { id: "SE.PRM.NENR", key: "primaryEnrollmentPct", mrv: 20 },
];

const byCountry = Object.fromEntries(
  Object.values(ISO3_TO_COUNTRY).map((name) => [name, { country: name }]),
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "SkillsObservatory/1.0 (local research build)" },
      });
      if (res.status === 429 || res.status === 403 || res.status >= 500) {
        await sleep(1000 * (i + 1));
        continue;
      }
      if (!res.ok) throw new Error(`${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === attempts - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
  return null;
}

async function fetchWorldBankIndicator(indicatorId, { mrv = 1 } = {}) {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${indicatorId}?format=json&mrv=${mrv}&per_page=20000`;
  const json = await fetchJson(url);
  const rows = Array.isArray(json) ? json[1] : null;
  /** @type {Map<string, { value: number, year: number }>} */
  const values = new Map();
  if (!rows) return values;

  for (const row of rows) {
    if (row.value == null) continue;
    const iso3 = (row.countryiso3code || "").toUpperCase();
    const country = ISO3_TO_COUNTRY[iso3];
    if (!country) continue;
    const year = Number(row.date);
    const value = Number(row.value);
    const prev = values.get(country);
    if (!prev || year > prev.year) {
      values.set(country, { value, year });
    }
  }
  return values;
}

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
      } else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

async function fetchIloNeetBySex() {
  const url =
    "https://rplumber.ilo.org/data/indicator?id=EIP_NEET_SEX_RT&type=label&format=.csv";
  console.log("Fetching ILO NEET by sex…");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ILO NEET ${res.status}`);
  let text = Buffer.from(await res.arrayBuffer()).toString("utf8");
  if (text.startsWith("?") || text.charCodeAt(0) === 0xfeff) text = text.replace(/^\uFEFF|\?/, "");

  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]);
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const maxYear = new Date().getFullYear();
  /** @type {Map<string, Record<string, { value: number, year: number }>>} */
  const best = new Map();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const country = ILO_NAME_TO_COUNTRY.get((cols[idx["ref_area.label"]] ?? "").toLowerCase());
    if (!country) continue;
    const sex = cols[idx["sex.label"]];
    const year = Number(cols[idx["time"]]);
    const value = Number(cols[idx["obs_value"]]);
    if (!Number.isFinite(year) || !Number.isFinite(value) || year > maxYear) continue;
    const key = sex === "Female" ? "female" : sex === "Male" ? "male" : sex === "Total" ? "total" : null;
    if (!key) continue;
    const bucket = best.get(country) ?? {};
    if (!bucket[key] || year > bucket[key].year) {
      bucket[key] = { value, year };
      best.set(country, bucket);
    }
  }
  return best;
}

console.log("Building World Bank demographics…");
for (const ind of WB_INDICATORS) {
  process.stdout.write(`  ${ind.id} … `);
  try {
    const values = await fetchWorldBankIndicator(ind.id, { mrv: ind.mrv ?? 1 });
    for (const [country, obs] of values) {
      byCountry[country][ind.key] = Number(obs.value.toFixed(3));
      byCountry[country][`${ind.key}Year`] = obs.year;
    }
    console.log(`${values.size} countries`);
  } catch (err) {
    console.log(`FAILED ${err.message}`);
  }
  await sleep(200);
}

const neet = await fetchIloNeetBySex();
for (const [country, sexes] of neet) {
  if (sexes.female) {
    byCountry[country].neetFemalePct = Number(sexes.female.value.toFixed(3));
    byCountry[country].neetFemalePctYear = sexes.female.year;
  }
  if (sexes.male) {
    byCountry[country].neetMalePct = Number(sexes.male.value.toFixed(3));
    byCountry[country].neetMalePctYear = sexes.male.year;
  }
  if (sexes.total) {
    byCountry[country].neetPct = Number(sexes.total.value.toFixed(3));
    byCountry[country].neetPctYear = sexes.total.year;
  }
}

for (const row of Object.values(byCountry)) {
  if (row.urbanPct != null) row.ruralPct = Number((100 - row.urbanPct).toFixed(3));
  if (row.populationFemale != null && row.populationMale != null) {
    const tot = row.populationFemale + row.populationMale;
    row.populationFemaleSharePct = Number(((row.populationFemale / tot) * 100).toFixed(2));
    row.populationMaleSharePct = Number(((row.populationMale / tot) * 100).toFixed(2));
  }
}

const withPop = Object.values(byCountry).filter((c) => c.populationTotal != null).length;
const payload = {
  generatedAt: new Date().toISOString(),
  sources: [
    "World Bank Open Data Indicators API",
    "ILOSTAT EIP_NEET_SEX_RT (youth NEET by sex)",
  ],
  countries: byCountry,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(`\nWrote ${outPath}`);
console.log(`Countries with population: ${withPop}`);
console.log("Nigeria:", byCountry.Nigeria);
