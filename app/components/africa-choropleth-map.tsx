"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { geoCentroid, geoMercator, geoPath } from "d3-geo";
import { ArrowLeft } from "lucide-react";
import { formatInt } from "@/app/components/charts/shared";
import { COUNTRIES, ISO3_TO_COUNTRY } from "@/lib/constants";
import {
  REGION_LABEL_LIMIT,
  colorForRegionalJobs,
  getCountryRegionsMeta,
  type RegionalMetric,
} from "@/lib/regional-map-data";
import type { RegionalJobBreakdown } from "@/lib/regional-jobs";

type GeoFeature = {
  type: "Feature";
  id: string;
  properties: { name: string; id?: string };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};

type CountryDatum = { country: string; jobs: number; flag?: string };

function colorForIntensity(intensity: number) {
  if (intensity <= 0) return "#cbd5e1";
  const t = Math.max(0, Math.min(1, intensity));
  const r = Math.round(191 - t * 120);
  const g = Math.round(219 - t * 80);
  const b = Math.round(254 - t * 40);
  return `rgb(${r},${g},${b})`;
}

function featureKey(feature: GeoFeature) {
  return String(feature.properties.id ?? feature.id ?? feature.properties.name);
}

const WIDTH = 560;
const HEIGHT = 520;
const PADDING = 8;

