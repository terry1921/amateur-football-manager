import { getStatisticsData } from "@/features/statistics/data";
import {
  filterPlayerStatistics,
  resolvePlayerStatisticsFilters,
} from "@/features/statistics/model";
import { LeaderboardsView } from "@/features/leaderboards/leaderboards-view";
import type { AppLocale } from "@/i18n/routing";

export default async function LeaderboardsPage({
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
    <LeaderboardsView
      data={{
        ...data,
        players: filterPlayerStatistics(data.snapshot.players, filters),
        filters,
      }}
    />
  );
}
