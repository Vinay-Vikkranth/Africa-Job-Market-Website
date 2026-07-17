import { COUNTRIES, getJobsList } from "@/lib/dashboard-data";
import { JobsContent } from "@/app/components/jobs-content";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; page?: string; source?: string }>;
}) {
  const params = await searchParams;
  const country = COUNTRIES.includes(params.country as (typeof COUNTRIES)[number])
    ? (params.country as (typeof COUNTRIES)[number])
    : "All Countries";
  const requestedPage = Number(params.page ?? "1");
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const source = params.source?.trim().slice(0, 100) || undefined;
  const jobs = await getJobsList(country, page, 15, source);
  return <JobsContent jobs={jobs} country={country} source={source} />;
}
