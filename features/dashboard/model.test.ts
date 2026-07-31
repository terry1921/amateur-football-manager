import { describe, expect, it } from "vitest";
import {
  getCallupReadiness,
  getDashboardAttentionItems,
  getMatchResult,
  getPrimaryDashboardAction,
  type DashboardMatch,
  type DashboardSeason,
} from "./model";

const season: DashboardSeason = {
  id: "season-a",
  name: "Apertura 2026",
  status: "active",
  start_date: null,
  end_date: null,
};

function match(overrides: Partial<DashboardMatch> = {}): DashboardMatch {
  return {
    id: "match-a",
    season_id: "season-a",
    opponent_name: "Verona FC",
    kickoff_at: "2026-08-11T21:10:00.000Z",
    home_away: "home",
    venue: null,
    status: "scheduled",
    team_score: null,
    opponent_score: null,
    callup_count: 0,
    ...overrides,
  };
}

describe("dashboard composition", () => {
  it("selects the first useful primary action in dependency order", () => {
    expect(
      getPrimaryDashboardAction({
        activeSeason: null,
        playerCount: 0,
        activePlayerCount: 0,
        matchCount: 0,
        upcomingMatch: null,
      }).id,
    ).toBe("create-season");
    expect(
      getPrimaryDashboardAction({
        activeSeason: season,
        playerCount: 0,
        activePlayerCount: 0,
        matchCount: 0,
        upcomingMatch: null,
      }).id,
    ).toBe("add-player");
    expect(
      getPrimaryDashboardAction({
        activeSeason: season,
        playerCount: 4,
        activePlayerCount: 4,
        matchCount: 0,
        upcomingMatch: null,
      }).id,
    ).toBe("schedule-match");
    expect(
      getPrimaryDashboardAction({
        activeSeason: season,
        playerCount: 4,
        activePlayerCount: 4,
        matchCount: 1,
        upcomingMatch: match(),
      }).id,
    ).toBe("manage-callup");
    expect(
      getPrimaryDashboardAction({
        activeSeason: season,
        playerCount: 4,
        activePlayerCount: 4,
        matchCount: 1,
        upcomingMatch: match({ callup_count: 3 }),
      }).id,
    ).toBe("view-next-match");
  });

  it("prioritizes unresolved matches before preparation reminders", () => {
    const items = getDashboardAttentionItems({
      activeSeason: season,
      playerCount: 4,
      activePlayerCount: 4,
      upcomingMatch: match(),
      pastUnresolvedMatch: match({
        id: "past-match",
        kickoff_at: "2026-07-01T21:10:00.000Z",
      }),
    });

    expect(items.map(({ id }) => id)).toEqual([
      "past-unresolved-match",
      "upcoming-match-callup",
    ]);
  });

  it("uses the managed-team score orientation for result labels", () => {
    expect(
      getMatchResult(
        match({ status: "completed", team_score: 2, opponent_score: 1 }),
      ),
    ).toBe("win");
    expect(
      getMatchResult(
        match({ status: "completed", team_score: 1, opponent_score: 1 }),
      ),
    ).toBe("draw");
    expect(
      getMatchResult(
        match({ status: "completed", team_score: 0, opponent_score: 1 }),
      ),
    ).toBe("loss");
    expect(getCallupReadiness(match())).toBe("not_started");
    expect(getCallupReadiness(match({ callup_count: 1 }))).toBe("ready");
    expect(
      getCallupReadiness(match({ status: "cancelled", callup_count: 1 })),
    ).toBe("unavailable");
  });
});
