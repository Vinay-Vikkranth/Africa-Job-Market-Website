"use client";

import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { StateEducationDatum } from "@/lib/dhs-nigeria";

type GeoFeature = {
  type: "Feature";
  properties: { shapeName: string };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};

const TIERS = [
  { min: 45, color: "#059669", label: "45%+" },
  { min: 35, color: "#65a30d", label: "35–45%" },
  { min: 25, color: "#eab308", label: "25–35%" },
  { min: 15, color: "#f97316", label: "15–25%" },
  { min: -Infinity, color: "#dc2626", label: "Below 15%" },
];

function colorForValue(value: number) {
  return TIERS.find((t) => value >= t.min)?.color ?? "#cbd5e1";
}

export function NigeriaEducationMap({ states }: { states: StateEducationDatum[] }) {
  const [geo, setGeo] = useState<GeoFeature[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);

  const width = 420;
  const height = 460;
  const padding = 8;

  useEffect(() => {
    fetch("/data/nigeria-states.geojson")
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

  const valueMap = useMemo(() => new Map(states.map((s) => [s.state, s.value])), [states]);

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
        className="h-72 w-full rounded-lg bg-slate-50"
        role="img"
        aria-label="Secondary or higher education attainment by Nigerian state"
        preserveAspectRatio="xMidYMid meet"
      >
        {geo.map((feature) => {
          const stateName = feature.properties.shapeName;
          const value = valueMap.get(stateName);
          const isHovered = hovered === stateName;

          return (
            <path
              key={stateName}
              d={pathGen(feature) ?? ""}
              fill={value !== undefined ? colorForValue(value) : "#e2e8f0"}
              stroke={isHovered ? "#0f172a" : "#ffffff"}
              strokeWidth={isHovered ? 1.5 : 0.5}
              opacity={isHovered ? 1 : 0.9}
              className="cursor-default transition-opacity duration-150"
              onMouseEnter={() => setHovered(stateName)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-center text-xs text-white shadow-lg">
          <p className="font-semibold">{hovered}</p>
          <p>
            {valueMap.get(hovered) !== undefined ? `${valueMap.get(hovered)}%` : "No data"} secondary+
            education
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
        {TIERS.map((t) => (
          <span key={t.label} className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}
