"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardData } from "@/lib/dashboard-data";
import { formatCurrency, formatInt, KpiCard, Sparkline } from "@/app/components/charts/shared";
import { DollarSign } from "lucide-react";

export function SalaryContent({ data }: { data: DashboardData }) {
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          title="Avg. Salary (USD)"
          value={data.kpis.avgSalaryUsd > 0 ? formatCurrency(data.kpis.avgSalaryUsd) : "N/A"}
          change={Math.abs(data.kpis.salaryGrowthPct)}
          changeLabel="vs previous 30 days"
          trend={data.kpis.salaryGrowthPct >= 0 ? "up" : "down"}
          icon={DollarSign}
          iconBg="bg-amber-500"
          sparkColor="#f59e0b"
          sparkData={data.trends.salary}
        />
        <article className="dashboard-card p-4">
          <p className="text-xs text-slate-500">Salary Disclosure Rate</p>
          <p className="text-2xl font-bold">{data.kpis.salaryCoveragePct}%</p>
          <p className="text-xs text-slate-400">of postings include salary data</p>
        </article>
        <article className="dashboard-card p-4">
          <p className="text-xs text-slate-500">Countries with Salary Data</p>
          <p className="text-2xl font-bold">{formatInt(data.salariesByCountry.length)}</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="dashboard-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Average Salary by Country</h2>
          {data.salariesByCountry.length === 0 ? (
            <p className="text-sm text-slate-500">No salary data available for this filter.</p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.salariesByCountry} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="country" width={100} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value ?? 0)), "Avg Salary"]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="avgSalary" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="dashboard-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Weekly Salary Trend</h2>
          <div className="h-24">
            <Sparkline data={data.trends.salary} color="#f59e0b" />
          </div>
          <div className="mt-6 space-y-3">
            {data.salariesByCountry.map((item) => (
              <div key={item.country} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-slate-700">
                  <span>{item.flag}</span>
                  {item.country}
                </span>
                <span className="font-semibold text-slate-900">{formatCurrency(item.avgSalary)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
