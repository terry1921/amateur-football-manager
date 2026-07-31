import type { Tables } from "@/types/database";
import {
  playerPositions,
  playerStatuses,
  type PlayerPosition,
  type PlayerStatus,
} from "@/features/players/model";

export type StatisticsFilter = "current" | "all" | string;

export type StatisticsSeason = Pick<
  Tables<"seasons">,
  "id" | "name" | "status" | "start_date" | "end_date"
>;

export type PlayerStatistics = {
  player_id: string;
  first_name: string;
  last_name: string | null;
  nickname: string | null;
  shirt_number: number | null;
  position: PlayerPosition;
  status: PlayerStatus;
  total_matches_called_up: number;
  matches_called_up: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  goals: number;
  scoring_matches: number;
  multi_goal_matches: number;
  yellow_cards: number;
  red_cards: number;
};

export type PlayerStatisticsFilters = {
  search: string;
  position: PlayerPosition | "all";
  status: PlayerStatus | "current" | "all";
};

export type PlayerRecentMatch = {
  match_id: string;
  season_id: string;
  opponent_name: string;
  kickoff_at: string;
  team_score: number;
  opponent_score: number;
  result: "win" | "draw" | "loss";
  goals: number;
  yellow_cards: number;
  red_cards: number;
};

export type PlayerGoalHistory = {
  event_id: string;
  match_id: string;
  opponent_name: string;
  kickoff_at: string;
  minute: number;
  stoppage_time: number;
  team_score: number;
  opponent_score: number;
  result: "win" | "draw" | "loss";
};

export type PlayerDisciplineHistory = PlayerGoalHistory & {
  type: "yellow_card" | "red_card";
};

export type PlayerStatisticsDetail = {
  has_completed_matches: boolean;
  player: PlayerStatistics | null;
  recent_matches: PlayerRecentMatch[];
  goal_history: PlayerGoalHistory[];
  discipline_history: PlayerDisciplineHistory[];
};

export type TeamStatistics = {
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_scored: number;
  goals_conceded: number;
  goal_difference: number;
  yellow_cards: number;
  red_cards: number;
};

export type StatisticsSnapshot = {
  has_completed_matches: boolean;
  team: TeamStatistics;
  players: PlayerStatistics[];
};

export function getPlayerDisplayNameFromStatistics(
  player: Pick<PlayerStatistics, "first_name" | "last_name">,
) {
  return [player.first_name, player.last_name].filter(Boolean).join(" ").trim();
}

export function getTopScorers(players: PlayerStatistics[]) {
  return players
    .filter((player) => player.goals > 0)
    .sort(
      (left, right) =>
        right.goals - left.goals ||
        getPlayerDisplayNameFromStatistics(left).localeCompare(
          getPlayerDisplayNameFromStatistics(right),
          undefined,
          { sensitivity: "base" },
        ) ||
        left.player_id.localeCompare(right.player_id),
    );
}

function sortByMetric(
  players: PlayerStatistics[],
  metric: "yellow_cards" | "red_cards",
) {
  return players
    .filter((player) => player[metric] > 0)
    .sort(
      (left, right) =>
        right[metric] - left[metric] ||
        getPlayerDisplayNameFromStatistics(left).localeCompare(
          getPlayerDisplayNameFromStatistics(right),
          undefined,
          { sensitivity: "base" },
        ) ||
        left.player_id.localeCompare(right.player_id),
    );
}

export function getYellowCardLeaders(players: PlayerStatistics[]) {
  return sortByMetric(players, "yellow_cards");
}

export function getRedCardLeaders(players: PlayerStatistics[]) {
  return sortByMetric(players, "red_cards");
}

export function getDisciplineTable(players: PlayerStatistics[]) {
  return players
    .filter((player) => player.yellow_cards > 0 || player.red_cards > 0)
    .sort(
      (left, right) =>
        right.yellow_cards - left.yellow_cards ||
        right.red_cards - left.red_cards ||
        getPlayerDisplayNameFromStatistics(left).localeCompare(
          getPlayerDisplayNameFromStatistics(right),
          undefined,
          { sensitivity: "base" },
        ) ||
        left.player_id.localeCompare(right.player_id),
    );
}

export function getCompetitionRank(
  players: PlayerStatistics[],
  index: number,
  metric: "goals" | "yellow_cards" | "red_cards",
) {
  const value = players[index]?.[metric] ?? 0;
  return (
    players.findIndex((player) => player[metric] === value) + 1 || index + 1
  );
}

function normalizePlayerSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function filterPlayerStatistics(
  players: PlayerStatistics[],
  filters: PlayerStatisticsFilters,
) {
  const search = normalizePlayerSearch(filters.search);
  return players.filter((player) => {
    const searchable = normalizePlayerSearch(
      [
        getPlayerDisplayNameFromStatistics(player),
        player.nickname,
        player.shirt_number?.toString(),
      ]
        .filter(Boolean)
        .join(" "),
    );
    return (
      (!search || searchable.includes(search)) &&
      (filters.position === "all" || player.position === filters.position) &&
      (filters.status === "all" ||
        (filters.status === "current"
          ? player.status !== "inactive"
          : player.status === filters.status))
    );
  });
}

export function resolvePlayerStatisticsFilters(
  search: string | undefined,
  position: string | undefined,
  status: string | undefined,
): PlayerStatisticsFilters {
  return {
    search: (search ?? "").trim().slice(0, 80),
    position: playerPositions.includes(position as PlayerPosition)
      ? (position as PlayerPosition)
      : "all",
    status:
      status === "current" || status === "all"
        ? status
        : playerStatuses.includes(status as PlayerStatus)
          ? (status as PlayerStatus)
          : "all",
  };
}

export function getSeasonStatistics(snapshot: StatisticsSnapshot) {
  return snapshot.team;
}

export function getTeamStatistics(snapshot: StatisticsSnapshot) {
  return snapshot.team;
}

export function getPlayerStatistics(
  snapshot: StatisticsSnapshot,
  playerId: string,
) {
  return (
    snapshot.players.find((player) => player.player_id === playerId) ?? null
  );
}

export function resolveStatisticsFilter(
  requested: string | undefined,
  seasons: StatisticsSeason[],
  activeSeasonId: string | null,
) {
  if (requested === "all") return { filter: "all" as const, seasonId: null };
  if (requested && requested === activeSeasonId) {
    return { filter: "current" as const, seasonId: activeSeasonId };
  }
  if (
    requested &&
    requested !== "current" &&
    seasons.some(({ id }) => id === requested)
  ) {
    return { filter: requested, seasonId: requested };
  }
  if (activeSeasonId)
    return { filter: "current" as const, seasonId: activeSeasonId };
  return { filter: "all" as const, seasonId: null };
}
