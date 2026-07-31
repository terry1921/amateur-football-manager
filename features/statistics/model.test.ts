import { describe, expect, it } from "vitest";
import {
  filterPlayerStatistics,
  getDisciplineTable,
  getCompetitionRank,
  getPlayerStatistics,
  getRedCardLeaders,
  getTeamStatistics,
  getTopScorers,
  getYellowCardLeaders,
  resolvePlayerStatisticsFilters,
  resolveStatisticsFilter,
  type PlayerStatistics,
  type StatisticsSnapshot,
} from "./model";

function player(overrides: Partial<PlayerStatistics>): PlayerStatistics {
  const result = {
    player_id: "player-a",
    first_name: "Marco",
    last_name: "Guerrero",
    nickname: null,
    shirt_number: 9,
    position: "FWD",
    status: "active" as const,
    total_matches_called_up: 2,
    matches_called_up: 2,
    matches_won: 1,
    matches_drawn: 1,
    matches_lost: 0,
    goals: 2,
    scoring_matches: 1,
    multi_goal_matches: 1,
    yellow_cards: 0,
    red_cards: 0,
    ...overrides,
  };
  return {
    ...result,
    status: result.status ?? "active",
    position: (result.position ?? "FWD") as PlayerStatistics["position"],
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

  it("keeps card leaderboards separate and uses competition ranks for ties", () => {
    const tied = [
      player({ player_id: "a", first_name: "Ana", goals: 4, yellow_cards: 2 }),
      player({ player_id: "b", first_name: "Bea", goals: 4, yellow_cards: 2 }),
      player({ player_id: "c", first_name: "Cora", goals: 1, red_cards: 1 }),
    ];

    expect(
      getYellowCardLeaders(tied).map(({ player_id }) => player_id),
    ).toEqual(["a", "b"]);
    expect(getRedCardLeaders(tied).map(({ player_id }) => player_id)).toEqual([
      "c",
    ]);
    const scorers = getTopScorers(tied);
    expect(getCompetitionRank(scorers, 0, "goals")).toBe(1);
    expect(getCompetitionRank(scorers, 1, "goals")).toBe(1);
    expect(getCompetitionRank(scorers, 2, "goals")).toBe(3);
  });

  it("filters historical players without relabelling call-ups as appearances", () => {
    const filters = resolvePlayerStatisticsFilters(
      "díaz",
      undefined,
      "current",
    );
    expect(
      filterPlayerStatistics(
        [
          player({ player_id: "active", first_name: "Ana", last_name: "Díaz" }),
          player({
            player_id: "inactive",
            first_name: "Luis",
            last_name: "Soto",
            status: "inactive",
            total_matches_called_up: 5,
            matches_called_up: 4,
          }),
        ],
        filters,
      ).map(({ player_id }) => player_id),
    ).toEqual(["active"]);
    expect(filters.search).toBe("díaz");
  });
});
