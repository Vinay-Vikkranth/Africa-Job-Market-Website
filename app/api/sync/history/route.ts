import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const runs = await prisma.syncRun.findMany({
    orderBy: { ranAt: "desc" },
    take: 50,
  });

  return NextResponse.json(
    runs.map((run) => ({
      id: run.id,
      source: run.source,
      inserted: run.inserted,
      updated: run.updated,
      status: run.status,
      message: run.message,
      ranAt: run.ranAt.toISOString(),
    })),
  );
}
