"use client";

import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import { formatCurrency, formatInt } from "@/app/components/charts/shared";
import { DataSourceButton } from "@/app/components/data-source-button";

type JobsPayload = Awaited<ReturnType<typeof import("@/lib/dashboard-data").getJobsList>>;

export function JobsContent({
  jobs,
  country,
  source,
}: {
  jobs: JobsPayload;
  country: string;
  source?: string;
}) {
  function pageHref(page: number) {
    const params = new URLSearchParams();
    if (country !== "All Countries") params.set("country", country);
    if (source) params.set("source", source);
    params.set("page", String(page));
    return `/jobs?${params.toString()}`;
  }

  const clearSourceHref =
    country === "All Countries" ? "/jobs" : `/jobs?country=${encodeURIComponent(country)}`;

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Job rows below are ingested from public boards — open Data Sources for the full list.
        </p>
        <DataSourceButton sourceId="job-boards" />
      </div>
      {source && (
        <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <p>
            Showing detailed postings from <strong>{source}</strong>
            {country !== "All Countries" ? (
              <>
                {" "}in <strong>{country}</strong>
              </>
            ) : null}
          </p>
          <Link
            href={clearSourceHref}
            className="flex items-center gap-1 font-medium hover:text-blue-950 hover:underline"
          >
            <X className="h-4 w-4" />
            Clear source
          </Link>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="dashboard-card p-4">
          <p className="text-xs text-slate-500">{source ? `${source} Postings` : "Total Postings"}</p>
          <p className="text-2xl font-bold">{formatInt(jobs.total)}</p>
        </article>
        <article className="dashboard-card p-4">
          <p className="text-xs text-slate-500">Unique Companies</p>
          <p className="text-2xl font-bold">{formatInt(jobs.uniqueCompanies)}</p>
        </article>
        <article className="dashboard-card p-4">
          <p className="text-xs text-slate-500">30-Day Growth</p>
          <p className="text-2xl font-bold">
            {jobs.growthPct == null ? "n/a" : `${jobs.growthPct}%`}
          </p>
          {jobs.growthPct == null && (
            <p className="mt-1 text-[11px] text-slate-400">Not enough prior-period data</p>
          )}
        </article>
      </section>

      <article className="dashboard-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Live Job Postings</h2>
          <p className="text-xs text-slate-500">
            Pulled from live APIs, official UN feeds, and African job boards. Every row links to
            its source posting.
          </p>
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
                <th className="px-5 py-3">Posted</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {jobs.jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                    No matching jobs were found.
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
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">
                      {new Intl.DateTimeFormat("en", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(job.postedAt))}
                    </td>
                    <td className="px-5 py-3">
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${job.title} source posting`}
                        title="Open source posting"
                        className="text-blue-600 hover:text-blue-700"
                      >
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
                  href={pageHref(jobs.page - 1)}
                  className="rounded border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50"
                >
                  Previous
                </Link>
              )}
              {jobs.page < jobs.totalPages && (
                <Link
                  href={pageHref(jobs.page + 1)}
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
