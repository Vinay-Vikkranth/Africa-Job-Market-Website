"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function SyncButton() {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);

  async function syncNow() {
    setIsSyncing(true);
    try {
      await fetch("/api/sync", { method: "POST" });
      router.refresh();
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={syncNow}
      disabled={isSyncing}
      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
    >
      <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
      {isSyncing ? "Syncing..." : "Sync Data"}
    </button>
  );
}
