"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

export function ReportDownloadButtons({ country }: { country: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setLoading(true);
    setError(null);
    const url = `/api/reports/pdf?country=${encodeURIComponent(country)}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Download failed (${response.status})`);
      }
      const blob = await response.blob();
      const filename = `skills-observatory-${country.replace(/\s/g, "-").toLowerCase()}.pdf`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mt-6">
        <button
          type="button"
          onClick={download}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download PDF
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <p className="mt-3 text-xs text-slate-500">Reports are generated live from the database for: {country}</p>
    </div>
  );
}
