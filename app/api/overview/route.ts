import { NextRequest, NextResponse } from "next/server";
import { COUNTRIES, getDashboardData } from "@/lib/dashboard-data";

export async function GET(request: NextRequest) {
  const countryParam = request.nextUrl.searchParams.get("country") ?? "All Countries";
  const country = COUNTRIES.includes(countryParam as (typeof COUNTRIES)[number])
    ? (countryParam as (typeof COUNTRIES)[number])
    : "All Countries";

  const data = await getDashboardData(country);
  return NextResponse.json(data);
}
