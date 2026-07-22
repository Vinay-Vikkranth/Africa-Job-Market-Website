"use client";

import Link from "next/link";
import {
  BriefcaseBusiness,
  HardHat,
  UserX,
  Users,
} from "lucide-react";
import type { YouthEmploymentSnapshot } from "@/lib/youth-employment";
import { DataSourceButton } from "@/app/components/data-source-button";
import { METRIC_GLOSSARY } from "@/lib/data-sources";

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 py-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] leading-tight text-slate-500" title={hint}>
          {label}
        </p>
        <p className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function formatPct(value: number | null) {
  return value == null ? "—" : `${value}%`;
}

export function YouthEmploymentSnapshotCard({
  snapshot,
  country,
}: {
  snapshot: YouthEmploymentSnapshot;
  country: string;
}) {
  const hasNeet = snapshot.neetPct != null;
  const circumference = 2 * Math.PI * 42;
  const progress = hasNeet ? Math.max(0, Math.min(100, snapshot.neetPct!)) : 0;
  const dash = (progress / 100) * circumference;
  const skillMixHref =
    country === "All Countries" ? "/gaps" : `/gaps?country=${encodeURIComponent(country)}`;

  return (
    <article className="dashboard-card flex h-full flex-col p-5">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
            Youth Employment Snapshot
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {snapshot.countryLabel}, ages {snapshot.ageGroup.replace("-", "–")}
          </p>
        </div>
        <DataSourceButton sourceId="ilostat" label="View data source" />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 border-y border-slate-100 py-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="divide-y divide-slate-100">
          <Metric
            icon={Users}
            label="Youth Population"
            value={snapshot.youthPopulationLabel ?? "—"}
          />
          <Metric
            icon={BriefcaseBusiness}
            label="Labor Force Participation"
            value={formatPct(snapshot.labourForceParticipationPct)}
            hint={METRIC_GLOSSARY.lfpr.meaning}
          />
        </div>

        <div className="flex flex-col items-center px-1 py-2">
          <div className="relative h-[108px] w-[108px]">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="8"
              />
              {hasNeet && (
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference}`}
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span
                className="text-[10px] font-medium leading-tight text-slate-500"
                title={METRIC_GLOSSARY.neet.meaning}
              >
                Youth
                <br />
                NEET
              </span>
              <span className="text-2xl font-bold leading-none text-slate-900">
                {formatPct(snapshot.neetPct)}
              </span>
            </div>
          </div>
          <p className="mt-1 max-w-[9rem] text-center text-[10px] leading-snug text-slate-400">
            Not in employment, education, or training
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          <Metric
            icon={UserX}
            label="Youth Unemployment"
            value={formatPct(snapshot.youthUnemploymentPct)}
            hint={METRIC_GLOSSARY.unemployment.meaning}
          />
          <Metric
            icon={HardHat}
            label="Informal Employment"
            value={formatPct(snapshot.informalEmploymentPct)}
          />
        </div>
      </div>

      <div className="mt-4 flex-1">
        <h3 className="text-xs font-semibold text-slate-800">
          Top in-demand skills (from job postings)
        </h3>
        {snapshot.topDemandSkills.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">No skill demand data for this filter.</p>
        ) : (
          <ol className="mt-2 space-y-1.5">
            {snapshot.topDemandSkills.map((skill, i) => (
              <li key={skill} className="flex items-center gap-2 text-sm text-slate-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {i + 1}
                </span>
                <span className="truncate">{skill}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href={skillMixHref}
            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
          >
            View skill mix →
          </Link>
          <DataSourceButton sourceId="job-boards" label="Skills source" />
        </div>
        <p className="text-[10px] leading-snug text-slate-400">
          {snapshot.sourceNote}
          {snapshot.iloSeriesNote ? ` · ${snapshot.iloSeriesNote}` : ""}
          {" · "}bundle {snapshot.generatedAt.slice(0, 10)}
        </p>
      </div>
    </article>
  );
}
