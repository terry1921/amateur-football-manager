import { getStatisticsData } from "@/features/statistics/data";
import { StatisticsView } from "@/features/statistics/statistics-view";
import type { AppLocale } from "@/i18n/routing";

export default async function StatisticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<{ season?: string }>;
}) {
  await params;
  const { season } = await searchParams;
  const data = await getStatisticsData(season);
  return <StatisticsView data={data} />;
}