export function AfricaChoroplethMap({
  countries,
  regionalJobs = null,
}: {
  countries: CountryDatum[];
  regionalJobs?: RegionalJobBreakdown | null;
}) {
  const [geo, setGeo] = useState<GeoFeature[]>([]);
  const [regionGeo, setRegionGeo] = useState<GeoFeature[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<RegionalMetric | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedCountry = searchParams.get("country") ?? "All Countries";

  const filterableCountries = useMemo(() => new Set<string>(COUNTRIES), []);
  const regionsMeta =
    selectedCountry !== "All Countries" ? getCountryRegionsMeta(selectedCountry) : null;
  const drillDown = selectedCountry !== "All Countries";
  const regions: RegionalMetric[] = regionalJobs?.regions ?? [];
  const showRegionLabels = regions.length <= REGION_LABEL_LIMIT;

  function setCountryParam(country: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!country || country === "All Countries") {
      params.delete("country");
    } else {
      params.set("country", country);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function selectCountry(country: string) {
    if (!filterableCountries.has(country)) return;
    setCountryParam(country);
  }

  function goBackToAfrica() {
    setHoveredRegion(null);
    setRegionGeo([]);
    setCountryParam(null);
  }

  useEffect(() => {
    fetch("/data/africa-continent.geojson")
      .then((r) => r.json())
      .then((data) => setGeo(data.features ?? []))
      .catch(() => setGeo([]));
  }, []);

  const geoJsonPath = regionalJobs?.geoJsonPath ?? regionsMeta?.geoJsonPath;

  useEffect(() => {
    if (!geoJsonPath) {
      setRegionGeo([]);
      setRegionsLoading(false);
      return;
    }
    let cancelled = false;
    setRegionsLoading(true);
    setRegionGeo([]);
    fetch(geoJsonPath)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${geoJsonPath}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setRegionGeo(data.features ?? []);
      })
      .catch(() => {
        if (!cancelled) setRegionGeo([]);
      })
      .finally(() => {
        if (!cancelled) setRegionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [geoJsonPath]);

  const continentPath = useMemo(() => {
    if (geo.length === 0) return null;
    const collection = { type: "FeatureCollection" as const, features: geo };
    const projection = geoMercator().fitExtent(
      [
        [PADDING, PADDING],
        [WIDTH - PADDING, HEIGHT - PADDING],
      ],
      collection,
    );
    return geoPath(projection);
  }, [geo]);

  const regionLayout = useMemo(() => {
    if (regionGeo.length === 0) return null;
    const collection = { type: "FeatureCollection" as const, features: regionGeo };
    const projection = geoMercator().fitExtent(
      [
        [PADDING + 12, PADDING + 28],
        [WIDTH - PADDING - 12, HEIGHT - PADDING - 40],
      ],
      collection,
    );
    const path = geoPath(projection);
    const centroids = new Map<string, [number, number]>();
    for (const feature of regionGeo) {
      const key = featureKey(feature);
      const [lng, lat] = geoCentroid(feature);
      const point = projection([lng, lat]);
      if (point) centroids.set(key, [point[0], point[1]]);
    }
    return { path, centroids };
  }, [regionGeo]);

  const countryOutlinePath = useMemo(() => {
    if (!drillDown || regionGeo.length > 0 || regionsLoading) return null;
    const feature = geo.find(
      (f) => (ISO3_TO_COUNTRY[f.id] ?? f.properties.name) === selectedCountry,
    );
    if (!feature) return null;
    const collection = { type: "FeatureCollection" as const, features: [feature] };
    const projection = geoMercator().fitExtent(
      [
        [PADDING + 24, PADDING + 40],
        [WIDTH - PADDING - 24, HEIGHT - PADDING - 80],
      ],
      collection,
    );
    return { path: geoPath(projection), feature };
  }, [drillDown, geo, regionGeo.length, regionsLoading, selectedCountry]);

  const jobMap = useMemo(() => new Map(countries.map((c) => [c.country, c.jobs])), [countries]);
  const maxJobs = Math.max(...countries.map((c) => c.jobs), 1);
  const nationalJobs = regionalJobs?.totalJobs ?? jobMap.get(selectedCountry) ?? 0;
  const maxRegionJobs = Math.max(...regions.map((r) => r.jobs), 1);

  const regionById = useMemo(() => {
    const map = new Map<string, RegionalMetric>();
    for (const r of regions) {
      map.set(r.id, r);
      map.set(r.name, r);
    }
    return map;
  }, [regions]);

  if ((!continentPath || geo.length === 0) && !drillDown) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-500">
        Loading map…
      </div>
    );
  }

  if (drillDown) {
    const regionCount = regions.length || regionGeo.length;
    const regionsWithJobs = regions.filter((r) => r.jobs > 0);

    return (
      <div className="relative w-full">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Regional view
            </p>
            <h3 className="text-sm font-semibold text-slate-900">{selectedCountry}</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {formatInt(nationalJobs)} national job postings
              {regionCount > 0 ? ` · ${regionCount} admin regions` : ""}
              {regionalJobs
                ? ` · ${formatInt(regionalJobs.mappedJobs)} mapped to regions`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={goBackToAfrica}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Africa
          </button>
        </div>

        {regionalJobs && regionalJobs.unmappedJobs > 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-snug text-slate-600">
            {formatInt(regionalJobs.unmappedJobs)} postings could not be assigned to a state/region
            (missing city, remote, or unrecognized place name).
          </div>
        )}

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="mt-3 h-80 w-full rounded-lg bg-[#fff8f1]"
          role="img"
          aria-label={`Regional job map of ${selectedCountry}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {regionsLoading && (
            <text
              x={WIDTH / 2}
              y={HEIGHT / 2}
              textAnchor="middle"
              className="fill-slate-500 text-sm"
            >
              Loading regions…
            </text>
          )}

          {regionLayout &&
            regionGeo.map((feature) => {
              const key = featureKey(feature);
              const metric =
                regionById.get(key) ??
                regionById.get(feature.properties.name) ??
                regionById.get(String(feature.id));
              const jobs = metric?.jobs ?? 0;
              const intensity = jobs / maxRegionJobs;
              const isHovered = hoveredRegion?.id === metric?.id;
              const centroid = regionLayout.centroids.get(key) ?? [WIDTH / 2, HEIGHT / 2];
              const labelSize = regionCount > 20 ? "text-[8px]" : "text-[10px]";

              return (
                <g key={key}>
                  <path
                    d={regionLayout.path(feature) ?? ""}
                    fill={colorForRegionalJobs(intensity)}
                    stroke={isHovered ? "#7c2d12" : jobs > 0 ? "#9a3412" : "#cbd5e1"}
                    strokeWidth={isHovered ? 1.75 : 0.7}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => metric && setHoveredRegion(metric)}
                    onMouseLeave={() => setHoveredRegion(null)}
                  />
                  {showRegionLabels && metric && jobs > 0 && (
                    <>
                      <text
                        x={centroid[0]}
                        y={centroid[1] - 4}
                        textAnchor="middle"
                        className={`pointer-events-none fill-slate-900 font-semibold ${labelSize}`}
                      >
                        {metric.name}
                      </text>
                      <text
                        x={centroid[0]}
                        y={centroid[1] + 9}
                        textAnchor="middle"
                        className={`pointer-events-none fill-slate-800 font-bold ${labelSize}`}
                      >
                        {formatInt(jobs)}
                      </text>
                    </>
                  )}
                </g>
              );
            })}

          {!regionLayout && !regionsLoading && countryOutlinePath && (
            <path
              d={countryOutlinePath.path(countryOutlinePath.feature) ?? ""}
              fill="#fed7aa"
              stroke="#c2410c"
              strokeWidth={1.5}
            />
          )}
        </svg>

        {hoveredRegion && (
          <div className="pointer-events-none absolute left-1/2 top-28 z-10 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-center text-xs text-white shadow-lg">
            <p className="font-semibold">{hoveredRegion.name}</p>
            <p>{formatInt(hoveredRegion.jobs)} job postings</p>
            <p className="text-[10px] text-slate-300">{hoveredRegion.jobsShare}% of national total</p>
          </div>
        )}

        {!showRegionLabels && regionCount > 0 && (
          <p className="mt-2 text-[10px] text-slate-500">
            Hover a region for details — labels hidden when there are many subdivisions.
          </p>
        )}

        <div className="mt-3 max-h-48 space-y-1.5 overflow-y-auto pr-1">
          {(regionsWithJobs.length > 0 ? regionsWithJobs : regions).map((region) => (
            <div
              key={region.id}
              className={`flex cursor-default items-center justify-between rounded-lg px-3 py-2 text-xs text-slate-700 transition ${
                hoveredRegion?.id === region.id ? "bg-orange-50" : "bg-slate-50"
              }`}
              onMouseEnter={() => setHoveredRegion(region)}
              onMouseLeave={() => setHoveredRegion(null)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: colorForRegionalJobs(region.jobs / maxRegionJobs),
                  }}
                />
                <span className="truncate">{region.name}</span>
              </span>
              <span className="ml-2 shrink-0 font-semibold text-slate-900">
                {formatInt(region.jobs)}
              </span>
            </div>
          ))}
          {regions.length === 0 && !regionsLoading && (
            <p className="text-xs text-slate-500">
              No regional boundaries are available for {selectedCountry} yet.
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[10px] text-slate-500">
          <span>Fewer jobs</span>
          <div className="h-2 w-28 rounded-full bg-gradient-to-r from-slate-100 via-amber-200 to-orange-600" />
          <span>More jobs</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-80 w-full rounded-lg bg-sky-50/80"
        role="img"
        aria-label="Job postings by country map of Africa"
        preserveAspectRatio="xMidYMid meet"
      >
        <g className="africa-tracked">
          {geo.map((feature) => {
            const countryName = ISO3_TO_COUNTRY[feature.id] ?? feature.properties.name;
            const jobs = jobMap.get(countryName) ?? 0;
            const intensity = jobs / maxJobs;
            const isHovered = hovered === countryName;
            const hasData = jobs > 0;

            return (
              <path
                key={feature.id}
                d={continentPath?.(feature) ?? ""}
                fill={hasData ? colorForIntensity(intensity) : "#f1f5f9"}
                stroke={isHovered ? "#1d4ed8" : hasData ? "#2563eb" : "#94a3b8"}
                strokeWidth={isHovered ? 1.5 : 0.75}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHovered(countryName)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => selectCountry(countryName)}
              />
            );
          })}
        </g>
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-center text-xs text-white shadow-lg">
          <p className="font-semibold">{hovered}</p>
          <p>{formatInt(jobMap.get(hovered) ?? 0)} job postings</p>
          <p className="mt-0.5 text-[10px] text-slate-300">Click to open regional view</p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center justify-center gap-2 text-[10px] text-slate-500">
          <span>Fewer jobs</span>
          <div className="h-2 w-28 rounded-full bg-linear-to-r from-slate-300 via-blue-200 to-blue-600" />
          <span>More jobs</span>
        </div>
      </div>
    </div>
  );
}
