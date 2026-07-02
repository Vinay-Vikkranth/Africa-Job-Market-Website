import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const country = request.nextUrl.searchParams.get("country");
  const rows = await prisma.job.groupBy({
    by: ["city"],
    where: country && country !== "All Countries" ? { country } : undefined,
    _count: { city: true },
    orderBy: { _count: { city: "desc" } },
    take: 20,
  });

  return NextResponse.json(
    rows.map((row) => ({
      city: row.city,
      jobs: row._count.city,
    })),
  );
}
