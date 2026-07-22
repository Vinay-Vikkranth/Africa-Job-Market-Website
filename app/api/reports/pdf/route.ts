import { NextRequest, NextResponse } from "next/server";
import { COUNTRIES } from "@/lib/constants";
import { getDashboardData } from "@/lib/dashboard-data";
import { generatePdfReport } from "@/lib/report-pdf";
import { captureReportImages } from "@/lib/report-screenshots";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const countryParam = request.nextUrl.searchParams.get("country") ?? "All Countries";
    const country = COUNTRIES.includes(countryParam as (typeof COUNTRIES)[number])
      ? (countryParam as (typeof COUNTRIES)[number])
      : "All Countries";

    const [data, images] = await Promise.all([
      getDashboardData(country),
      captureReportImages(request.nextUrl.origin, country),
    ]);
    const pdf = await generatePdfReport(data, country, images);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="skills-observatory-report-${country.replace(/\s/g, "-").toLowerCase()}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PDF generation failed" },
      { status: 500 },
    );
  }
}
