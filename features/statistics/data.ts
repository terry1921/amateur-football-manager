import { getTeamAccess } from "@/features/teams/access";
import {
  playerPositions,
  playerStatuses,
  type PlayerPosition,
  type PlayerStatus,
} from "@/features/players/model";
import type { Json } from "@/types/database";
import {
  getDisciplineTable,
  getPlayerStatistics as findPlayerStatistics,
  getSeasonStatistics,
  getTeamStatistics,
  getTopScorers,
  resolveStatisticsFilter,
  type PlayerStatistics,
  type PlayerStatisticsDetail,
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

function recordOf(value: Json | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : null;
}

function numberOf(record: Record<string, Json | undefined>, key: string) {
  return typeof record[key] === "number" ? record[key] : 0;
}

function stringOf(record: Record<string, Json | undefined>, key: string) {
  return typeof record[key] === "string" ? record[key] : "";
}

function positionOf(value: string): PlayerPosition {
  return playerPositions.includes(value as PlayerPosition)
    ? (value as PlayerPosition)
    : "MID";
}

function statusOf(value: string): PlayerStatus {
  return playerStatuses.includes(value as PlayerStatus)
    ? (value as PlayerStatus)
    : "active";
}

export function parsePlayerStatistics(value: Json | undefined) {
  const record = recordOf(value);
  if (!record) return null;
  return {
    player_id: stringOf(record, "player_id"),
    first_name: stringOf(record, "first_name"),
    last_name: typeof record.last_name === "string" ? record.last_name : null,
    nickname: typeof record.nickname === "string" ? record.nickname : null,
    shirt_number:
      typeof record.shirt_number === "number" ? record.shirt_number : null,
    position: positionOf(stringOf(record, "position")),
    status: statusOf(stringOf(record, "status")),
    total_matches_called_up: numberOf(record, "total_matches_called_up"),
    matches_called_up: numberOf(record, "matches_called_up"),
    matches_won: numberOf(record, "matches_won"),
    matches_drawn: numberOf(record, "matches_drawn"),
    matches_lost: numberOf(record, "matches_lost"),
    goals: numberOf(record, "goals"),
    scoring_matches: numberOf(record, "scoring_matches"),
    multi_goal_matches: numberOf(record, "multi_goal_matches"),
    yellow_cards: numberOf(record, "yellow_cards"),
    red_cards: numberOf(record, "red_cards"),
  } satisfies PlayerStatistics;
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
  const rawTeam = recordOf(record.team) ?? {};
  const numberValue = (key: string) => numberOf(rawTeam, key);
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
    players: rawPlayers.flatMap((player) => {
      const parsed = parsePlayerStatistics(player);
      return parsed ? [parsed] : [];
    }),
  };
}

function parseRecentMatch(value: Json | undefined) {
  const record = recordOf(value);
  if (!record) return null;
  return {
    match_id: stringOf(record, "match_id"),
    season_id: stringOf(record, "season_id"),
    opponent_name: stringOf(record, "opponent_name"),
    kickoff_at: stringOf(record, "kickoff_at"),
    team_score: numberOf(record, "team_score"),
    opponent_score: numberOf(record, "opponent_score"),
    result: stringOf(record, "result") as "win" | "draw" | "loss",
    goals: numberOf(record, "goals"),
    yellow_cards: numberOf(record, "yellow_cards"),
    red_cards: numberOf(record, "red_cards"),
  };
}

function parseHistoryEvent(value: Json | undefined) {
  const record = recordOf(value);
  if (!record) return null;
  return {
    event_id: stringOf(record, "event_id"),
    match_id: stringOf(record, "match_id"),
    opponent_name: stringOf(record, "opponent_name"),
    kickoff_at: stringOf(record, "kickoff_at"),
    minute: numberOf(record, "minute"),
    stoppage_time: numberOf(record, "stoppage_time"),
    team_score: numberOf(record, "team_score"),
    opponent_score: numberOf(record, "opponent_score"),
    result: stringOf(record, "result") as "win" | "draw" | "loss",
  };
}

