import { COUNTRIES, getDashboardData } from "@/lib/dashboard-data";
import { OverviewContent } from "@/app/components/overview-content";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const params = await searchParams;
  const requested = params.country ?? "All Countries";
  const country = (COUNTRIES as readonly string[]).includes(requested)
    ? (requested as (typeof COUNTRIES)[number])
    : "All Countries";
  const data = await getDashboardData(country);
  return <OverviewContent data={data} country={country} />;
}
