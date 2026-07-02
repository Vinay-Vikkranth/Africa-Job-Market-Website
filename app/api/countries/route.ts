import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const countryFilter = request.nextUrl.searchParams.get("country");
  const rows = await prisma.job.groupBy({
    by: ["country"],
    where: countryFilter ? { country: countryFilter } : undefined,
    _count: { country: true },
    orderBy: { _count: { country: "desc" } },
  });

  return NextResponse.json(
    rows.map((row) => ({
      country: row.country,
      jobs: row._count.country,
    })),
  );
}
