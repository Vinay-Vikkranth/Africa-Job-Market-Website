import { NextResponse } from "next/server";
import { syncAllJobSources } from "@/lib/sync-jobs";
import { ensureBaselineData } from "@/lib/seed-baseline";

export async function POST() {
  try {
    const baseline = await ensureBaselineData();
    const result = await syncAllJobSources();
    return NextResponse.json({
      ok: true,
      message: "Data sync completed from all sources.",
      baselineInserted: baseline.inserted,
      sources: {
        adzuna: result.adzuna,
        brighterMonday: result.brighterMonday,
        jobberman: result.jobberman,
        apify: result.apify,
        remoteok: result.remoteok,
        remotive: result.remotive,
        arbeitnow: result.arbeitnow,
      },
      inserted: result.inserted,
      updated: result.updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Data sync failed.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      message: "Use POST /api/sync to pull latest jobs from the external source.",
    },
    { status: 405 },
  );
}
