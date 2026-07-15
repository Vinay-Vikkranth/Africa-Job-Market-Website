"use client";

import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { formatInt } from "@/app/components/charts/shared";

// All 49 African countries from the GeoJSON
const ISO_TO_COUNTRY: Record<string, string> = {
  DZA: "Algeria",
  AGO: "Angola",
  BEN: "Benin",
  BWA: "Botswana",
  BFA: "Burkina Faso",
  BDI: "Burundi",
  CMR: "Cameroon",
  CAF: "Central African Republic",
  TCD: "Chad",
  COG: "Republic of Congo",
  COD: "Democratic Republic of Congo",
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
  MAR: "Morocco",
  MOZ: "Mozambique",
  NAM: "Namibia",
  NER: "Niger",
  NGA: "Nigeria",
  RWA: "Rwanda",
  SEN: "Senegal",
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

// Countries with actual data sources
const HAS_DATA = new Set(["Kenya", "Ghana", "Nigeria", "Rwanda", "South Africa", "Tanzania"]);

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

type MapProps = {
  countries: CountryDatum[];
  selectedCountry?: string;
  onCountryClick?: (country: string) => void;
};

function colorForIntensity(intensity: number) {
  if (intensity <= 0) return "#cbd5e1";
  const t = Math.max(0, Math.min(1, intensity));
  const r = Math.round(191 - t * 120);
  const g = Math.round(219 - t * 80);
  const b = Math.round(254 - t * 40);
  return `rgb(${r},${g},${b})`;
}

export function AfricaChoroplethMap({ countries, selectedCountry, onCountryClick }: MapProps) {
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
  }, [geo]);

  const jobMap = useMemo(() => new Map(countries.map((c) => [c.country, c.jobs])), [countries]);
  const maxJobs = Math.max(...countries.map((c) => c.jobs), 1);

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
        {geo.map((feature) => {
          const countryName = ISO_TO_COUNTRY[feature.id] ?? feature.properties.name;
          const jobs = jobMap.get(countryName) ?? 0;
          const intensity = jobs / maxJobs;
          const isHovered = hovered === countryName;
          const isSelected = selectedCountry === countryName;
          const hasData = HAS_DATA.has(countryName) || jobs > 0;

          let fill: string;
          if (isSelected) fill = "#1d4ed8";
          else if (jobs > 0) fill = colorForIntensity(intensity);
          else if (hasData) fill = "#dbeafe"; // tracked but 0 jobs right now
          else fill = "#e2e8f0"; // no source

          let stroke: string;
          if (isSelected) stroke = "#1e3a8a";
          else if (isHovered) stroke = "#3b82f6";
          else if (hasData) stroke = "#93c5fd";
          else stroke = "#cbd5e1";

          return (
            <path
              key={feature.id}
              d={pathGen(feature) ?? ""}
              fill={fill}
              stroke={stroke}
              strokeWidth={isSelected ? 2 : isHovered ? 1.2 : 0.5}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHovered(countryName)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onCountryClick?.(countryName)}
            />
          );
        })}
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-center text-xs text-white shadow-lg">
          <p className="font-semibold">{hovered}</p>
          {jobMap.get(hovered) !== undefined ? (
            <p>{formatInt(jobMap.get(hovered) ?? 0)} job postings</p>
          ) : (
            <p className="text-slate-400">No data yet</p>
          )}
          <p className="mt-0.5 text-slate-400">
            {selectedCountry === hovered ? "Click to clear filter" : "Click to filter"}
          </p>
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
          .map((item) => {
            const isActive = selectedCountry === item.country;
            return (
              <li
                key={item.country}
                onClick={() => onCountryClick?.(item.country)}
                className={`flex cursor-pointer items-center justify-between rounded-md px-2 py-1 text-xs transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{item.flag}</span>
                  {item.country}
                </span>
                <span className={`font-semibold ${isActive ? "text-white" : "text-slate-800"}`}>
                  {formatInt(item.jobs)}
                </span>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
