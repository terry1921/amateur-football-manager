import { describe, expect, it } from "vitest";
import {
  canDeleteMatch,
  canEditMatch,
  filterMatches,
  getManagedScore,
  groupMatches,
  isEligibleSeason,
  isMatchId,
  type Match,
  type MatchFilters,
} from "./model";

function match(overrides: Partial<Match> = {}): Match {
  return {
    id: "match-a",
    team_id: "team-a",
    season_id: "season-a",
    opponent_name: "Verona FC",
    opponent_logo_url: null,
    competition: null,
    round: null,
    venue: "Campo Norte",
    kickoff_at: "2026-08-10T18:00:00.000Z",
    home_away: "home",
    status: "scheduled",
    team_score: null,
    opponent_score: null,
    notes: null,
    created_at: "2026-07-30T12:00:00.000Z",
    updated_at: "2026-07-30T12:00:00.000Z",
    season_name: "Apertura 2026",
    has_dependents: false,
    ...overrides,
  };
}

describe("match domain rules", () => {
  it("accepts draft and active seasons for scheduling, but not completed seasons", () => {
    expect(isEligibleSeason("draft")).toBe(true);
    expect(isEligibleSeason("active")).toBe(true);
    expect(isEligibleSeason("completed")).toBe(false);
  });

  it("rejects malformed route identifiers before they reach the UUID query", () => {
    expect(isMatchId("10000000-0000-4000-8000-000000000001")).toBe(true);
    expect(isMatchId("not-a-match-id")).toBe(false);
  });

  it("groups fixtures without treating an overdue schedule as completed", () => {
    const groups = groupMatches(
      [
        match({
          id: "upcoming-later",
          kickoff_at: "2026-08-12T18:00:00.000Z",
        }),
        match({
          id: "past-scheduled",
          kickoff_at: "2026-08-01T18:00:00.000Z",
        }),
        match({
          id: "upcoming-nearer",
          kickoff_at: "2026-08-11T18:00:00.000Z",
        }),
        match({
          id: "completed",
          status: "completed",
          kickoff_at: "2026-07-20T18:00:00.000Z",
          team_score: 2,
          opponent_score: 1,
        }),
        match({
          id: "cancelled",
          status: "cancelled",
          kickoff_at: "2026-08-15T18:00:00.000Z",
        }),
      ],
      new Date("2026-08-10T20:00:00.000Z"),
    );

    expect(groups.upcoming.map(({ id }) => id)).toEqual([
      "upcoming-nearer",
      "upcoming-later",
    ]);
    expect(groups.pastScheduled.map(({ id }) => id)).toEqual([
      "past-scheduled",
    ]);
    expect(groups.completed.map(({ id }) => id)).toEqual(["completed"]);
    expect(groups.cancelled.map(({ id }) => id)).toEqual(["cancelled"]);
  });

  it("searches opponent and venue case- and accent-insensitively", () => {
    const matches = [
      match({ id: "opponent", opponent_name: "Águilas del Sur" }),
      match({ id: "venue", venue: "Unidad Deportiva El Tintero" }),
      match({ id: "other", opponent_name: "Halcones", venue: null }),
    ];
    const filters: MatchFilters = {
      search: "aguilas",
      season: "all",
      status: "all",
      location: "all",
      group: "all",
    };

    expect(filterMatches(matches, filters).map(({ id }) => id)).toEqual([
      "opponent",
    ]);
    expect(
      filterMatches(matches, { ...filters, search: "tintero" }).map(
        ({ id }) => id,
      ),
    ).toEqual(["venue"]);
  });

  it("composes season, status, location, and time-group filters", () => {
    const matches = [
      match({ id: "wanted", season_id: "season-b", home_away: "away" }),
      match({ id: "wrong-season", season_id: "season-a", home_away: "away" }),
      match({
        id: "wrong-location",
        season_id: "season-b",
        home_away: "home",
      }),
      match({
        id: "completed",
        season_id: "season-b",
        home_away: "away",
        status: "completed",
        team_score: 1,
        opponent_score: 0,
      }),
    ];

    expect(
      filterMatches(
        matches,
        {
          search: "",
          season: "season-b",
          status: "scheduled",
          location: "away",
          group: "upcoming",
        },
        new Date("2026-08-01T00:00:00.000Z"),
      ).map(({ id }) => id),
    ).toEqual(["wanted"]);
  });

  it("restricts editing and deletion by lifecycle and dependencies", () => {
    expect(canEditMatch(match())).toBe(true);
    expect(canEditMatch(match({ status: "cancelled" }))).toBe(false);
    expect(canEditMatch(match({ status: "completed" }))).toBe(false);

    expect(canDeleteMatch(match())).toBe(true);
    expect(canDeleteMatch(match({ status: "cancelled" }))).toBe(true);
    expect(canDeleteMatch(match({ has_dependents: true }))).toBe(false);
    expect(canDeleteMatch(match({ status: "completed" }))).toBe(false);
  });

  it("uses the schema's managed-team score orientation at every location", () => {
    for (const location of ["home", "away", "neutral"] as const) {
      expect(
        getManagedScore(
          match({
            home_away: location,
            status: "completed",
            team_score: 3,
            opponent_score: 2,
          }),
        ),
      ).toEqual({ team: 3, opponent: 2 });
    }
    expect(getManagedScore(match())).toBeNull();
  });
});
