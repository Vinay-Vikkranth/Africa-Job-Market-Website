"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Search } from "lucide-react";
import { COUNTRIES, COUNTRY_FLAGS } from "@/lib/constants";

export function CountryFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = searchParams.get("country") ?? "All Countries";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return COUNTRIES;
    return COUNTRIES.filter((country) =>
      country.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();

    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  function onChange(country: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (country === "All Countries") {
      params.delete("country");
    } else {
      params.set("country", country);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      <label id="country-filter-label" className="sr-only">
        Filter by country
      </label>
      <button
        type="button"
        aria-labelledby="country-filter-label"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-w-52 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <span className="truncate">
          {selected === "All Countries"
            ? "🌍 All Countries"
            : `${COUNTRY_FLAGS[selected] ?? ""} ${selected}`}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setOpen(false);
                    setQuery("");
                  } else if (event.key === "Enter" && filteredCountries.length === 1) {
                    onChange(filteredCountries[0]);
                  }
                }}
                placeholder="Search countries…"
                aria-label="Search countries"
                className="w-full bg-transparent py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <ul
            role="listbox"
            aria-label="Countries"
            className="max-h-72 overflow-y-auto p-1.5"
          >
            {filteredCountries.map((country) => (
              <li key={country}>
                <button
                  type="button"
                  role="option"
                  aria-selected={country === selected}
                  onClick={() => onChange(country)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                    country === selected
                      ? "bg-blue-50 font-medium text-blue-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">
                    {country === "All Countries"
                      ? "🌍 All Countries"
                      : `${COUNTRY_FLAGS[country] ?? ""} ${country}`}
                  </span>
                  {country === selected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              </li>
            ))}
            {filteredCountries.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-slate-500">
                No country found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
