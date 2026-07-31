import type { Tables } from "@/types/database";

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
  position: string;
  matches_called_up: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  goals: number;
  yellow_cards: number;
  red_cards: number;
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
