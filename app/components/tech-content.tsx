"use client";

import { Cloud, TrendingDown, TrendingUp } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard-data";
import { formatInt } from "@/app/components/charts/shared";

export function TechContent({ data }: { data: DashboardData }) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="dashboard-card p-5 lg:col-span-2">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Emerging Technologies</h2>
        <p className="mb-4 text-xs text-slate-500">
          Growth % compares skill mentions in the last 30 days vs the prior 30 days (from live job ingestion)
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.emergingTechnologies.map((item) => (
            <div key={item.name} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-start justify-between">
                <Cloud className="h-5 w-5 text-blue-500" />
                <span
                  className={`flex items-center gap-1 text-sm font-bold ${
                    item.growthPct >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {item.growthPct >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {item.growthPct}%
                </span>
              </div>
              <p className="mt-3 font-semibold text-slate-900">{item.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                Recent: {formatInt(item.recentCount)} · Prior: {formatInt(item.priorCount)}
              </p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
