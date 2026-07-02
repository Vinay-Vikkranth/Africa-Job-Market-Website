"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Calendar, Globe2 } from "lucide-react";
import { NAV_ITEMS, PAGE_META } from "@/lib/nav";
import { CountryFilter } from "@/app/components/country-filter";
import { SyncButton } from "@/app/components/sync-button";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedCountry = searchParams.get("country") ?? "All Countries";
  const meta = PAGE_META[pathname] ?? PAGE_META["/"];

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-56 flex-col bg-[var(--sidebar)] text-white">
        <div className="flex items-center gap-3 border-b border-slate-700/50 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500">
            <Globe2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Skills Observatory</p>
            <p className="text-[10px] text-slate-400">Africa Workforce Insights</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const qs = searchParams.toString();
            const href = qs ? `${item.href}?${qs}` : item.href;
            return (
              <Link key={item.href} href={href} className={`sidebar-link ${active ? "active" : ""}`}>
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-700/50 p-4 text-[11px] text-slate-400">
          <p>Country filter is in the top header and applies to every page.</p>
          <Link href="/reports" className="mt-2 inline-block text-blue-400 hover:text-blue-300">
            Export reports →
          </Link>
        </div>
      </aside>

      <div className="ml-56 flex-1">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-8 py-5 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{meta.title}</h1>
              <p className="mt-0.5 text-sm text-slate-500">{meta.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
                <Calendar className="h-4 w-4 text-slate-400" />
                Last 30 days
              </div>
              <CountryFilter />
              <SyncButton />
            </div>
          </div>
          {selectedCountry !== "All Countries" && (
            <p className="mt-2 text-xs text-blue-600">
              Showing data for <strong>{selectedCountry}</strong> only
            </p>
          )}
        </header>
        <main className="space-y-5 p-6">{children}</main>
      </div>
    </div>
  );
}
