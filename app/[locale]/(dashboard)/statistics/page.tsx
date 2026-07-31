import { getStatisticsData } from "@/features/statistics/data";
import { StatisticsView } from "@/features/statistics/statistics-view";
import {
  filterPlayerStatistics,
  resolvePlayerStatisticsFilters,
} from "@/features/statistics/model";
import type { AppLocale } from "@/i18n/routing";

export default async function StatisticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<{
    season?: string;
    q?: string;
    position?: string;
    status?: string;
  }>;
}) {
  await params;
  const { season, q, position, status } = await searchParams;
  const data = await getStatisticsData(season);
  const filters = resolvePlayerStatisticsFilters(q, position, status);
  return (
    <StatisticsView
      data={{
        ...data,
        players: filterPlayerStatistics(data.snapshot.players, filters),
        filters,
      }}
    />
  );
}
