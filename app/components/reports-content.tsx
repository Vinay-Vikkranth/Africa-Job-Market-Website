"use client";

import { FileText } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard-data";
import { formatCurrency, formatInt } from "@/app/components/charts/shared";
import { ReportDownloadButtons } from "@/app/components/report-download-buttons";

type SyncRunRow = {
  id: number;
  source: string;
  inserted: number;
  updated: number;
  status: string;
  message: string | null;
  ranAt: string;
};

export function ReportsContent({
  data,
  country,
  syncHistory,
}: {
  data: DashboardData;
  country: string;
  syncHistory: SyncRunRow[];
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="dashboard-card p-6">
        <FileText className="h-8 w-8 text-blue-600" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Workforce Analytics Report</h2>
        <p className="mt-2 text-sm text-slate-600">
          Export live analytics as a formatted PDF. Reports are built from current database queries, not static files.
        </p>
        <ReportDownloadButtons country={country} />
      </article>

      <article className="dashboard-card p-6">
        <h2 className="text-sm font-semibold text-slate-900">Report Preview</h2>
        <div className="mt-4 space-y-2 text-sm text-slate-600">
          <p>
            Filter: <strong>{country}</strong>
          </p>
          <p>
            Total jobs: <strong>{formatInt(data.kpis.totalJobs)}</strong>
          </p>
          <p>
            Top skill: <strong>{data.topSkills[0]?.name ?? "N/A"}</strong>
          </p>
          <p>
            Avg salary:{" "}
            <strong>
              {data.kpis.avgSalaryUsd > 0 ? formatCurrency(data.kpis.avgSalaryUsd) : "N/A"}
            </strong>
          </p>
          <p>
            Skill gap index: <strong>{data.skillGap.overall}%</strong>
          </p>
        </div>
      </article>

      <article className="dashboard-card p-6 lg:col-span-2">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Sync History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="pb-2 pr-4">Source</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Inserted</th>
                <th className="pb-2 pr-4">Updated</th>
                <th className="pb-2">Ran at</th>
              </tr>
            </thead>
            <tbody>
              {syncHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-slate-500">
                    No sync runs yet. Click Sync Data in the header.
                  </td>
                </tr>
              ) : (
                syncHistory.map((run) => (
                  <tr key={run.id} className="border-t border-slate-100">
                    <td className="py-2 pr-4 font-medium">{run.source}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          run.status === "success"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{run.inserted}</td>
                    <td className="py-2 pr-4">{run.updated}</td>
                    <td className="py-2 text-slate-500">{new Date(run.ranAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
