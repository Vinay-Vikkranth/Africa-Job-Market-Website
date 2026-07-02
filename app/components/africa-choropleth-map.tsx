"use client";

import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { formatInt } from "@/app/components/charts/shared";

const TRACKED_ISO = new Set(["KEN", "GHA", "NGA", "RWA", "ZAF", "TZA"]);

const ISO_TO_COUNTRY: Record<string, string> = {
  KEN: "Kenya",
  GHA: "Ghana",
  NGA: "Nigeria",
  RWA: "Rwanda",
  ZAF: "South Africa",
  TZA: "Tanzania",
};

type GeoFeature = {
  type: "Feature";
  id: string;
  properties: { name: string };
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

export function AfricaChoroplethMap({ countries }: { countries: CountryDatum[] }) {
  const [geo, setGeo] = useState<GeoFeature[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);

  const width = 560;
  const height = 520;
  const padding = 8;

  useEffect(() => {
    fetch("/data/africa-continent.geojson")
      .then((r) => r.json())
      .then((data) => setGeo(data.features ?? []))
      .catch(() => setGeo([]));
  }, []);

  const pathGen = useMemo(() => {
    if (geo.length === 0) return null;
    const collection = { type: "FeatureCollection" as const, features: geo };
    const projection = geoMercator().fitExtent(
      [
        [padding, padding],
        [width - padding, height - padding],
      ],
      collection,
    );
    return geoPath(projection);
  }, [geo, height, padding, width]);

  const jobMap = useMemo(() => new Map(countries.map((c) => [c.country, c.jobs])), [countries]);
  const maxJobs = Math.max(...countries.map((c) => c.jobs), 1);

  const backgroundFeatures = useMemo(
    () => geo.filter((f) => !TRACKED_ISO.has(f.id)),
    [geo],
  );
  const trackedFeatures = useMemo(() => geo.filter((f) => TRACKED_ISO.has(f.id)), [geo]);

  if (!pathGen || geo.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-500">
        Loading map…
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-80 w-full rounded-lg bg-sky-50/80"
        role="img"
        aria-label="Job postings by country map of Africa"
        preserveAspectRatio="xMidYMid meet"
      >
        <g className="africa-base">
          {backgroundFeatures.map((feature) => (
            <path
              key={feature.id}
              d={pathGen(feature) ?? ""}
              fill="#e2e8f0"
              stroke="#cbd5e1"
              strokeWidth={0.4}
            />
          ))}
        </g>

        <g className="africa-tracked">
          {trackedFeatures.map((feature) => {
            const countryName = ISO_TO_COUNTRY[feature.id] ?? feature.properties.name;
            const jobs = jobMap.get(countryName) ?? 0;
            const intensity = jobs / maxJobs;
            const isHovered = hovered === countryName;
            const hasData = jobs > 0;

            return (
              <path
                key={feature.id}
                d={pathGen(feature) ?? ""}
                fill={hasData ? colorForIntensity(intensity) : "#f1f5f9"}
                stroke={isHovered ? "#1d4ed8" : hasData ? "#2563eb" : "#94a3b8"}
                strokeWidth={isHovered ? 1.5 : 0.75}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHovered(countryName)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </g>
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-center text-xs text-white shadow-lg">
          <p className="font-semibold">{hovered}</p>
          <p>{formatInt(jobMap.get(hovered) ?? 0)} job postings</p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center justify-center gap-2 text-[10px] text-slate-500">
          <span>Fewer jobs</span>
          <div className="h-2 w-28 rounded-full bg-gradient-to-r from-slate-300 via-blue-200 to-blue-600" />
          <span>More jobs</span>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
        {countries
          .slice()
          .sort((a, b) => b.jobs - a.jobs)
          .map((item) => (
            <li key={item.country} className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-2">
                <span>{item.flag}</span>
                {item.country}
              </span>
              <span className="font-semibold text-slate-800">{formatInt(item.jobs)}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}
