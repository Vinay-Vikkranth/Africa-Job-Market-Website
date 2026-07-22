import { prisma } from "@/lib/prisma";
import africaAdm1Manifest from "@/lib/data/africa-adm1-manifest.json";
import { resolveCityToAdm1Robust } from "@/lib/city-to-adm1";

type ManifestEntry = {
  iso3: string;
  geoJsonPath: string;
  regions: { id: string; name: string }[];
};

const MANIFEST = africaAdm1Manifest as Record<string, ManifestEntry>;

export type RegionalJobMetric = {
  id: string;
  name: string;
  /** Real job count allocated to this ADM1 region. */
  jobs: number;
  /** Share of national postings (0–100), including unmapped in the denominator. */
  jobsShare: number;
};

export type RegionalJobBreakdown = {
  country: string;
  iso3: string;
  geoJsonPath: string;
  regions: RegionalJobMetric[];
  totalJobs: number;
  mappedJobs: number;
  unmappedJobs: number;
};

/**
 * Aggregate real job counts by ADM1 region for a country, using city → region mapping.
 */
export async function getRegionalJobBreakdown(
  country: string,
): Promise<RegionalJobBreakdown | null> {
  const entry = MANIFEST[country];
  if (!entry) return null;

  const [totalJobs, cityGroups] = await Promise.all([
    prisma.job.count({ where: { country } }),
    prisma.job.groupBy({
      by: ["city"],
      where: { country },
      _count: { city: true },
    }),
  ]);

  const counts = new Map<string, number>();
  let mappedJobs = 0;

  for (const row of cityGroups) {
    const regionId = resolveCityToAdm1Robust(country, row.city);
    if (!regionId) continue;
    const n = row._count.city;
    counts.set(regionId, (counts.get(regionId) ?? 0) + n);
    mappedJobs += n;
  }

  const unmappedJobs = Math.max(0, totalJobs - mappedJobs);
  const denominator = Math.max(totalJobs, 1);

  const regions: RegionalJobMetric[] = entry.regions
    .map((region) => {
      const jobs = counts.get(region.id) ?? 0;
      return {
        id: region.id,
        name: region.name,
        jobs,
        jobsShare: Number(((jobs / denominator) * 100).toFixed(1)),
      };
    })
    .sort((a, b) => b.jobs - a.jobs || a.name.localeCompare(b.name));

  return {
    country,
    iso3: entry.iso3,
    geoJsonPath: entry.geoJsonPath,
    regions,
    totalJobs,
    mappedJobs,
    unmappedJobs,
  };
}
