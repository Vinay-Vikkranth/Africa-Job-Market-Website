import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  const rows = await prisma.jobSkill.groupBy({
    by: ["skillId"],
    _count: { skillId: true },
    orderBy: { _count: { skillId: "desc" } },
    take: Number.isFinite(limit) ? Math.min(limit, 100) : 20,
  });

  const skills = await prisma.skill.findMany({
    where: { id: { in: rows.map((row) => row.skillId) } },
    select: { id: true, name: true },
  });
  const map = new Map(skills.map((skill) => [skill.id, skill.name]));

  return NextResponse.json(
    rows.map((row) => ({
      skill: map.get(row.skillId) ?? "Unknown",
      mentions: row._count.skillId,
    })),
  );
}
