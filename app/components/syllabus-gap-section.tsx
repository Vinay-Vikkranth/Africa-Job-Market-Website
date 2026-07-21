"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SyllabusGapResult } from "@/lib/analytics";
import { DataSourceButton } from "@/app/components/data-source-button";

function CoverageBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function SyllabusGapSection({ gap }: { gap: SyllabusGapResult }) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Curriculum gap analysis — {gap.country}
          </h2>
          <p className="text-xs text-slate-500">
            Source: {gap.source} · {gap.programs.length} computing programmes
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DataSourceButton sourceId="nuc-syllabus" label="NUC CCMAS 2022" />
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            {gap.programs.join(" · ")}
          </span>
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <article className="dashboard-card flex flex-col gap-2 p-5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Curriculum coverage
          </span>
          <span className="text-4xl font-bold text-emerald-600">{gap.coverageRate}%</span>
          <CoverageBar pct={gap.coverageRate} color="#10b981" />
          <p className="text-xs text-slate-500">
            of demanded skill mentions are covered by the curriculum
          </p>
        </article>

        <article className="dashboard-card flex flex-col gap-2 p-5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Curriculum gap
          </span>
          <span className="text-4xl font-bold text-rose-500">{gap.gapRate}%</span>
          <CoverageBar pct={gap.gapRate} color="#f43f5e" />
          <p className="text-xs text-slate-500">
            of demanded skill mentions have no curriculum coverage
          </p>
        </article>

        <article className="dashboard-card flex flex-col gap-2 p-5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Skills analysed
          </span>
          <span className="text-4xl font-bold text-slate-700">
            {gap.gapSkills.length + gap.coveredSkills.length}
          </span>
          <div className="mt-1 flex gap-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              {gap.coveredSkills.length} covered
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-rose-400" />
              {gap.gapSkills.length} gaps
            </span>
          </div>
          <p className="text-xs text-slate-500">top skills from {gap.country} job postings</p>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="dashboard-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span className="inline-block h-2 w-2 rounded-full bg-rose-400" />
            Skills not in curriculum — top gaps
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={gap.gapSkills.slice(0, 10)}
                layout="vertical"
                margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
              >
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="skill" tick={{ fontSize: 11 }} width={110} />
                <Tooltip
                  formatter={(v) => [`${v} job mentions`, "Demand"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Bar dataKey="mentions" name="Demand" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="dashboard-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Skills covered by curriculum
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={gap.coveredSkills.slice(0, 10)}
                layout="vertical"
                margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
              >
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="skill" tick={{ fontSize: 11 }} width={110} />
                <Tooltip
                  formatter={(v) => [`${v} job mentions`, "Demand"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Bar dataKey="mentions" name="Demand" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="dashboard-card p-5 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            Priority skill gaps — curriculum vs market
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            Skills demanded by {gap.country} employers but not explicitly covered in the{" "}
            {gap.source} computing programmes.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-2 text-left text-xs font-medium text-slate-500">Skill</th>
                  <th className="pb-2 text-right text-xs font-medium text-slate-500">Job mentions</th>
                  <th className="pb-2 pl-4 text-left text-xs font-medium text-slate-500">
                    In curriculum?
                  </th>
                  <th className="pb-2 pl-4 text-left text-xs font-medium text-slate-500">
                    Demand share
                  </th>
                </tr>
              </thead>
              <tbody>
                {gap.gapSkills.slice(0, 12).map((s) => (
                  <tr key={s.skill} className="border-b border-slate-50">
                    <td className="py-2 font-medium text-slate-800">{s.skill}</td>
                    <td className="py-2 text-right tabular-nums text-slate-600">{s.mentions}</td>
                    <td className="py-2 pl-4">
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">
                        Not covered
                      </span>
                    </td>
                    <td className="py-2 pl-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-rose-400"
                            style={{
                              width: `${Math.round((s.mentions / gap.totalMentions) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">
                          {Math.round((s.mentions / gap.totalMentions) * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
