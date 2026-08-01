import { describe, expect, it } from "vitest";
import {
  getDisciplineLeader,
  getLeaderboardPlayers,
  getLeaderboardRank,
  getPlayerAwards,
  getMostCalledUpPlayers,
} from "./model";
import type { PlayerStatistics } from "@/features/statistics/model";

function player(overrides: Partial<PlayerStatistics>): PlayerStatistics {
  return {
    player_id: "player-a",
    first_name: "Marco",
    last_name: "Guerrero",
    nickname: null,
    shirt_number: 9,
    position: "FWD",
    status: "active",
    total_matches_called_up: 3,
    matches_called_up: 3,
    matches_won: 2,
    matches_drawn: 1,
    matches_lost: 0,
    goals: 3,
    scoring_matches: 2,
    multi_goal_matches: 1,
    yellow_cards: 0,
    red_cards: 0,
    ...overrides,
  };
}

describe("leaderboards model", () => {
  it("orders called-up leaders deterministically and ignores zero rows", () => {
    const players = [
      player({ player_id: "b", first_name: "Bea", matches_called_up: 2 }),
      player({ player_id: "a", first_name: "Ana", matches_called_up: 2 }),
      player({ player_id: "zero", first_name: "Zero", matches_called_up: 0 }),
    ];

    expect(
      getMostCalledUpPlayers(players).map(({ player_id }) => player_id),
    ).toEqual(["a", "b"]);
    expect(
      getLeaderboardPlayers(players, "calledUp").map(
        ({ player_id }) => player_id,
      ),
    ).toEqual(["a", "b"]);
  });

  it("uses competition ranking for ties", () => {
    const players = [
      player({ player_id: "a", first_name: "Ana", goals: 4 }),
      player({ player_id: "b", first_name: "Bea", goals: 4 }),
      player({ player_id: "c", first_name: "Cora", goals: 1 }),
    ];
    const scorers = getLeaderboardPlayers(players, "topScorers");

    expect(scorers.map(({ player_id }) => player_id)).toEqual(["a", "b", "c"]);
    expect(getLeaderboardRank(scorers, 0, "goals")).toBe(1);
    expect(getLeaderboardRank(scorers, 1, "goals")).toBe(1);
    expect(getLeaderboardRank(scorers, 2, "goals")).toBe(3);
  });

  it("generates awards from the filtered projection without persistence", () => {
    const awards = getPlayerAwards([
      player({ player_id: "scorer", first_name: "Scorer", goals: 5 }),
      player({
        player_id: "iron",
        first_name: "Iron",
        goals: 0,
        matches_called_up: 6,
        matches_won: 4,
      }),
      player({
        player_id: "disciplined",
        first_name: "Disciplined",
        goals: 0,
        matches_called_up: 4,
        yellow_cards: 0,
        red_cards: 0,
      }),
    ]);

    expect(
      awards.map(({ id, player: awardPlayer }) => [id, awardPlayer.player_id]),
    ).toEqual([
      ["goldenBoot", "scorer"],
      ["bestDiscipline", "iron"],
      ["ironPlayer", "iron"],
    ]);
  });

  it("keeps the dashboard discipline leader aligned with the shared table", () => {
    const players = [
      player({ player_id: "cards", first_name: "Cards", yellow_cards: 2 }),
      player({ player_id: "none", first_name: "None", yellow_cards: 0 }),
    ];

    expect(getDisciplineLeader(players)?.player_id).toBe("cards");
  });
});
