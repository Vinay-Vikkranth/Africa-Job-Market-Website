"use client";

import { AlertTriangle } from "lucide-react";
import { Sparkline } from "@/app/components/charts/shared";
import type { SyllabusGapResult } from "@/lib/analytics";
import type { CurriculumGapSnapshot } from "@/lib/curriculum-gap";
import { DataSourceButton } from "@/app/components/data-source-button";

const LEVEL_STYLES: Record<
  CurriculumGapSnapshot["level"],
  { badge: string; spark: string; icon: string }
> = {
  "Low Gap": {
    badge: "bg-emerald-50 text-emerald-700",
    spark: "#10b981",
    icon: "bg-emerald-500",
  },
  "Moderate Gap": {
    badge: "bg-amber-50 text-amber-700",
    spark: "#f59e0b",
    icon: "bg-amber-500",
  },
  "High Gap": {
    badge: "bg-rose-50 text-rose-600",
    spark: "#e11d48",
    icon: "bg-rose-500",
  },
  Unavailable: {
    badge: "bg-slate-100 text-slate-600",
    spark: "#94a3b8",
    icon: "bg-slate-400",
  },
};

export function CurriculumGapCard({
  gap,
  syllabusGap,
}: {
  gap: CurriculumGapSnapshot;
  syllabusGap?: SyllabusGapResult | null;
}) {
  const styles = LEVEL_STYLES[gap.level];
  const usingSyllabus = syllabusGap != null;

  return (
    <article className="dashboard-card flex h-full flex-col p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${styles.icon}`}>
            <AlertTriangle className="h-4 w-4 text-white" strokeWidth={2.25} />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800">
              {usingSyllabus ? "Curriculum gap" : "Curriculum pressure"}
            </h2>
            <span
              className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                usingSyllabus
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {usingSyllabus ? syllabusGap.source : "Proxy metric"}
            </span>
          </div>
        </div>
        <DataSourceButton
          sourceId={usingSyllabus ? "nuc-syllabus" : "curriculum-proxy"}
          label="Method"
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <p className="text-3xl font-bold tracking-tight text-slate-900">
          {usingSyllabus ? `${syllabusGap.gapRate}%` : gap.gapPct == null ? "—" : `${gap.gapPct}%`}
        </p>
        {!usingSyllabus && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles.badge}`}>
            {gap.level === "Unavailable" ? "Unavailable" : gap.level.replace(" Gap", "")}
          </span>
        )}
      </div>

      <p className="mt-2 text-xs leading-relaxed text-slate-600">
        {usingSyllabus
          ? `${syllabusGap.coverageRate}% of top skill mentions in job postings match ${syllabusGap.source} computing programmes.`
          : gap.methodNote}
      </p>
      {!usingSyllabus && gap.frameworksHint && (
        <p className="mt-1 text-[10px] leading-snug text-slate-400">{gap.frameworksHint}</p>
      )}

      <div className="mt-3 flex-1">
        {usingSyllabus ? (
          <p className="text-[11px] text-slate-500">
            {syllabusGap.programs.length} programmes · {syllabusGap.gapSkills.length} priority
            gaps identified. See full breakdown on{" "}
            <a href="/gaps" className="font-medium text-blue-600 hover:underline">
              Skill Mix
            </a>
            .
          </p>
        ) : gap.sparkData.length > 0 ? (
          <Sparkline
            data={gap.sparkData}
            color={styles.spark}
            label="curriculum pressure"
            formatValue={(v) => `${v}%`}
          />
        ) : (
          <p className="text-[11px] text-slate-400">
            {gap.gapPct == null
              ? "Needs World Bank education indicators for this selection."
              : "Weekly trend unavailable for this filter."}
          </p>
        )}
      </div>

      {!usingSyllabus && (
        <p className="mt-2 text-[10px] leading-snug text-slate-400">
          Hard-skill demand {gap.hardSkillDemandPct}%
          {gap.educationReadinessPct != null
            ? ` · education readiness ${gap.educationReadinessPct}%`
            : " · education readiness unavailable"}
        </p>
      )}
    </article>
  );
}
