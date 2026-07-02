import { NextRequest, NextResponse } from "next/server";
import { COUNTRIES } from "@/lib/constants";
import { getDashboardData } from "@/lib/dashboard-data";

function csvCell(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  try {
    const countryParam = request.nextUrl.searchParams.get("country") ?? "All Countries";
    const country = COUNTRIES.includes(countryParam as (typeof COUNTRIES)[number])
      ? (countryParam as (typeof COUNTRIES)[number])
      : "All Countries";

    const data = await getDashboardData(country);

    const rows = [
      ["Metric", "Value"],
      ["Country Filter", country],
      ["Total Jobs", String(data.kpis.totalJobs)],
      ["Unique Companies", String(data.kpis.uniqueCompanies)],
      ["In-Demand Skills", String(data.kpis.inDemandSkills)],
      ["Avg Salary USD", String(data.kpis.avgSalaryUsd)],
      ["Overall Skill Gap %", String(data.kpis.overallGapPct)],
      ["Job Growth %", String(data.kpis.growthPct)],
      [],
      ["Top Skills", "Demand %", "Mentions"],
      ...data.topSkills.map((s) => [s.name, String(s.demandPct), String(s.mentions)]),
      [],
      ["Jobs by Country", "Count"],
      ...data.jobsByCountry.map((c) => [c.country, String(c.jobs)]),
      [],
      ["Data Sources", "Job Count"],
      ...data.meta.dataSources.map((s) => [s.source, String(s._count.source)]),
    ];

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="skills-observatory-report-${country.replace(/\s/g, "-").toLowerCase()}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CSV generation failed" },
      { status: 500 },
    );
  }
}
