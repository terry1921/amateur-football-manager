import { getStatisticsData } from "@/features/statistics/data";
import { getTeamSubscription } from "@/features/billing/data";
import { limitLeaderboardRows } from "@/features/billing/model";
import {
  filterPlayerStatistics,
  resolvePlayerStatisticsFilters,
} from "@/features/statistics/model";
import {
  getLeaderboardPlayers,
  getPlayerAwards,
  type LeaderboardId,
} from "@/features/leaderboards/model";
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
  const players = filterPlayerStatistics(data.snapshot.players, filters);
  const subscription = await getTeamSubscription(data.team.id);
  const leaderboardIds: LeaderboardId[] = [
    "topScorers",
    "yellowCards",
    "redCards",
    "calledUp",
  ];
  const limitedLeaderboards = Object.fromEntries(
    leaderboardIds.map((id) => [
      id,
      limitLeaderboardRows(subscription, getLeaderboardPlayers(players, id))
        .rows,
    ]),
  ) as Record<LeaderboardId, typeof players>;

  return (
    <LeaderboardsView
      data={{
        ...data,
        players: [],
        leaderboards: limitedLeaderboards,
        awards: getPlayerAwards(players),
        isPreview: subscription.limits.maxLeaderboardRows !== null,
        filters,
      }}
    />
  );
}
