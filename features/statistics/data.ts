import { getTeamAccess } from "@/features/teams/access";
import type { Json } from "@/types/database";
import {
  getDisciplineTable,
  getPlayerStatistics as findPlayerStatistics,
  getSeasonStatistics,
  getTeamStatistics,
  getTopScorers,
  resolveStatisticsFilter,
  type PlayerStatistics,
  type StatisticsFilter,
  type StatisticsSeason,
  type StatisticsSnapshot,
} from "./model";

const STATISTICS_SEASON_LIMIT = 100;

export function emptyTeamStatistics() {
  return {
    matches_played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goals_scored: 0,
    goals_conceded: 0,
    goal_difference: 0,
    yellow_cards: 0,
    red_cards: 0,
  };
}

export function parseStatisticsSnapshot(
  value: Json | null,
): StatisticsSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      has_completed_matches: false,
      team: emptyTeamStatistics(),
      players: [],
    };
  }
  const record = value as Record<string, Json | undefined>;
  const rawTeam =
    record.team &&
    typeof record.team === "object" &&
    !Array.isArray(record.team)
      ? (record.team as Record<string, Json | undefined>)
      : {};
  const numberValue = (key: string) =>
    typeof rawTeam[key] === "number" ? rawTeam[key] : 0;
  const rawPlayers = Array.isArray(record.players) ? record.players : [];
  return {
    has_completed_matches: record.has_completed_matches === true,
    team: {
      matches_played: numberValue("matches_played"),
      wins: numberValue("wins"),
      draws: numberValue("draws"),
      losses: numberValue("losses"),
      goals_scored: numberValue("goals_scored"),
      goals_conceded: numberValue("goals_conceded"),
      goal_difference: numberValue("goal_difference"),
      yellow_cards: numberValue("yellow_cards"),
      red_cards: numberValue("red_cards"),
    },
    players: rawPlayers.filter(
      (player): player is PlayerStatistics =>
        Boolean(player) && typeof player === "object" && !Array.isArray(player),
    ) as PlayerStatistics[],
  };
}

export async function readStatisticsSnapshot(
  supabase: {
    rpc: (
      name: "get_statistics_snapshot",
      args: { target_team_id: string; target_season_id: string | null },
    ) => PromiseLike<{ data: Json | null; error: { message: string } | null }>;
  },
  teamId: string,
  seasonId: string | null,
) {
  const result = await supabase.rpc("get_statistics_snapshot", {
    target_team_id: teamId,
    target_season_id: seasonId,
  });
  if (result.error) throw result.error;
  return parseStatisticsSnapshot(result.data);
}

export async function getStatisticsData(requestedFilter?: string) {
  const { supabase, team } = await getTeamAccess();
  if (!team) throw new Error("statistics_team_not_found");

  const seasonsResult = await supabase
    .from("seasons")
    .select("id, name, status, start_date, end_date")
    .eq("team_id", team.id)
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(STATISTICS_SEASON_LIMIT);
  if (seasonsResult.error) throw seasonsResult.error;

  const seasons = seasonsResult.data as StatisticsSeason[];
  const activeSeason =
    seasons.find(({ status }) => status === "active") ?? null;
  const resolved = resolveStatisticsFilter(
    requestedFilter,
    seasons,
    activeSeason?.id ?? null,
  );
  const snapshot = await readStatisticsSnapshot(
    supabase as unknown as Parameters<typeof readStatisticsSnapshot>[0],
    team.id,
    resolved.seasonId,
  );

  return {
    team,
    seasons,
    activeSeason,
    selectedFilter: resolved.filter,
    selectedSeason: resolved.seasonId
      ? (seasons.find(({ id }) => id === resolved.seasonId) ?? null)
      : null,
    snapshot,
  };
}

export async function getPlayerStatistics(
  playerId: string,
  requestedFilter: StatisticsFilter = "all",
) {
  const data = await getStatisticsData(requestedFilter);
  return { ...data, player: findPlayerStatistics(data.snapshot, playerId) };
}

export { findPlayerStatistics as getPlayerStatistic };
export {
  getDisciplineTable,
  getSeasonStatistics,
  getTeamStatistics,
  getTopScorers,
};
