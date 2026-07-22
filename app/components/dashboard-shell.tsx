"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Globe2 } from "lucide-react";
import { NAV_ITEMS, PAGE_META } from "@/lib/nav";
import { CountryFilter } from "@/app/components/country-filter";
import { SyncButton } from "@/app/components/sync-button";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedCountry = searchParams.get("country") ?? "All Countries";
  const meta = PAGE_META[pathname] ?? PAGE_META["/"];
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const qs = searchParams.toString();

  return (
    <div className="flex min-h-screen">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-56 flex-col bg-[var(--sidebar)] text-white transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-700/50 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500">
              <Globe2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">Skills Observatory</p>
              <p className="text-[10px] text-slate-400">Africa Workforce Insights</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-700 hover:text-white lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const href = qs ? `${item.href}?${qs}` : item.href;
            return (
              <Link
                key={item.href}
                href={href}
                className={`sidebar-link ${active ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-700/50 p-4 text-[11px] text-slate-400">
          <p>Country filter is in the top header and applies to every page.</p>
          <Link href="/sources" className="mt-2 inline-block text-blue-400 hover:text-blue-300">
            Verify data sources →
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1 lg:ml-56">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur-sm sm:px-6 lg:px-8 lg:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                className="mt-0.5 rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{meta.title}</h1>
                <p className="mt-0.5 text-sm text-slate-500">{meta.subtitle}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
        <main className="space-y-5 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
