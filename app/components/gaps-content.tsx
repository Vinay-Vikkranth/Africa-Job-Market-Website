"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardData } from "@/lib/dashboard-data";
import { GAP_COLORS } from "@/app/components/charts/shared";

function CoverageBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function GapsContent({ data }: { data: DashboardData }) {
  const gapChartData = [
    { name: "Technical", value: data.skillGap.technical },
    { name: "Digital", value: data.skillGap.digital },
    { name: "Soft Skills", value: data.skillGap.soft },
    { name: "Business", value: data.skillGap.business },
  ];

  const sg = data.syllabusGap;

  return (
    <div className="space-y-6">
      {/* Syllabus-based gap analysis — only shown when country has curriculum data */}
      {sg && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Curriculum Gap Analysis — {sg.country}
              </h2>
              <p className="text-xs text-slate-500">
                Source: {sg.source} &middot; {sg.programs.length} computing programmes
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {sg.programs.join(" · ")}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <article className="dashboard-card p-5 flex flex-col gap-2">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Curriculum Coverage</span>
              <span className="text-4xl font-bold text-emerald-600">{sg.coverageRate}%</span>
              <CoverageBar pct={sg.coverageRate} color="#10b981" />
              <p className="text-xs text-slate-500">of demanded skill mentions are covered by the curriculum</p>
            </article>

            <article className="dashboard-card p-5 flex flex-col gap-2">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Curriculum Gap</span>
              <span className="text-4xl font-bold text-rose-500">{sg.gapRate}%</span>
              <CoverageBar pct={sg.gapRate} color="#f43f5e" />
              <p className="text-xs text-slate-500">of demanded skill mentions have no curriculum coverage</p>
            </article>

            <article className="dashboard-card p-5 flex flex-col gap-2">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Skills Analysed</span>
              <span className="text-4xl font-bold text-slate-700">{sg.gapSkills.length + sg.coveredSkills.length}</span>
              <div className="flex gap-2 text-xs mt-1">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />{sg.coveredSkills.length} covered</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-rose-400" />{sg.gapSkills.length} gaps</span>
              </div>
              <p className="text-xs text-slate-500">top skills from {sg.country} job postings</p>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Gap skills — demanded but NOT in curriculum */}
            <article className="dashboard-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-400 inline-block" />
                Skills NOT in Curriculum — Top Gaps
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sg.gapSkills.slice(0, 10)}
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

            {/* Covered skills — demanded AND in curriculum */}
            <article className="dashboard-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                Skills Covered by Curriculum
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sg.coveredSkills.slice(0, 10)}
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

            {/* Detailed gap table */}
            <article className="dashboard-card p-5 lg:col-span-2">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Priority Skill Gaps — Curriculum vs Market</h3>
              <p className="mb-4 text-xs text-slate-500">
                The following skills are demanded by {sg.country} employers but are not explicitly covered in the {sg.source} computing programmes.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-2 text-left text-xs font-medium text-slate-500">Skill</th>
                      <th className="pb-2 text-right text-xs font-medium text-slate-500">Job Mentions</th>
                      <th className="pb-2 text-left pl-4 text-xs font-medium text-slate-500">In Curriculum?</th>
                      <th className="pb-2 text-left pl-4 text-xs font-medium text-slate-500">Demand Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sg.gapSkills.slice(0, 12).map((s) => (
                      <tr key={s.skill} className="border-b border-slate-50">
                        <td className="py-2 font-medium text-slate-800">{s.skill}</td>
                        <td className="py-2 text-right tabular-nums text-slate-600">{s.mentions}</td>
                        <td className="py-2 pl-4">
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-600 font-medium">Not covered</span>
                        </td>
                        <td className="py-2 pl-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-rose-400"
                                style={{ width: `${Math.round((s.mentions / sg.totalMentions) * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500">
                              {Math.round((s.mentions / sg.totalMentions) * 100)}%
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
      )}

      {/* Standard category distribution */}
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="dashboard-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Skill Category Distribution</h2>
          <div className="relative h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={gapChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {gapChartData.map((_, index) => (
                    <Cell key={index} fill={GAP_COLORS[index % GAP_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value ?? 0}%`, "Share of demand"]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-slate-900">{data.skillGap.overall}%</span>
              <span className="text-xs text-slate-500">Gap Index</span>
            </div>
          </div>
        </article>

        <article className="dashboard-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Demand vs Supply Gap</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.demandVsSupply}>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="demand" name="Demand" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="supply" name="Supply" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="dashboard-card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Category Breakdown</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {gapChartData.map((cat, i) => (
              <div key={cat.name} className="rounded-xl border border-slate-100 p-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: GAP_COLORS[i] }} />
                  <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">{cat.value}%</p>
                <p className="text-xs text-slate-500">of total skill demand</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
