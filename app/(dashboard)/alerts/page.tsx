import { COUNTRIES, getDashboardData } from "@/lib/dashboard-data";
import { AlertsContent } from "@/app/components/alerts-content";

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const params = await searchParams;
  const country = COUNTRIES.includes(params.country as (typeof COUNTRIES)[number])
    ? (params.country as (typeof COUNTRIES)[number])
    : "All Countries";
  const data = await getDashboardData(country);
  return <AlertsContent data={data} />;
}
