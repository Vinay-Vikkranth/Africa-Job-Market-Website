"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Briefcase,
  Building2,
  ChevronRight,
  DollarSign,
  LineChart,
  MapPin,
  Sparkles,
  Target,
} from "lucide-react";
import type { DashboardData } from "@/lib/dashboard-data";
import {
  DataSourceBadge,
  formatCurrency,
  formatInt,
  KpiCard,
} from "@/app/components/charts/shared";
import { AfricaChoroplethMap } from "@/app/components/africa-choropleth-map";

export function OverviewContent({ data, country }: { data: DashboardData; country: string }) {
  const [mapView, setMapView] = useState<"map" | "table">("map");

  return (
    <>
      <div className="mb-2">
        <DataSourceBadge sources={data.meta.dataSources} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Job Postings"
          value={formatInt(data.kpis.totalJobs)}
          change={data.kpis.growthPct}
          changeLabel="vs previous 30 days"
          trend={data.kpis.growthPct >= 0 ? "up" : "down"}
          icon={Briefcase}
          iconBg="bg-blue-500"
          sparkColor="#3b82f6"
          sparkData={data.trends.jobs}
          sparkLabel="jobs posted this week"
        />
        <KpiCard
          title="Unique Companies"
          value={formatInt(data.kpis.uniqueCompanies)}
          change={data.kpis.companyGrowthPct}
          changeLabel="vs previous 30 days"
          trend={data.kpis.companyGrowthPct >= 0 ? "up" : "down"}
          icon={Building2}
          iconBg="bg-emerald-500"
          sparkColor="#10b981"
          sparkData={data.trends.companies}
          sparkLabel="companies hiring this week"
        />
        <KpiCard
          title="In-Demand Skills"
          value={formatInt(data.kpis.inDemandSkills)}
          change={data.kpis.skillsGrowthPct}
          changeLabel="vs previous 30 days"
          trend={data.kpis.skillsGrowthPct >= 0 ? "up" : "down"}
          icon={Target}
          iconBg="bg-violet-500"
          sparkColor="#8b5cf6"
          sparkData={data.trends.skills}
          sparkLabel="distinct skills requested this week"
        />
        <KpiCard
          title="Avg. Salary (USD)"
          value={data.kpis.avgSalaryUsd > 0 ? formatCurrency(data.kpis.avgSalaryUsd) : "N/A"}
          change={Math.abs(data.kpis.salaryGrowthPct)}
          changeLabel={`${data.kpis.salaryCoveragePct}% postings include salary`}
          trend={data.kpis.salaryGrowthPct >= 0 ? "up" : "down"}
          icon={DollarSign}
          iconBg="bg-amber-500"
          sparkColor="#f59e0b"
          sparkData={data.trends.salary}
          sparkLabel="avg. salary of jobs posted this week"
          sparkFormat={formatCurrency}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-12">
        <article className="dashboard-card p-5 lg:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Job Postings by Country</h2>
            <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMapView("map")}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  mapView === "map" ? "bg-blue-600 text-white" : "text-slate-500"
                }`}
              >
                Map
              </button>
              <button
                type="button"
                onClick={() => setMapView("table")}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  mapView === "table" ? "bg-blue-600 text-white" : "text-slate-500"
                }`}
              >
                Table
              </button>
            </div>
          </div>
          {mapView === "map" ? (
            <AfricaChoroplethMap countries={data.jobsByCountry} />
          ) : (
            <div className="space-y-2">
              {data.jobsByCountry.map((item) => (
                <div key={item.country} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-700">
                    <span>{item.flag}</span>
                    {item.country}
                  </span>
                  <span className="font-semibold text-slate-900">{formatInt(item.jobs)}</span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="dashboard-card p-5 lg:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Top In-Demand Skills</h2>
            <span className="text-xs text-blue-600">{country}</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topSkills.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [`${value ?? 0}%`, "Demand"]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="demandPct" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <div className="lg:col-span-4">
          <article className="dashboard-card h-full p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Average Salary by Country</h2>
            <div className="space-y-3">
              {data.salariesByCountry.length === 0 ? (
                <p className="text-sm text-slate-500">No salary data in current filter. Sync more jobs or broaden country filter.</p>
              ) : (
                data.salariesByCountry.slice(0, 6).map((item) => {
                  const maxSalary = Math.max(...data.salariesByCountry.map((s) => s.avgSalary), 1);
                  const width = Math.max(8, (item.avgSalary / maxSalary) * 100);
                  return (
                    <div key={item.country}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="flex items-center gap-2 text-slate-600">
                          <span>{item.flag}</span>
                          {item.country}
                        </span>
                        <span className="font-semibold text-slate-800">{formatCurrency(item.avgSalary)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-12">
        <article className="dashboard-card p-5 lg:col-span-12">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Jobs by City (Top 10)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.jobsByCity} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="city" width={110} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [formatInt(Number(value ?? 0)), "Jobs"]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="jobs" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Recent Insights</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.insights.map((insight, i) => {
              const icons = [LineChart, BarChart3, Sparkles, DollarSign];
              const colors = ["bg-blue-50 text-blue-600", "bg-emerald-50 text-emerald-600", "bg-violet-50 text-violet-600", "bg-amber-50 text-amber-600"];
              const Icon = icons[i % icons.length];
              return (
                <article key={i} className="dashboard-card flex gap-3 p-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colors[i]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm leading-relaxed text-slate-700">{insight.text}</p>
                    <Link href={insight.href} className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                      View insight <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <article className="dashboard-card p-5 lg:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Alerts</h2>
            <Link href="/alerts" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {data.alerts.slice(0, 3).map((alert, i) => (
              <Link key={i} href={alert.href} className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3 transition hover:bg-slate-100">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <MapPin className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-sm text-slate-700">{alert.text}</p>
                  <p className="mt-1 text-xs text-slate-400">{alert.time}</p>
                </div>
              </Link>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-slate-400">
            Last refreshed: {new Date(data.meta.lastUpdatedAt).toLocaleString()}
          </p>
        </article>
      </section>
    </>
  );
}