export function parsePlayerStatisticsDetail(
  value: Json | null,
): PlayerStatisticsDetail {
  const record = recordOf(value);
  if (!record) {
    return {
      has_completed_matches: false,
      player: null,
      recent_matches: [],
      goal_history: [],
      discipline_history: [],
    };
  }
  const rawRecentMatches = Array.isArray(record.recent_matches)
    ? record.recent_matches
    : [];
  const rawGoalHistory = Array.isArray(record.goal_history)
    ? record.goal_history
    : [];
  const rawDisciplineHistory = Array.isArray(record.discipline_history)
    ? record.discipline_history
    : [];
  const recentMatches = rawRecentMatches.flatMap((item) => {
    const parsed = parseRecentMatch(item);
    return parsed ? [parsed] : [];
  });
  const goalHistory = rawGoalHistory.flatMap((item) => {
    const parsed = parseHistoryEvent(item);
    return parsed ? [parsed] : [];
  });
  const disciplineHistory = rawDisciplineHistory.flatMap((item) => {
    const parsed = parseHistoryEvent(item);
    const itemRecord = recordOf(item);
    const type = itemRecord ? stringOf(itemRecord, "type") : "";
    return parsed && (type === "yellow_card" || type === "red_card")
      ? [{ ...parsed, type: type as "yellow_card" | "red_card" }]
      : [];
  });
  return {
    has_completed_matches: recentMatches.length > 0,
    player: parsePlayerStatistics(record.player),
    recent_matches: recentMatches,
    goal_history: goalHistory,
    discipline_history: disciplineHistory,
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

export async function readPlayerStatisticsDetail(
  supabase: {
    rpc: (
      name: "get_player_statistics_detail",
      args: {
        target_player_id: string;
        target_season_id: string | null;
        target_team_id: string;
      },
    ) => PromiseLike<{ data: Json | null; error: { message: string } | null }>;
  },
  teamId: string,
  playerId: string,
  seasonId: string | null,
) {
  const result = await supabase.rpc("get_player_statistics_detail", {
    target_team_id: teamId,
    target_player_id: playerId,
    target_season_id: seasonId,
  });
  if (result.error) throw result.error;
  return parsePlayerStatisticsDetail(result.data);
}

export async function getStatisticsContext(requestedFilter?: string) {
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
  return {
    supabase,
    team,
    seasons,
    activeSeason,
    selectedFilter: resolved.filter,
    selectedSeason: resolved.seasonId
      ? (seasons.find(({ id }) => id === resolved.seasonId) ?? null)
      : null,
    seasonId: resolved.seasonId,
  };
}

export async function getStatisticsData(requestedFilter?: string) {
  const context = await getStatisticsContext(requestedFilter);
  const snapshot = await readStatisticsSnapshot(
    context.supabase as unknown as Parameters<typeof readStatisticsSnapshot>[0],
    context.team.id,
    context.seasonId,
  );

  return {
    team: context.team,
    seasons: context.seasons,
    activeSeason: context.activeSeason,
    selectedFilter: context.selectedFilter,
    selectedSeason: context.selectedSeason,
    snapshot,
  };
}

export async function getPlayerStatistics(
  playerId: string,
  requestedFilter: StatisticsFilter = "all",
) {
  const context = await getStatisticsContext(requestedFilter);
  const detail = await readPlayerStatisticsDetail(
    context.supabase as unknown as Parameters<
      typeof readPlayerStatisticsDetail
    >[0],
    context.team.id,
    playerId,
    context.seasonId,
  );
  return {
    team: context.team,
    seasons: context.seasons,
    activeSeason: context.activeSeason,
    selectedFilter: context.selectedFilter,
    selectedSeason: context.selectedSeason,
    detail,
    player: detail.player,
  };
}

export { findPlayerStatistics as getPlayerStatistic };
export {
  getDisciplineTable,
  getSeasonStatistics,
  getTeamStatistics,
  getTopScorers,
};
