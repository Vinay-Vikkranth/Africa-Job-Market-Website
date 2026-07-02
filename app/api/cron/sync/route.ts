import { NextRequest, NextResponse } from "next/server";
import { syncAllJobSources } from "@/lib/sync-jobs";
import { ensureBaselineData } from "@/lib/seed-baseline";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureBaselineData();
    const result = await syncAllJobSources();
    return NextResponse.json({
      ok: true,
      message: "Scheduled sync completed",
      ...result,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 },
    );
  }
}
