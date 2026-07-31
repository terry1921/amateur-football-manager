import { describe, expect, it } from "vitest";
import {
  insertScheduledMatch,
  verifyOwnedEligibleSeason,
  type MatchMutationClient,
} from "./actions";
import type { MatchInput } from "./schemas";

const input: MatchInput = {
  seasonId: "10000000-0000-4000-8000-000000000001",
  opponentName: "Verona FC",
  date: "2026-08-10",
  time: "19:30",
  timeZone: "America/Mexico_City",
  location: "away",
  venue: "Campo Central",
  notes: null,
};

function eligibleSeasonClient(
  rows: Array<{ id: string; team_id: string; status: string }>,
) {
  const filters: Record<string, string | string[]> = {};
  const query = {
    select: () => query,
    eq: (field: string, value: string) => {
      filters[field] = value;
      return query;
    },
    in: (field: string, value: string[]) => {
      filters[field] = value;
      return query;
    },
    maybeSingle: async () => ({
      data:
        rows.find((row) =>
          Object.entries(filters).every(([field, value]) =>
            Array.isArray(value)
              ? value.includes(row[field as keyof typeof row])
              : row[field as keyof typeof row] === value,
          ),
        ) ?? null,
      error: null,
    }),
  };
  return { from: () => query } as unknown as MatchMutationClient;
}

describe("match mutation boundaries", () => {
  it("accepts only the requested team's draft or active season", async () => {
    const client = eligibleSeasonClient([
      { id: input.seasonId, team_id: "team-b", status: "active" },
      { id: "draft-a", team_id: "team-a", status: "draft" },
      { id: "completed-a", team_id: "team-a", status: "completed" },
    ]);

    await expect(
      verifyOwnedEligibleSeason(client, "team-a", input.seasonId),
    ).resolves.toBe(false);
    await expect(
      verifyOwnedEligibleSeason(client, "team-a", "draft-a"),
    ).resolves.toBe(true);
    await expect(
      verifyOwnedEligibleSeason(client, "team-a", "completed-a"),
    ).resolves.toBe(false);
  });

  it("inserts a server-owned scheduled match with explicit null scores", async () => {
    const inserts: Array<Record<string, unknown>> = [];
    const client = {
      from: () => ({
        insert: async (row: Record<string, unknown>) => {
          inserts.push(row);
          return { error: null };
        },
      }),
    } as unknown as MatchMutationClient;

    await insertScheduledMatch(
      client,
      "trusted-team-a",
      input,
      "2026-08-11T01:30:00.000Z",
    );

    expect(inserts).toEqual([
      {
        team_id: "trusted-team-a",
        season_id: input.seasonId,
        opponent_name: "Verona FC",
        kickoff_at: "2026-08-11T01:30:00.000Z",
        home_away: "away",
        venue: "Campo Central",
        notes: null,
        status: "scheduled",
        team_score: null,
        opponent_score: null,
      },
    ]);
    expect(inserts[0]).not.toHaveProperty("owner_id");
  });
});
