import { NextResponse } from "next/server";
import { syncAllJobSources } from "@/lib/sync-jobs";

export async function POST() {
  try {
    const result = await syncAllJobSources();
    return NextResponse.json({
      ok: true,
      message: "Data sync completed from all sources.",
      sources: {
        adzuna: result.adzuna,
        brighterMonday: result.brighterMonday,
        jobberman: result.jobberman,
        apify: result.apify,
        freehire: result.freehire,
        jooble: result.jooble,
        reliefweb: result.reliefweb,
        remoteok: result.remoteok,
        undp: result.undp,
        unCareers: result.unCareers,
        unWomen: result.unWomen,
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
