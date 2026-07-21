/**
 * Map free-text job cities to Natural Earth ADM1 region ids.
 *
 * Jobs only store `country` + `city`. This module resolves cities (and
 * neighborhoods / province aliases) onto the region ids in
 * `lib/data/africa-adm1-manifest.json`.
 */

import africaAdm1Manifest from "@/lib/data/africa-adm1-manifest.json";

type ManifestEntry = {
  iso3: string;
  geoJsonPath: string;
  regions: { id: string; name: string }[];
};

const MANIFEST = africaAdm1Manifest as Record<string, ManifestEntry>;

export function normalizePlace(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(
      /\b(state|province|region|county|governorate|district|area|city|municipality|metro|metropolitan|republic of|the)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

const UNALLOCATED = new Set([
  "",
  "unknown",
  "remote",
  "n a",
  "na",
  "none",
  "null",
  "worldwide",
  "global",
  "africa",
  "rest of kenya",
  "egypt virtual",
  "oconus ghana",
]);

/** Explicit city / neighborhood / alias → ADM1 id (prefer ISO codes). */
const CITY_ALIASES: Record<string, Record<string, string>> = {
  Nigeria: {
    lagos: "NG-LA",
    ikeja: "NG-LA",
    lekki: "NG-LA",
    ikoyi: "NG-LA",
    "victoria island": "NG-LA",
    magodo: "NG-LA",
    epe: "NG-LA",
    yaba: "NG-LA",
    surulere: "NG-LA",
    ajah: "NG-LA",
    abuja: "NG-FC",
    fct: "NG-FC",
    "federal capital territory": "NG-FC",
    "port harcourt": "NG-RI",
    "port harcourt and rivers": "NG-RI",
    rivers: "NG-RI",
    ibadan: "NG-OY",
    oyo: "NG-OY",
    kano: "NG-KN",
    delta: "NG-DE",
    asaba: "NG-DE",
    warri: "NG-DE",
    uyo: "NG-AK",
    "ikot ekpene": "NG-AK",
    abia: "NG-AB",
    umuahia: "NG-AB",
    enugu: "NG-EN",
    kaduna: "NG-KD",
    benin: "NG-ED",
    "benin city": "NG-ED",
    calabar: "NG-CR",
    jos: "NG-PL",
    ilorin: "NG-KW",
    abeokuta: "NG-OG",
    akure: "NG-ON",
    osogbo: "NG-OS",
    awka: "NG-AN",
    onitsha: "NG-AN",
    owerri: "NG-IM",
    maiduguri: "NG-BO",
    sokoto: "NG-SO",
    minna: "NG-NI",
    makurdi: "NG-BE",
    yenagoa: "NG-BY",
    lafia: "NG-NA",
    jalingo: "NG-TA",
    dutse: "NG-JI",
    katsina: "NG-KT",
    "birnin kebbi": "NG-KE",
    lokoja: "NG-KO",
    "ado ekiti": "NG-EK",
    ekiti: "NG-EK",
    gombe: "NG-GO",
    bauchi: "NG-BA",
    yola: "NG-AD",
    damaturu: "NG-YO",
    gusau: "NG-ZA",
    abakaliki: "NG-EB",
  },
  "South Africa": {
    "cape town": "ZA-WC",
    "cape town city centre": "ZA-WC",
    stellenbosch: "ZA-WC",
    paarl: "ZA-WC",
    "somerset west": "ZA-WC",
    franschhoek: "ZA-WC",
    wellington: "ZA-WC",
    "western cape": "ZA-WC",
    johannesburg: "ZA-GT",
    midrand: "ZA-GT",
    sandton: "ZA-GT",
    pretoria: "ZA-GT",
    centurion: "ZA-GT",
    randburg: "ZA-GT",
    "kempton park": "ZA-GT",
    gauteng: "ZA-GT",
    durban: "ZA-NL",
    "kwazulu natal": "ZA-NL",
    "kwazulu-natal": "ZA-NL",
    gqeberha: "ZA-EC",
    "port elizabeth": "ZA-EC",
    "eastern cape": "ZA-EC",
    bloemfontein: "ZA-FS",
    "free state": "ZA-FS",
    mpumalanga: "ZA-MP",
    limpopo: "ZA-LP",
    "north west": "ZA-NW",
    "northern cape": "ZA-NC",
  },
  Kenya: {
    nairobi: "KE-110",
    "nairobi area": "KE-110",
    "ke nairobi nairobi the address building": "KE-110",
    mombasa: "KE-300",
    "manda bay": "KE-300",
    kisumu: "KE-600",
    kakamega: "KE-800",
    sagana: "KE-200",
    rukanga: "KE-200",
    nakuru: "KE-700",
    eldoret: "KE-700",
    kisii: "KE-600",
    malindi: "KE-300",
    garissa: "KE-500",
    kitale: "KE-700",
    thika: "KE-200",
    nyeri: "KE-200",
    meru: "KE-400",
    machakos: "KE-400",
  },
  Ghana: {
    accra: "GH-AA",
    "greater accra": "GH-AA",
    "airport west": "GH-AA",
    berekuso: "GH-EP",
    kumasi: "GH-AH",
    ashanti: "GH-AH",
    tamale: "GH-NP",
    takoradi: "GH-WP",
    tarkwa: "GH-WP",
    prestea: "GH-WP",
    mampong: "GH-AH",
    "new eddubiase": "GH-AH",
  },
  Egypt: {
    cairo: "EG-C",
    "al qahirah al jadidah": "EG-C",
    "new cairo": "EG-C",
    giza: "EG-GZ",
    alexandria: "EG-ALX",
  },
  Ethiopia: {
    "addis ababa": "ET-AA",
    assosa: "ET-BE",
    "benishangul gumuz": "ET-BE",
    gambela: "ET-GA",
    sanja: "ET-AM",
    debark: "ET-AM",
    dabat: "ET-AM",
    samara: "ET-AF",
    "shire and adwa": "ET-TI",
    "afambo and teru": "ET-AF",
  },
  Mauritius: {
    ebene: "MU-PW",
    "port louis": "MU-PL",
    phoenix: "MU-VP",
    "saint pierre": "MU-MO",
    moka: "MU-MO",
    moga: "MU-MO",
    "quatre bornes": "MU-PW",
    curepipe: "MU-PW",
    "vacoas phoenix": "MU-VP",
  },
  "Ivory Coast": {
    abidjan: "CI-01",
    yamoussoukro: "CI-07",
  },
  Angola: { luanda: "AO-LUA" },
  Botswana: { gaborone: "BW-GA" },
  Cameroon: { douala: "CM-LT", yaounde: "CM-CE" },
  "Democratic Republic of the Congo": {
    kinshasa: "CD-KN",
    lubumbashi: "CD-KA",
    goma: "CD-NK",
    bunia: "CD-OR",
  },
  Senegal: { dakar: "SN-DK" },
  Rwanda: { kigali: "RW-01" },
  Tanzania: {
    "dar es salaam": "TZ-02",
    arusha: "TZ-01",
    dodoma: "TZ-03",
  },
  Uganda: { kampala: "UG-102", entebbe: "UG-113" },
  Zambia: { lusaka: "ZM-09", ndola: "ZM-08" },
  Zimbabwe: { harare: "ZW-HA", bulawayo: "ZW-BU" },
  Morocco: {
    rabat: "MA-07",
    casablanca: "MA-08",
    marrakech: "MA-11",
    marrakesh: "MA-11",
    tangier: "MA-01",
  },
  Tunisia: { tunis: "TN-11", sfax: "TN-61" },
  Libya: { tripoli: "LY-TN", "tripoli libya": "LY-TN", benghazi: "LY-BA" },
  Mozambique: { maputo: "MZ-L", "cidade de maputo": "MZ-L" },
  Namibia: { windhoek: "NA-KH" },
  Madagascar: { antananarivo: "MG-T" },
  Malawi: { lilongwe: "MW-LI", blantyre: "MW-BL" },
  Mali: { bamako: "ML-BKO" },
  Guinea: { conakry: "GN-C", kankan: "GN-K" },
  Gambia: { banjul: "GM-B" },
  "Burkina Faso": { ouagadougou: "BF-KAD" },
  Burundi: { bujumbura: "BI-BM", muramvya: "BI-MU" },
  Niger: { niamey: "NE-8" },
  Chad: { ndjamena: "TD-ND", "n djamena": "TD-ND" },
  Algeria: { algiers: "DZ-16", oran: "DZ-31" },
  Sudan: { khartoum: "SD-KH" },
  "South Sudan": { juba: "SS-EC" },
  Somalia: { mogadishu: "SO-BN" },
  Benin: { cotonou: "BJ-LI", "porto novo": "BJ-OU" },
  "Republic of the Congo": { brazzaville: "CG-BZV", "pointe noire": "CG-13" },
  Gabon: { libreville: "GA-1" },
  Togo: { lome: "TG-M" },
  "Sierra Leone": { freetown: "SL-W" },
  Liberia: { monrovia: "LR-MO" },
  Lesotho: { maseru: "LS-A" },
  Eswatini: { mbabane: "SZ-HH", nhlangano: "SZ-SH" },
};

type RegionIndex = {
  byId: Map<string, { id: string; name: string }>;
  byNormName: Map<string, string>; // normalized name → id
};

const indexCache = new Map<string, RegionIndex>();

function buildIndex(country: string): RegionIndex | null {
  const cached = indexCache.get(country);
  if (cached) return cached;
  const entry = MANIFEST[country];
  if (!entry) return null;

  const byId = new Map<string, { id: string; name: string }>();
  const byNormName = new Map<string, string>();

  for (const region of entry.regions) {
    byId.set(region.id, region);
    const norm = normalizePlace(region.name);
    if (norm) byNormName.set(norm, region.id);
    // Also index without trailing admin words already stripped by normalizePlace
  }

  // Resolve alias targets that used wrong ids by name fallback later.
  const index = { byId, byNormName };
  indexCache.set(country, index);
  return index;
}

function resolveAliasId(country: string, aliasTarget: string, index: RegionIndex): string | null {
  if (index.byId.has(aliasTarget)) return aliasTarget;

  // Some curated aliases may use approximate codes — try matching by name token.
  const targetNorm = normalizePlace(aliasTarget);
  if (index.byNormName.has(targetNorm)) return index.byNormName.get(targetNorm)!;

  return null;
}

/**
 * Resolve a job city string to an ADM1 region id for the given country.
 * Returns null when the city cannot be confidently allocated.
 */
export function resolveCityToAdm1(country: string, city: string): string | null {
  const index = buildIndex(country);
  if (!index) return null;

  const raw = city?.trim() ?? "";
  const norm = normalizePlace(raw);
  if (UNALLOCATED.has(norm)) return null;
  if (norm === normalizePlace(country)) return null;

  // Drop country name fragments if present in the city string.
  const withoutCountry = normalizePlace(
    raw.replace(new RegExp(country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), " "),
  );
  const candidates = [norm, withoutCountry].filter(Boolean);

  const aliases = CITY_ALIASES[country] ?? {};
  for (const key of candidates) {
    const alias = aliases[key];
    if (alias) {
      const resolved = resolveAliasId(country, alias, index);
      if (resolved) return resolved;
      // Alias may be a name not an id
      const byName = index.byNormName.get(normalizePlace(alias));
      if (byName) return byName;
    }
  }

  for (const key of candidates) {
    const exact = index.byNormName.get(key);
    if (exact) return exact;
  }

  // Prefix / containment match against region names (prefer longest region name).
  const regions = [...index.byNormName.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const key of candidates) {
    if (key.length < 3) continue;
    for (const [regionNorm, id] of regions) {
      if (regionNorm.length < 3) continue;
      if (key === regionNorm) return id;
      if (key.startsWith(regionNorm + " ") || regionNorm.startsWith(key + " ")) return id;
      if (key.includes(regionNorm) && regionNorm.length >= 4) return id;
      if (regionNorm.includes(key) && key.length >= 5) return id;
    }
  }

  return null;
}

/** Find region id by matching curated alias names that pointed at wrong ISO codes. */
export function resolveAdm1ByName(country: string, nameHint: string): string | null {
  const index = buildIndex(country);
  if (!index) return null;
  return index.byNormName.get(normalizePlace(nameHint)) ?? null;
}

/**
 * Fix known capital cities whose ISO codes differ across Natural Earth versions
 * by resolving through display names after alias lookup fails on id.
 */
export function resolveCityToAdm1Robust(country: string, city: string): string | null {
  const direct = resolveCityToAdm1(country, city);
  if (direct) return direct;

  // Name-based fallbacks for capitals when curated ids drift.
  const NAME_FALLBACKS: Record<string, Record<string, string>> = {
    "Ivory Coast": { abidjan: "Lagunes", yamoussoukro: "Lacs" },
    Ethiopia: {
      "addis ababa": "Addis Ababa",
      assosa: "Benishangul-Gumuz",
      gambela: "Gambela",
      gambēla: "Gambela",
    },
    Mauritius: {
      ebene: "Plaines Wilhems",
      "port louis": "Port Louis",
      phoenix: "Vacoas-Phoenix",
      "saint pierre": "Moka",
      moga: "Moka",
    },
    Cameroon: { douala: "Littoral", yaounde: "Centre" },
    Angola: { luanda: "Luanda" },
    Botswana: { gaborone: "Gaborone" },
    Senegal: { dakar: "Dakar" },
    Rwanda: { kigali: "Kigali" },
    Tanzania: {
      "dar es salaam": "Dar es Salaam",
      arusha: "Arusha",
      dodoma: "Dodoma",
    },
    Uganda: { kampala: "Kampala", entebbe: "Wakiso" },
    Zambia: { lusaka: "Lusaka", ndola: "Copperbelt" },
    Zimbabwe: { harare: "Harare", bulawayo: "Bulawayo" },
    Morocco: {
      rabat: "Rabat-Salé-Zemmour-Zaër",
      casablanca: "Grand Casablanca",
      marrakech: "Marrakesh-Tensift-El Haouz",
      marrakesh: "Marrakesh-Tensift-El Haouz",
      tangier: "Tangier-Tetouan",
    },
    Tunisia: { tunis: "Tunis", sfax: "Sfax" },
    Libya: { tripoli: "Tripoli District", benghazi: "Benghazi" },
    Mozambique: { maputo: "Maputo", "cidade de maputo": "Maputo" },
    Namibia: { windhoek: "Khomas" },
    Madagascar: { antananarivo: "Antananarivo" },
    Malawi: { lilongwe: "Lilongwe", blantyre: "Blantyre" },
    Mali: { bamako: "Bamako" },
    Guinea: { conakry: "Conakry", kankan: "Kankan" },
    "Democratic Republic of the Congo": {
      kinshasa: "Kinshasa",
      lubumbashi: "Katanga",
      goma: "North Kivu",
      bunia: "Orientale",
    },
    "Burkina Faso": { ouagadougou: "Kadiogo" },
    Burundi: { bujumbura: "Bujumbura Mairie", muramvya: "Muramvya" },
    Niger: { niamey: "Niamey" },
    Chad: { ndjamena: "Hadjer-Lamis" },
    Algeria: { algiers: "Algiers", oran: "Oran" },
    Sudan: { khartoum: "Khartoum" },
    Benin: { cotonou: "Littoral", "porto novo": "Ouémé" },
    Gabon: { libreville: "Estuaire" },
    Togo: { lome: "Maritime" },
    "Sierra Leone": { freetown: "Western" },
    Liberia: { monrovia: "Montserrado" },
    Lesotho: { maseru: "Maseru" },
    Eswatini: { mbabane: "Hhohho", nhlangano: "Shiselweni" },
    Gambia: { banjul: "Banjul" },
  };

  const norm = normalizePlace(city);
  const hint = NAME_FALLBACKS[country]?.[norm];
  if (hint) return resolveAdm1ByName(country, hint);
  return null;
}
