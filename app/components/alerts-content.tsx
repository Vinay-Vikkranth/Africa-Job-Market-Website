"use client";

import Link from "next/link";
import { AlertTriangle, Lightbulb, TrendingUp } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard-data";

export function AlertsContent({ data }: { data: DashboardData }) {
  return (
    <section className="grid gap-4">
      {data.alerts.length === 0 ? (
        <article className="dashboard-card p-8 text-center text-slate-500">
          No alerts at this time. Sync more data to enable automated monitoring.
        </article>
      ) : (
        data.alerts.map((alert, i) => (
          <Link
            key={i}
            href={alert.href}
            className="dashboard-card flex gap-4 p-5 transition hover:shadow-md"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                alert.type === "warning"
                  ? "bg-amber-100 text-amber-600"
                  : alert.type === "info"
                    ? "bg-blue-100 text-blue-600"
                    : "bg-emerald-100 text-emerald-600"
              }`}
            >
              {alert.type === "warning" ? (
                <AlertTriangle className="h-5 w-5" />
              ) : alert.type === "info" ? (
                <Lightbulb className="h-5 w-5" />
              ) : (
                <TrendingUp className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="font-medium text-slate-900">{alert.text}</p>
              <p className="mt-1 text-sm text-slate-500">{alert.time}</p>
            </div>
          </Link>
        ))
      )}
    </section>
  );
}
