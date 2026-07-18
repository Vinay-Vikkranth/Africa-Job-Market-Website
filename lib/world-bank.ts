// Live workforce indicators from the World Bank Open Data API — no key required.
// https://api.worldbank.org/v2/country/{iso3}/indicator/{code}?format=json
//
// Every value here is fetched at request time (cached for a day, since these are
// annual-ish indicators). Nothing in this module is estimated or hand-entered —
// if the API has no value for a country/indicator, the field comes back null and
// the UI simply omits that tile rather than filling in a guess.

const REVALIDATE_SECONDS = 60 * 60 * 24; // 24h — indicators update at most yearly

// Sub-Saharan Africa is the only continent-scale aggregate World Bank actually
// publishes data for on these indicators (the "AFR"/whole-Africa aggregate is
// empty for all of them). North African countries are covered individually but
// have no matching regional aggregate to compare against.
const SSA_AGGREGATE = "SSF";

const INDICATORS = {
  totalPopulation: "SP.POP.TOTL",
  workingAgePct: "SP.POP.1564.TO.ZS",
  femaleLaborForcePct: "SL.TLF.CACT.FE.ZS",
  maleLaborForcePct: "SL.TLF.CACT.MA.ZS",
  urbanizationPct: "SP.URB.TOTL.IN.ZS",
  tertiaryAttainmentPct: "SE.TER.CUAT.BA.ZS",
  youthUnemploymentPct: "SL.UEM.1524.ZS",
} as const;

export const COUNTRY_ISO3: Record<string, string> = {
  Algeria: "DZA",
  Angola: "AGO",
  Benin: "BEN",
  Botswana: "BWA",
  "Burkina Faso": "BFA",
  Burundi: "BDI",
  Cameroon: "CMR",
  "Central African Republic": "CAF",
  Chad: "TCD",
  "Democratic Republic of Congo": "COD",
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
  Morocco: "MAR",
  Mozambique: "MOZ",
  Namibia: "NAM",
  Niger: "NER",
  Nigeria: "NGA",
  "Republic of Congo": "COG",
  Rwanda: "RWA",
  Senegal: "SEN",
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

type IndicatorPoint = { value: number; year: string } | null;

async function fetchLatestIndicator(iso3: string, code: string): Promise<IndicatorPoint> {
  try {
    const res = await fetch(
      `https://api.worldbank.org/v2/country/${iso3}/indicator/${code}?format=json&per_page=10&mrnev=1`,
      { next: { revalidate: REVALIDATE_SECONDS } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const rows = json?.[1];
    if (!Array.isArray(rows)) return null;
    const hit = rows.find((r) => r?.value !== null && r?.value !== undefined);
    if (!hit) return null;
    return { value: Number(hit.value), year: String(hit.date) };
  } catch {
    return null;
  }
}

export type WorkforceContext = {
  country: string;
  iso3: string;
  totalPopulation: IndicatorPoint;
  workingAgePct: IndicatorPoint;
  femaleLaborForcePct: IndicatorPoint;
  maleLaborForcePct: IndicatorPoint;
  urbanizationPct: IndicatorPoint;
  tertiaryAttainmentPct: IndicatorPoint;
  youthUnemploymentPct: IndicatorPoint;
  ssa: {
    workingAgePct: IndicatorPoint;
    urbanizationPct: IndicatorPoint;
    youthUnemploymentPct: IndicatorPoint;
  };
};

export function hasWorldBankData(country: string): boolean {
  return country in COUNTRY_ISO3;
}

// "All Countries" (or any country we don't have a job-board source for) falls
// back to the real Sub-Saharan Africa aggregate rather than a single country —
// still genuine World Bank data, just at the regional level, labeled as such.
function resolveTarget(country: string): { iso3: string; label: string; isAggregate: boolean } {
  const iso3 = COUNTRY_ISO3[country];
  if (iso3) return { iso3, label: country, isAggregate: false };
  return { iso3: SSA_AGGREGATE, label: "Sub-Saharan Africa", isAggregate: true };
}

export async function getWorkforceContext(country: string): Promise<WorkforceContext | null> {
  const { iso3, label, isAggregate } = resolveTarget(country);

  const [
    totalPopulation,
    workingAgePct,
    femaleLaborForcePct,
    maleLaborForcePct,
    urbanizationPct,
    tertiaryAttainmentPct,
    youthUnemploymentPct,
    ssaWorkingAgePct,
    ssaUrbanizationPct,
    ssaYouthUnemploymentPct,
  ] = await Promise.all([
    fetchLatestIndicator(iso3, INDICATORS.totalPopulation),
    fetchLatestIndicator(iso3, INDICATORS.workingAgePct),
    fetchLatestIndicator(iso3, INDICATORS.femaleLaborForcePct),
    fetchLatestIndicator(iso3, INDICATORS.maleLaborForcePct),
    fetchLatestIndicator(iso3, INDICATORS.urbanizationPct),
    fetchLatestIndicator(iso3, INDICATORS.tertiaryAttainmentPct),
    fetchLatestIndicator(iso3, INDICATORS.youthUnemploymentPct),
    // Skip the regional comparison when the target already IS the region.
    isAggregate ? Promise.resolve(null) : fetchLatestIndicator(SSA_AGGREGATE, INDICATORS.workingAgePct),
    isAggregate ? Promise.resolve(null) : fetchLatestIndicator(SSA_AGGREGATE, INDICATORS.urbanizationPct),
    isAggregate ? Promise.resolve(null) : fetchLatestIndicator(SSA_AGGREGATE, INDICATORS.youthUnemploymentPct),
  ]);

  const anyData =
    totalPopulation ||
    workingAgePct ||
    femaleLaborForcePct ||
    maleLaborForcePct ||
    urbanizationPct ||
    tertiaryAttainmentPct ||
    youthUnemploymentPct;
  if (!anyData) return null;

  return {
    country: label,
    iso3,
    totalPopulation,
    workingAgePct,
    femaleLaborForcePct,
    maleLaborForcePct,
    urbanizationPct,
    tertiaryAttainmentPct,
    youthUnemploymentPct,
    ssa: {
      workingAgePct: ssaWorkingAgePct,
      urbanizationPct: ssaUrbanizationPct,
      youthUnemploymentPct: ssaYouthUnemploymentPct,
    },
  };
}
