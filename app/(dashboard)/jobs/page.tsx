import { COUNTRIES, getDashboardData, getJobsList } from "@/lib/dashboard-data";
import { JobsContent } from "@/app/components/jobs-content";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; page?: string }>;
}) {
  const params = await searchParams;
  const country = COUNTRIES.includes(params.country as (typeof COUNTRIES)[number])
    ? (params.country as (typeof COUNTRIES)[number])
    : "All Countries";
  const page = Number(params.page ?? "1");
  const [data, jobs] = await Promise.all([
    getDashboardData(country),
    getJobsList(country, page, 15),
  ]);
  return <JobsContent data={data} jobs={jobs} country={country} />;
}
