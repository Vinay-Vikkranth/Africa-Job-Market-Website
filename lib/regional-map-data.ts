/**
 * Regional / state-level map drill-down metadata.
 *
 * Shapes: Natural Earth Admin-1 under `/public/data/regions/{iso3}.geojson`
 * (built by `scripts/build-regional-geojson.mjs`).
 *
 * Job counts: real DB aggregates via `lib/regional-jobs.ts` (city → ADM1 mapping).
 */

import africaAdm1Manifest from "@/lib/data/africa-adm1-manifest.json";

export type RegionalMetric = {
  id: string;
  name: string;
  jobs: number;
  /** Share of national postings (0–100). */
  jobsShare: number;
};

export type CountryRegionsMeta = {
  country: string;
  iso3: string;
  geoJsonPath: string;
};

type ManifestEntry = {
  iso3: string;
  geoJsonPath: string;
  regions: { id: string; name: string }[];
};

const MANIFEST = africaAdm1Manifest as Record<string, ManifestEntry>;

export function getCountryRegionsMeta(country: string): CountryRegionsMeta | null {
  const entry = MANIFEST[country];
  if (!entry) return null;
  return {
    country,
    iso3: entry.iso3,
    geoJsonPath: entry.geoJsonPath,
  };
}

export function hasRegionalBoundaries(country: string) {
  return Boolean(MANIFEST[country]?.regions?.length);
}

/** Choropleth fill from regional job intensity (0–1). */
export function colorForRegionalJobs(intensity: number) {
  if (intensity <= 0) return "#f1f5f9";
  const t = Math.max(0, Math.min(1, intensity));
  // Warm scale: light amber → deep orange (readable on cream map bg).
  const r = Math.round(254 - t * 80);
  const g = Math.round(243 - t * 150);
  const b = Math.round(199 - t * 160);
  return `rgb(${r},${g},${b})`;
}

/** Map labels get crowded beyond this count — use hover + list instead. */
export const REGION_LABEL_LIMIT = 12;
