import { NextRequest, NextResponse } from "next/server";
import { COUNTRIES, getJobsList } from "@/lib/dashboard-data";

export async function GET(request: NextRequest) {
  const countryParam = request.nextUrl.searchParams.get("country") ?? "All Countries";
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  const source = request.nextUrl.searchParams.get("source")?.trim().slice(0, 100) || undefined;

  const country = COUNTRIES.includes(countryParam as (typeof COUNTRIES)[number])
    ? (countryParam as (typeof COUNTRIES)[number])
    : "All Countries";

  const data = await getJobsList(country, page, limit, source);
  return NextResponse.json(data);
}
