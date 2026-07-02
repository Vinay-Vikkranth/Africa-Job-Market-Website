"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function ReportDownloadButtons({ country }: { country: string }) {
  const [loading, setLoading] = useState<"csv" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(type: "csv" | "pdf") {
    setLoading(type);
    setError(null);
    const url =
      type === "csv"
        ? `/api/reports?country=${encodeURIComponent(country)}`
        : `/api/reports/pdf?country=${encodeURIComponent(country)}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Download failed (${response.status})`);
      }
      const blob = await response.blob();
      const ext = type === "csv" ? "csv" : "pdf";
      const filename = `skills-observatory-${country.replace(/\s/g, "-").toLowerCase()}.${ext}`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => download("csv")}
          disabled={loading !== null}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
        >
          {loading === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download CSV
        </button>
        <button
          type="button"
          onClick={() => download("pdf")}
          disabled={loading !== null}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {loading === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download PDF
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <p className="mt-3 text-xs text-slate-500">
        Reports are generated live from the database for: {escapeCsv(country)}
      </p>
    </div>
  );
}
