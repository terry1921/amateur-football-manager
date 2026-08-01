import {
  getCompetitionRank,
  getDisciplineTable,
  getPlayerDisplayNameFromStatistics,
  getRedCardLeaders,
  getTopScorers,
  getYellowCardLeaders,
  type PlayerStatistics,
} from "@/features/statistics/model";

export type LeaderboardMetric =
  "goals" | "yellow_cards" | "red_cards" | "matches_called_up";

export type LeaderboardId =
  "topScorers" | "yellowCards" | "redCards" | "calledUp";

export type LeaderboardAwardId = "goldenBoot" | "bestDiscipline" | "ironPlayer";

export type LeaderboardAward = {
  id: LeaderboardAwardId;
  player: PlayerStatistics;
};

function compareNames(left: PlayerStatistics, right: PlayerStatistics) {
  return (
    getPlayerDisplayNameFromStatistics(left).localeCompare(
      getPlayerDisplayNameFromStatistics(right),
      undefined,
      { sensitivity: "base" },
    ) || left.player_id.localeCompare(right.player_id)
  );
}

export function getMostCalledUpPlayers(players: PlayerStatistics[]) {
  return players
    .filter((player) => player.matches_called_up > 0)
    .sort(
      (left, right) =>
        right.matches_called_up - left.matches_called_up ||
        compareNames(left, right),
    );
}

export function getLeaderboardPlayers(
  players: PlayerStatistics[],
  id: LeaderboardId,
) {
  switch (id) {
    case "topScorers":
      return getTopScorers(players);
    case "yellowCards":
      return getYellowCardLeaders(players);
    case "redCards":
      return getRedCardLeaders(players);
    case "calledUp":
      return getMostCalledUpPlayers(players);
  }
}

export function getLeaderboardRank(
  players: PlayerStatistics[],
  index: number,
  metric: LeaderboardMetric,
) {
  return getCompetitionRank(players, index, metric);
}

export function getDisciplineLeader(players: PlayerStatistics[]) {
  return getDisciplineTable(players)[0] ?? null;
}

export function getTopScorer(players: PlayerStatistics[]) {
  return getLeaderboardPlayers(players, "topScorers")[0] ?? null;
}

export function getMostCalledUpPlayer(players: PlayerStatistics[]) {
  return getLeaderboardPlayers(players, "calledUp")[0] ?? null;
}

function getBestDisciplinePlayer(players: PlayerStatistics[]) {
  return players
    .filter(
      (player) =>
        player.matches_called_up > 0 &&
        player.yellow_cards === 0 &&
        player.red_cards === 0,
    )
    .sort(
      (left, right) =>
        right.matches_called_up - left.matches_called_up ||
        right.matches_won - left.matches_won ||
        compareNames(left, right),
    )[0];
}

export function getPlayerAwards(players: PlayerStatistics[]) {
  const goldenBoot = getTopScorers(players)[0];
  const bestDiscipline = getBestDisciplinePlayer(players);
  const ironPlayer = getMostCalledUpPlayers(players).sort(
    (left, right) =>
      right.matches_called_up - left.matches_called_up ||
      right.matches_won - left.matches_won ||
      compareNames(left, right),
  )[0];

  return [
    goldenBoot ? { id: "goldenBoot" as const, player: goldenBoot } : null,
    bestDiscipline
      ? { id: "bestDiscipline" as const, player: bestDiscipline }
      : null,
    ironPlayer ? { id: "ironPlayer" as const, player: ironPlayer } : null,
  ].filter((award): award is LeaderboardAward => Boolean(award));
}
