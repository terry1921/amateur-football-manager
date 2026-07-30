import { describe, expect, it } from "vitest";
import { resolveCurrentSeason } from "./current-season";

type Season = {
  id: string;
  team_id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
};

function createSeasonClient(rows: Season[]) {
  const filters: Partial<Season> = {};

  const query = {
    select: () => query,
    eq: (field: string, value: string) => {
      filters[field as keyof Season] = value;
      return query;
    },
    limit: () => query,
    maybeSingle: async () => ({
      data:
        rows.find((row) =>
          Object.entries(filters).every(
            ([field, value]) => row[field as keyof Season] === value,
          ),
        ) ?? null,
      error: null,
    }),
  };

  return { from: () => query };
}

describe("resolveCurrentSeason", () => {
  it("returns only the active season for the requested team", async () => {
    const client = createSeasonClient([
      {
        id: "draft-a",
        team_id: "team-a",
        name: "Draft A",
        status: "draft",
        start_date: "2026-07-01",
        end_date: "2026-12-31",
      },
      {
        id: "active-b",
        team_id: "team-b",
        name: "Active B",
        status: "active",
        start_date: "2026-01-01",
        end_date: "2026-06-30",
      },
      {
        id: "active-a",
        team_id: "team-a",
        name: "Active A",
        status: "active",
        start_date: "2026-01-01",
        end_date: "2026-06-30",
      },
    ]);

    await expect(
      resolveCurrentSeason({ supabase: client, teamId: "team-a" }),
    ).resolves.toMatchObject({ id: "active-a", name: "Active A" });
  });

  it("returns null when the team has no active season", async () => {
    const client = createSeasonClient([]);

    await expect(
      resolveCurrentSeason({ supabase: client, teamId: "team-a" }),
    ).resolves.toBeNull();
  });
});
