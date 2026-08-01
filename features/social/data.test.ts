import { describe, expect, it, vi } from "vitest";
import { getSocialGeneratorData } from "./data";

const { getStatisticsContext, readStatisticsSnapshot } = vi.hoisted(() => ({
  getStatisticsContext: vi.fn(),
  readStatisticsSnapshot: vi.fn(),
}));

vi.mock("@/features/statistics/data", () => ({
  getStatisticsContext,
  readStatisticsSnapshot,
}));

type QueryResult = { data: unknown[]; error: null };

class FakeQuery {
  constructor(
    private readonly result: QueryResult,
    private readonly table: string,
    private readonly scopes: Array<[string, unknown]>,
  ) {}

  select() {
    return this;
  }

  eq(field: string, value: unknown) {
    this.scopes.push([this.table + "." + field, value]);
    return this;
  }

  order() {
    return this;
  }

  limit() {
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

describe("social data access", () => {
  it("scopes every dependent read to the authenticated team", async () => {
    const scopes: Array<[string, unknown]> = [];
    const rows = {
      matches: [
        {
          id: "match-1",
          team_id: "team-1",
          season_id: "season-1",
          opponent_name: "Abejas",
          opponent_logo_url: null,
          competition: null,
          round: null,
          venue: null,
          kickoff_at: "2026-08-01T18:00:00.000Z",
          home_away: "home",
          status: "completed",
          team_score: 1,
          opponent_score: 0,
        },
      ],
      players: [],
      callups: [],
      match_events: [],
    };
    const supabase = {
      from(table: keyof typeof rows) {
        return new FakeQuery({ data: rows[table], error: null }, table, scopes);
      },
    };
    getStatisticsContext.mockResolvedValue({
      supabase,
      team: {
        id: "team-1",
        name: "Loros",
        short_name: null,
        logo_url: null,
        primary_color: null,
        secondary_color: null,
      },
      seasons: [
        {
          id: "season-1",
          name: "Apertura",
          status: "active",
          start_date: null,
          end_date: null,
        },
      ],
      activeSeason: null,
      selectedFilter: "current",
      selectedSeason: {
        id: "season-1",
        name: "Apertura",
        status: "active",
        start_date: null,
        end_date: null,
      },
      seasonId: "season-1",
    });
    readStatisticsSnapshot.mockResolvedValue({
      has_completed_matches: false,
      team: {
        matches_played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_scored: 0,
        goals_conceded: 0,
        goal_difference: 0,
        yellow_cards: 0,
        red_cards: 0,
      },
      players: [],
    });

    await getSocialGeneratorData();

    for (const table of ["matches", "players", "callups", "match_events"]) {
      expect(scopes).toContainEqual([table + ".team_id", "team-1"]);
    }
  });
});
