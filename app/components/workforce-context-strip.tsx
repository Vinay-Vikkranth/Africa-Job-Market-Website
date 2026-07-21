"use client";

import Link from "next/link";
import {
  Briefcase,
  Building2,
  GraduationCap,
  Info,
  UserRound,
  Users,
} from "lucide-react";
import type { WorkforceContextSnapshot, WorkforceIndicator } from "@/lib/workforce-context";
import { DataSourceButton } from "@/app/components/data-source-button";

const TONE: Record<
  WorkforceIndicator["tone"],
  { bg: string; icon: string }
> = {
  teal: { bg: "bg-teal-50", icon: "bg-teal-500" },
  amber: { bg: "bg-amber-50", icon: "bg-amber-500" },
  rose: { bg: "bg-rose-50", icon: "bg-rose-500" },
  sky: { bg: "bg-sky-50", icon: "bg-sky-500" },
  violet: { bg: "bg-violet-50", icon: "bg-violet-500" },
  red: { bg: "bg-red-50", icon: "bg-red-500" },
};

const ICONS: Record<string, typeof Users> = {
  "working-age": Users,
  youth: Users,
  "female-lfpr": UserRound,
  urban: Building2,
  tertiary: GraduationCap,
  "youth-unemp": Briefcase,
};

function IndicatorCell({ item }: { item: WorkforceIndicator }) {
  const tone = TONE[item.tone];
  const Icon = ICONS[item.id] ?? Users;

  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-100 bg-white/80 p-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone.icon}`}
      >
        <Icon className="h-4 w-4 text-white" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] leading-snug text-slate-500">{item.label}</p>
        <p className="mt-0.5 text-lg font-bold tracking-tight text-slate-900">{item.valueLabel}</p>
        {item.compareLabel && (
          <p className="mt-0.5 text-[11px] text-slate-500">{item.compareLabel}</p>
        )}
      </div>
    </div>
  );
}

export function WorkforceContextStrip({
  context,
}: {
  context: WorkforceContextSnapshot;
}) {
  if (!context.hasData) return null;

  const sourcesHref = "/sources";

  return (
    <article className="dashboard-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
            Workforce Context ({context.countryLabel})
          </h2>
          <span
            className="inline-flex items-center gap-1 text-[11px] text-slate-500"
            title="These indicators frame job-demand charts: labour supply size, youth pressure, gender participation, urbanisation, education pipeline, and youth unemployment."
          >
            Why these numbers matter
            <Info className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DataSourceButton sourceId="world-bank" />
          <DataSourceButton sourceId="ilostat" label="Youth source" />
          <Link
            href={sourcesHref}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Data sources
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {context.indicators.map((item) => (
          <IndicatorCell key={item.id} item={item} />
        ))}
      </div>

      <p className="mt-3 text-[10px] text-slate-400">{context.sourceNote}</p>
    </article>
  );
}
