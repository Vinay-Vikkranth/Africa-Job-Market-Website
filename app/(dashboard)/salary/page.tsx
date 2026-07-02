import { COUNTRIES, getDashboardData } from "@/lib/dashboard-data";
import { SalaryContent } from "@/app/components/salary-content";

export default async function SalaryPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const params = await searchParams;
  const country = COUNTRIES.includes(params.country as (typeof COUNTRIES)[number])
    ? (params.country as (typeof COUNTRIES)[number])
    : "All Countries";
  const data = await getDashboardData(country);
  return <SalaryContent data={data} />;
}
