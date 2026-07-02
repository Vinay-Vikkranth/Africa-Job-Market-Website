"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard-data";
import { formatCurrency, formatInt } from "@/app/components/charts/shared";

type JobsPayload = Awaited<ReturnType<typeof import("@/lib/dashboard-data").getJobsList>>;

export function JobsContent({
  data,
  jobs,
  country,
}: {
  data: DashboardData;
  jobs: JobsPayload;
  country: string;
}) {
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="dashboard-card p-4">
          <p className="text-xs text-slate-500">Total Postings</p>
          <p className="text-2xl font-bold">{formatInt(data.kpis.totalJobs)}</p>
        </article>
        <article className="dashboard-card p-4">
          <p className="text-xs text-slate-500">Unique Companies</p>
          <p className="text-2xl font-bold">{formatInt(data.kpis.uniqueCompanies)}</p>
        </article>
        <article className="dashboard-card p-4">
          <p className="text-xs text-slate-500">30-Day Growth</p>
          <p className="text-2xl font-bold">{data.kpis.growthPct}%</p>
        </article>
      </section>

      <article className="dashboard-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Live Job Postings</h2>
          <p className="text-xs text-slate-500">Pulled from Remotive and Arbeitnow APIs, stored in local database</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Salary</th>
                <th className="px-5 py-3">Skills</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {jobs.jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    No jobs found. Click &quot;Sync Data&quot; in the header to ingest live postings.
                  </td>
                </tr>
              ) : (
                jobs.jobs.map((job) => (
                  <tr key={job.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-900">{job.title}</td>
                    <td className="px-5 py-3 text-slate-600">{job.company}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {job.city}, {job.country}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {job.salaryMinUsd ? formatCurrency(job.salaryMinUsd) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {job.skills.slice(0, 3).map((s) => (
                          <span key={s} className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{job.source}</td>
                    <td className="px-5 py-3">
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {jobs.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <p className="text-xs text-slate-500">
              Page {jobs.page} of {jobs.totalPages} ({formatInt(jobs.total)} jobs)
            </p>
            <div className="flex gap-2">
              {jobs.page > 1 && (
                <Link
                  href={`/jobs?country=${encodeURIComponent(country)}&page=${jobs.page - 1}`}
                  className="rounded border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50"
                >
                  Previous
                </Link>
              )}
              {jobs.page < jobs.totalPages && (
                <Link
                  href={`/jobs?country=${encodeURIComponent(country)}&page=${jobs.page + 1}`}
                  className="rounded border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </article>
    </>
  );
}
