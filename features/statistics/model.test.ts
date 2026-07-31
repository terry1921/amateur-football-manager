import { describe, expect, it } from "vitest";
import {
  getDisciplineTable,
  getPlayerStatistics,
  getTeamStatistics,
  getTopScorers,
  resolveStatisticsFilter,
  type PlayerStatistics,
  type StatisticsSnapshot,
} from "./model";

function player(overrides: Partial<PlayerStatistics>): PlayerStatistics {
  return {
    player_id: "player-a",
    first_name: "Marco",
    last_name: "Guerrero",
    nickname: null,
    shirt_number: 9,
    position: "FWD",
    matches_called_up: 2,
    matches_won: 1,
    matches_drawn: 1,
    matches_lost: 0,
    goals: 2,
    yellow_cards: 0,
    red_cards: 0,
    ...overrides,
  };
}

const snapshot: StatisticsSnapshot = {
  has_completed_matches: true,
  team: {
    matches_played: 2,
    wins: 1,
    draws: 1,
    losses: 0,
    goals_scored: 3,
    goals_conceded: 1,
    goal_difference: 2,
    yellow_cards: 2,
    red_cards: 1,
  },
  players: [
    player({ player_id: "player-a", goals: 2 }),
    player({
      player_id: "player-b",
      first_name: "Luis",
      last_name: "Soto",
      goals: 1,
      yellow_cards: 2,
      red_cards: 1,
    }),
    player({
      player_id: "player-c",
      first_name: "Ana",
      last_name: "Díaz",
      goals: 0,
      yellow_cards: 1,
    }),
  ],
};

describe("statistics model", () => {
  it("derives rankings from player projections without changing the source array", () => {
    const original = [...snapshot.players];
    expect(
      getTopScorers(snapshot.players).map(({ player_id }) => player_id),
    ).toEqual(["player-a", "player-b"]);
    expect(
      getDisciplineTable(snapshot.players).map(({ player_id }) => player_id),
    ).toEqual(["player-b", "player-c"]);
    expect(snapshot.players).toEqual(original);
  });

  it("returns the team and player projections used by page consumers", () => {
    expect(getTeamStatistics(snapshot)).toEqual(snapshot.team);
    expect(getPlayerStatistics(snapshot, "player-b")?.goals).toBe(1);
    expect(getPlayerStatistics(snapshot, "missing")).toBeNull();
  });

  it("resolves current, specific, and career filters", () => {
    const seasons = [
      {
        id: "season-current",
        name: "Apertura",
        status: "active",
        start_date: null,
        end_date: null,
      },
      {
        id: "season-old",
        name: "Clausura",
        status: "completed",
        start_date: null,
        end_date: null,
      },
    ];
    expect(
      resolveStatisticsFilter(undefined, seasons, "season-current"),
    ).toEqual({
      filter: "current",
      seasonId: "season-current",
    });
    expect(
      resolveStatisticsFilter("season-current", seasons, "season-current"),
    ).toEqual({
      filter: "current",
      seasonId: "season-current",
    });
    expect(
      resolveStatisticsFilter("season-old", seasons, "season-current"),
    ).toEqual({
      filter: "season-old",
      seasonId: "season-old",
    });
    expect(resolveStatisticsFilter("all", seasons, "season-current")).toEqual({
      filter: "all",
      seasonId: null,
    });
  });
});
