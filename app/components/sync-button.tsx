"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";

type SyncResult = {
  ok: boolean;
  message?: string;
  inserted?: number;
  updated?: number;
  error?: string;
};

export function SyncButton() {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [detail, setDetail] = useState<string | null>(null);

  async function syncNow() {
    setIsSyncing(true);
    setStatus("idle");
    setDetail(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = (await res.json()) as SyncResult;
      if (!res.ok || !data.ok) {
        setStatus("error");
        setDetail(data.error ?? data.message ?? "Sync failed");
        return;
      }
      setStatus("ok");
      const parts = [
        typeof data.inserted === "number" ? `${data.inserted} new` : null,
        typeof data.updated === "number" ? `${data.updated} updated` : null,
      ].filter(Boolean);
      setDetail(parts.length ? parts.join(" · ") : "Jobs refreshed");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setDetail(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsSyncing(false);
      window.setTimeout(() => {
        setStatus("idle");
        setDetail(null);
      }, 8000);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={syncNow}
        disabled={isSyncing}
        aria-busy={isSyncing}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
        {isSyncing ? "Syncing…" : "Sync jobs"}
      </button>
      {status === "ok" && detail && (
        <p className="flex max-w-[14rem] items-center gap-1 text-[11px] text-emerald-600" role="status">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          {detail}
        </p>
      )}
      {status === "error" && detail && (
        <p className="flex max-w-[14rem] items-center gap-1 text-[11px] text-rose-600" role="alert">
          <XCircle className="h-3 w-3 shrink-0" />
          {detail}
        </p>
      )}
    </div>
  );
}
