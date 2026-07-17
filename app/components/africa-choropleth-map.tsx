"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { geoMercator, geoPath } from "d3-geo";
import { formatInt } from "@/app/components/charts/shared";
import { COUNTRIES, ISO3_TO_COUNTRY } from "@/lib/constants";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedCountry = searchParams.get("country") ?? "All Countries";

  const filterableCountries = useMemo(() => new Set<string>(COUNTRIES), []);

  function selectCountry(country: string) {
    if (!filterableCountries.has(country)) return;
    const params = new URLSearchParams(searchParams.toString());
    if (country === selectedCountry) {
      // Clicking the already-selected country clears the filter.
      params.delete("country");
    } else {
      params.set("country", country);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

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

  const trackedFeatures = geo;

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
        <g className="africa-tracked">
          {trackedFeatures
            .slice()
            // Render the selected country last so its highlight stroke isn't
            // painted over by neighbouring borders.
            .sort((a, b) => {
              const aSelected = (ISO3_TO_COUNTRY[a.id] ?? a.properties.name) === selectedCountry;
              const bSelected = (ISO3_TO_COUNTRY[b.id] ?? b.properties.name) === selectedCountry;
              return Number(aSelected) - Number(bSelected);
            })
            .map((feature) => {
              const countryName = ISO3_TO_COUNTRY[feature.id] ?? feature.properties.name;
              const jobs = jobMap.get(countryName) ?? 0;
              const intensity = jobs / maxJobs;
              const isHovered = hovered === countryName;
              const isSelected = selectedCountry === countryName;
              const hasData = jobs > 0;

              return (
                <path
                  key={feature.id}
                  d={pathGen(feature) ?? ""}
                  fill={
                    isSelected ? "#f59e0b" : hasData ? colorForIntensity(intensity) : "#f1f5f9"
                  }
                  stroke={
                    isSelected ? "#b45309" : isHovered ? "#1d4ed8" : hasData ? "#2563eb" : "#94a3b8"
                  }
                  strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0.75}
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
          <p className="mt-0.5 text-[10px] text-slate-300">
            {hovered === selectedCountry ? "Click to clear filter" : "Click to filter dashboard"}
          </p>
        </div>
      )}

      {selectedCountry !== "All Countries" && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span>
            Showing data for <span className="font-semibold">{selectedCountry}</span>
          </span>
          <button
            type="button"
            onClick={() => selectCountry(selectedCountry)}
            className="font-medium text-amber-700 underline hover:text-amber-900"
          >
            Clear
          </button>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center justify-center gap-2 text-[10px] text-slate-500">
          <span>Fewer jobs</span>
          <div className="h-2 w-28 rounded-full bg-gradient-to-r from-slate-300 via-blue-200 to-blue-600" />
          <span>More jobs</span>
        </div>
      </div>
    </div>
  );
}
