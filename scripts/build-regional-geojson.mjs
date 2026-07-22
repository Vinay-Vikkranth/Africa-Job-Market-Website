/**
 * Build per-country ADM1 GeoJSON + manifest from Natural Earth 10m.
 *
 * Source: Natural Earth Admin 1 (states/provinces) — public domain.
 * Run: node scripts/build-regional-geojson.mjs
 *
 * Expects tmp/ne_10m_admin_1.geojson (download once from natural-earth-vector).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const inputPath = path.join(root, "tmp", "ne_10m_admin_1.geojson");
const outDir = path.join(root, "public", "data", "regions");
const manifestPath = path.join(root, "lib", "data", "africa-adm1-manifest.json");

/** Natural Earth adm0_a3 → app display name (matches lib/constants.ts). */
const ADM0_TO_COUNTRY = {
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
  // Natural Earth uses SDS for South Sudan (not ISO SSD).
  SDS: "South Sudan",
  SDN: "Sudan",
  TZA: "Tanzania",
  TGO: "Togo",
  TUN: "Tunisia",
  UGA: "Uganda",
  ZMB: "Zambia",
  ZWE: "Zimbabwe",
};

/** Canonical ISO3 used in app / filenames (South Sudan → SSD). */
const COUNTRY_TO_ISO3 = {
  Algeria: "DZA",
  Angola: "AGO",
  Benin: "BEN",
  Botswana: "BWA",
  "Burkina Faso": "BFA",
  Burundi: "BDI",
  "Cabo Verde": "CPV",
  Cameroon: "CMR",
  "Central African Republic": "CAF",
  Chad: "TCD",
  Comoros: "COM",
  "Democratic Republic of the Congo": "COD",
  "Republic of the Congo": "COG",
  "Ivory Coast": "CIV",
  Djibouti: "DJI",
  Egypt: "EGY",
  "Equatorial Guinea": "GNQ",
  Eritrea: "ERI",
  Eswatini: "SWZ",
  Ethiopia: "ETH",
  Gabon: "GAB",
  Gambia: "GMB",
  Ghana: "GHA",
  Guinea: "GIN",
  "Guinea-Bissau": "GNB",
  Kenya: "KEN",
  Lesotho: "LSO",
  Liberia: "LBR",
  Libya: "LBY",
  Madagascar: "MDG",
  Malawi: "MWI",
  Mali: "MLI",
  Mauritania: "MRT",
  Mauritius: "MUS",
  Morocco: "MAR",
  Mozambique: "MOZ",
  Namibia: "NAM",
  Niger: "NER",
  Nigeria: "NGA",
  Rwanda: "RWA",
  "Sao Tome and Principe": "STP",
  Senegal: "SEN",
  Seychelles: "SYC",
  "Sierra Leone": "SLE",
  Somalia: "SOM",
  "South Africa": "ZAF",
  "South Sudan": "SSD",
  Sudan: "SDN",
  Tanzania: "TZA",
  Togo: "TGO",
  Tunisia: "TUN",
  Uganda: "UGA",
  Zambia: "ZMB",
  Zimbabwe: "ZWE",
};

const DECIMALS = 3; // ~110m precision — enough for choropleth UI

function roundCoord(n) {
  const f = 10 ** DECIMALS;
  return Math.round(n * f) / f;
}

function simplifyGeometry(geometry) {
  function walk(coords) {
    if (typeof coords[0] === "number") {
      return [roundCoord(coords[0]), roundCoord(coords[1])];
    }
    return coords.map(walk);
  }
  return {
    type: geometry.type,
    coordinates: walk(geometry.coordinates),
  };
}

function regionId(props) {
  return (
    props.iso_3166_2 ||
    props.adm1_code ||
    props.code_hasc ||
    `${props.adm0_a3}-${props.name}`
  );
}

function regionName(props) {
  return props.name_en || props.name || props.gn_name || "Unknown";
}

if (!fs.existsSync(inputPath)) {
  console.error(`Missing ${inputPath}`);
  console.error(
    "Download: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson",
  );
  process.exit(1);
}

console.log("Reading Natural Earth ADM1…");
const source = JSON.parse(fs.readFileSync(inputPath, "utf8"));

/** @type {Record<string, object[]>} */
const byCountry = {};

for (const feature of source.features) {
  const adm0 = feature.properties?.adm0_a3;
  const country = ADM0_TO_COUNTRY[adm0];
  if (!country) continue;

  const id = regionId(feature.properties);
  const name = regionName(feature.properties);
  byCountry[country] ??= [];
  byCountry[country].push({
    type: "Feature",
    id,
    properties: { id, name },
    geometry: simplifyGeometry(feature.geometry),
  });
}

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.dirname(manifestPath), { recursive: true });

// Remove old handmade Nigeria zones file if present.
const legacyNigeria = path.join(outDir, "nigeria-zones.geojson");
if (fs.existsSync(legacyNigeria)) fs.unlinkSync(legacyNigeria);

/** @type {Record<string, { iso3: string; geoJsonPath: string; regions: { id: string; name: string }[] }>} */
const manifest = {};

const countries = Object.keys(byCountry).sort();
for (const country of countries) {
  const iso3 = COUNTRY_TO_ISO3[country];
  if (!iso3) {
    console.warn(`Skip unmapped country: ${country}`);
    continue;
  }

  // Stable order by name; drop duplicate ids keeping first.
  const seen = new Set();
  const features = byCountry[country]
    .sort((a, b) => a.properties.name.localeCompare(b.properties.name))
    .filter((f) => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });

  const fileName = `${iso3.toLowerCase()}.geojson`;
  const collection = { type: "FeatureCollection", features };
  fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(collection));

  manifest[country] = {
    iso3,
    geoJsonPath: `/data/regions/${fileName}`,
    regions: features.map((f) => ({
      id: f.properties.id,
      name: f.properties.name,
    })),
  };

  console.log(`${country} (${iso3}): ${features.length} regions → ${fileName}`);
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`\nWrote manifest with ${Object.keys(manifest).length} countries → ${manifestPath}`);

const expected = Object.keys(COUNTRY_TO_ISO3);
const missing = expected.filter((c) => !manifest[c]);
if (missing.length) {
  console.warn("Missing countries (no ADM1 polygons):", missing.join(", "));
}
