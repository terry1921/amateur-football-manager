import { describe, expect, it } from "vitest";
import { hydrateMatches } from "./data";

describe("hydrateMatches", () => {
  it("joins season labels and dependency eligibility from batched rows", () => {
    const rows = [
      {
        id: "match-a",
        team_id: "team-a",
        season_id: "season-a",
        opponent_name: "Verona",
        opponent_logo_url: null,
        competition: null,
        round: null,
        venue: null,
        kickoff_at: "2026-08-10T18:00:00.000Z",
        home_away: "home",
        status: "scheduled",
        team_score: null,
        opponent_score: null,
        notes: null,
        created_at: "2026-07-30T12:00:00.000Z",
        updated_at: "2026-07-30T12:00:00.000Z",
      },
      {
        id: "match-b",
        team_id: "team-a",
        season_id: "season-b",
        opponent_name: "Halcones",
        opponent_logo_url: null,
        competition: null,
        round: null,
        venue: null,
        kickoff_at: "2026-08-12T18:00:00.000Z",
        home_away: "away",
        status: "scheduled",
        team_score: null,
        opponent_score: null,
        notes: null,
        created_at: "2026-07-30T12:00:00.000Z",
        updated_at: "2026-07-30T12:00:00.000Z",
      },
    ];

    const matches = hydrateMatches(
      rows,
      [
        { id: "season-a", name: "Apertura" },
        { id: "season-b", name: "Clausura" },
      ],
      new Set(["match-b"]),
    );

    expect(
      matches.map(({ season_name, has_dependents }) => ({
        season_name,
        has_dependents,
      })),
    ).toEqual([
      { season_name: "Apertura", has_dependents: false },
      { season_name: "Clausura", has_dependents: true },
    ]);
  });
});
