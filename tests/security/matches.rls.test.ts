import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  expectForeignKeyDenied,
  expectNoRowsAffected,
  expectRlsDenied,
} from "./setup/assertions";
import { createSecurityTestContext, securityUuid } from "./setup/fixtures";
import type { SecurityTestContext } from "./setup/types";

describe("matches RLS through Supabase JS", () => {
  let context: SecurityTestContext;

  beforeAll(async () => {
    context = await createSecurityTestContext("matches");
  });

  afterAll(async () => context.cleanup());

  it("returns only the signed-in user's match", async () => {
    const result = await context.userAClient
      .from("matches")
      .select("id, team_id, season_id")
      .order("id");

    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      {
        id: context.ids.matchA,
        team_id: context.ids.teamA,
        season_id: context.ids.seasonA,
      },
    ]);
  });

  it("allows own-tenant match insert, update, and eligible delete", async () => {
    const matchId = securityUuid(context.namespace, "owned-match");
    const insert = await context.userAClient
      .from("matches")
      .insert({
        id: matchId,
        team_id: context.ids.teamA,
        season_id: context.ids.seasonA,
        opponent_name: "Added Opponent A",
        kickoff_at: "2026-09-10T18:00:00Z",
        home_away: "neutral",
      })
      .select("id, team_id, season_id")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data).toEqual({
      id: matchId,
      team_id: context.ids.teamA,
      season_id: context.ids.seasonA,
    });

    const update = await context.userAClient
      .from("matches")
      .update({ notes: "Owned update" })
      .eq("id", matchId)
      .select("id, notes")
      .single();
    expect(update.data).toEqual({ id: matchId, notes: "Owned update" });

    const remove = await context.userAClient
      .from("matches")
      .delete()
      .eq("id", matchId)
      .select("id");
    expect(remove.error).toBeNull();
    expect(remove.data).toEqual([{ id: matchId }]);
  });

  it("allows cancelling an owned scheduled match and preserves null scores", async () => {
    const matchId = securityUuid(context.namespace, "cancelled-match");
    const insert = await context.userAClient.from("matches").insert({
      id: matchId,
      team_id: context.ids.teamA,
      season_id: context.ids.seasonA,
      opponent_name: "Cancelled Opponent A",
      kickoff_at: "2026-09-10T19:00:00Z",
      home_away: "home",
    });
    expect(insert.error).toBeNull();

    const cancellation = await context.userAClient
      .from("matches")
      .update({
        status: "cancelled",
        team_score: null,
        opponent_score: null,
      })
      .eq("id", matchId)
      .select("id, status, team_score, opponent_score")
      .single();

    expect(cancellation.error).toBeNull();
    expect(cancellation.data).toEqual({
      id: matchId,
      status: "cancelled",
      team_score: null,
      opponent_score: null,
    });
  });

  it("blocks deletion when a match has call-ups or events", async () => {
    const remove = await context.userAClient
      .from("matches")
      .delete()
      .eq("id", context.ids.matchA)
      .select("id");

    expectNoRowsAffected(remove);

    const callup = await context.userAClient
      .from("callups")
      .select("id")
      .eq("id", context.ids.callupA)
      .single();
    const event = await context.userAClient
      .from("match_events")
      .select("id")
      .eq("id", context.ids.eventA)
      .single();
    expect(callup.error).toBeNull();
    expect(event.error).toBeNull();
  });

  it("blocks foreign match insert, update, and delete", async () => {
    const insert = await context.userAClient.from("matches").insert({
      team_id: context.ids.teamB,
      season_id: context.ids.seasonB,
      opponent_name: "Foreign Match Attack",
      kickoff_at: "2026-09-11T18:00:00Z",
      home_away: "away",
    });
    const update = await context.userAClient
      .from("matches")
      .update({ notes: "Foreign Update" })
      .eq("id", context.ids.matchB)
      .select("id");
    const remove = await context.userAClient
      .from("matches")
      .delete()
      .eq("id", context.ids.matchB)
      .select("id");

    expectRlsDenied(insert);
    expectNoRowsAffected(update);
    expectNoRowsAffected(remove);
  });

  it("rejects moving an owned match into the foreign team", async () => {
    const result = await context.userAClient
      .from("matches")
      .update({
        team_id: context.ids.teamB,
        season_id: context.ids.seasonB,
      })
      .eq("id", context.ids.matchA)
      .select("id");

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe("55000");
  });

  it("rejects Team A plus Season B through the composite foreign key", async () => {
    const result = await context.userAClient.from("matches").insert({
      team_id: context.ids.teamA,
      season_id: context.ids.seasonB,
      opponent_name: "Mixed Season Attack",
      kickoff_at: "2026-09-12T18:00:00Z",
      home_away: "home",
    });

    expectForeignKeyDenied(result);
  });
});
