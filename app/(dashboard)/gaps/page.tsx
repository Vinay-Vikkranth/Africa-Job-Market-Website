import { COUNTRIES, getDashboardData } from "@/lib/dashboard-data";
import { GapsContent } from "@/app/components/gaps-content";

export default async function GapsPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const params = await searchParams;
  const country = COUNTRIES.includes(params.country as (typeof COUNTRIES)[number])
    ? (params.country as (typeof COUNTRIES)[number])
    : "All Countries";
  const data = await getDashboardData(country);
  return <GapsContent data={data} />;
}
