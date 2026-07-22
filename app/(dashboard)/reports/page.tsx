import { COUNTRIES, getDashboardData } from "@/lib/dashboard-data";
import { ReportsContent } from "@/app/components/reports-content";
import { prisma } from "@/lib/prisma";

type SyncRun = {
  id: number;
  source: string;
  inserted: number;
  updated: number;
  status: string;
  message: string | null;
  ranAt: Date;
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const params = await searchParams;
  const country = COUNTRIES.includes(params.country as (typeof COUNTRIES)[number])
    ? (params.country as (typeof COUNTRIES)[number])
    : "All Countries";
  const [data, syncHistory] = await Promise.all([
    getDashboardData(country),
    prisma.syncRun.findMany({ orderBy: { ranAt: "desc" }, take: 30 }),
  ]);
  return (
    <ReportsContent
      data={data}
      country={country}
      syncHistory={syncHistory.map((run: SyncRun) => ({
        ...run,
        ranAt: run.ranAt.toISOString(),
      }))}
    />
  );
}
