"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { COUNTRIES, COUNTRY_FLAGS } from "@/lib/constants";

export function CountryFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = searchParams.get("country") ?? "All Countries";

  function onChange(country: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (country === "All Countries") {
      params.delete("country");
    } else {
      params.set("country", country);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="country-filter" className="sr-only">
        Filter by country
      </label>
      <select
        id="country-filter"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {COUNTRIES.map((country) => (
          <option key={country} value={country}>
            {country === "All Countries" ? "🌍 All Countries" : `${COUNTRY_FLAGS[country] ?? ""} ${country}`}
          </option>
        ))}
      </select>
    </div>
  );
}
