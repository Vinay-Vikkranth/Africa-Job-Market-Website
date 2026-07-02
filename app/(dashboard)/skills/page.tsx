import { COUNTRIES, getDashboardData } from "@/lib/dashboard-data";
import { SkillsContent } from "@/app/components/skills-content";

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const params = await searchParams;
  const country = COUNTRIES.includes(params.country as (typeof COUNTRIES)[number])
    ? (params.country as (typeof COUNTRIES)[number])
    : "All Countries";
  const data = await getDashboardData(country);
  return <SkillsContent data={data} />;
}
