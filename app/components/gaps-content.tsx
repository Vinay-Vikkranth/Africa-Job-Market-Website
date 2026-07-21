"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { DashboardData } from "@/lib/dashboard-data";
import { GAP_COLORS } from "@/app/components/charts/shared";
import { DataSourceButton } from "@/app/components/data-source-button";

export function GapsContent({ data }: { data: DashboardData }) {
  const gapChartData = [
    { name: "Technical", value: data.skillGap.technical },
    { name: "Digital", value: data.skillGap.digital },
    { name: "Soft Skills", value: data.skillGap.soft },
    { name: "Business", value: data.skillGap.business },
  ];

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="dashboard-card p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Skill category mix</h2>
          <DataSourceButton sourceId="job-boards" />
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Share of categorized skill mentions in job postings. The centre number is the{" "}
          <strong className="font-medium text-slate-700">largest category’s share</strong> (demand
          concentration) — not a shortage of workers.
        </p>
        <div className="relative h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={gapChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {gapChartData.map((_, index) => (
                  <Cell key={index} fill={GAP_COLORS[index % GAP_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value ?? 0}%`, "Share of demand"]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-slate-900">{data.skillGap.overall}%</span>
            <span className="max-w-[6.5rem] text-center text-[10px] leading-tight text-slate-500">
              Top category share
            </span>
          </div>
        </div>
        <ul className="mt-3 flex flex-wrap justify-center gap-3 text-[11px] text-slate-600">
          {gapChartData.map((cat, i) => (
            <li key={cat.name} className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: GAP_COLORS[i % GAP_COLORS.length] }}
              />
              {cat.name}
            </li>
          ))}
        </ul>
      </article>

      <article className="dashboard-card p-5">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Recent vs older skill mentions</h2>
        <p className="mb-4 text-xs text-slate-500">
          Both series come from job ads — not from a labour-force survey.{" "}
          <strong className="font-medium text-slate-700">Recent</strong> = last 30 days;{" "}
          <strong className="font-medium text-slate-700">Older</strong> = postings before that.
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.demandVsSupply}>
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Bar dataKey="recent" name="Recent (30d)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="older" name="Older postings" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="dashboard-card p-5 lg:col-span-2">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Category breakdown</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {gapChartData.map((cat, i) => (
            <div key={cat.name} className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: GAP_COLORS[i] }} />
                <span className="text-sm font-medium text-slate-700">{cat.name}</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{cat.value}%</p>
              <p className="text-xs text-slate-500">of categorized skill demand</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
