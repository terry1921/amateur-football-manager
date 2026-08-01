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

  it("completes an owned match with normalized events through one RPC", async () => {
    const completion = await context.userAClient.rpc(
      "complete_match_with_events",
      {
        target_match_id: context.ids.matchA,
        final_team_score: 1,
        final_opponent_score: 0,
        event_rows: [
          { type: "goal", player_id: context.ids.playerA, minute: 12 },
        ],
      },
    );
    expect(completion.error).toBeNull();
    expect(completion.data).toEqual({
      match_id: context.ids.matchA,
      status: "completed",
      team_score: 1,
      opponent_score: 0,
      event_count: 1,
    });

    const events = await context.userAClient
      .from("match_events")
      .select("type, player_id, minute")
      .eq("match_id", context.ids.matchA);
    expect(events.error).toBeNull();
    expect(events.data).toEqual([
      { type: "goal", player_id: context.ids.playerA, minute: 12 },
    ]);
  });

  it("completes an owned match with a goal and yellow card together", async () => {
    const matchId = securityUuid(context.namespace, "goal-yellow-match");
    const insert = await context.userAClient.from("matches").insert({
      id: matchId,
      team_id: context.ids.teamA,
      season_id: context.ids.seasonA,
      opponent_name: "Goal Yellow Opponent",
      kickoff_at: "2026-09-10T20:30:00Z",
      home_away: "home",
    });
    expect(insert.error).toBeNull();

    const callup = await context.userAClient.from("callups").insert([
      {
        team_id: context.ids.teamA,
        match_id: matchId,
        player_id: context.ids.playerA,
      },
      {
        team_id: context.ids.teamA,
        match_id: matchId,
        player_id: context.ids.playerA2,
      },
    ]);
    expect(callup.error).toBeNull();

    const completion = await context.userAClient.rpc(
      "complete_match_with_events",
      {
        target_match_id: matchId,
        final_team_score: 1,
        final_opponent_score: 0,
        event_rows: [
          { type: "goal", player_id: context.ids.playerA, minute: 12 },
          {
            type: "yellow_card",
            player_id: context.ids.playerA2,
            minute: 80,
          },
        ],
      },
    );
    expect(completion.error).toBeNull();
    expect(completion.data).toMatchObject({
      match_id: matchId,
      status: "completed",
      team_score: 1,
      opponent_score: 0,
      event_count: 2,
    });
  });

  it("rolls back score and events when goal reconciliation fails", async () => {
    const matchId = securityUuid(context.namespace, "atomic-mismatch");
    const insert = await context.userAClient.from("matches").insert({
      id: matchId,
      team_id: context.ids.teamA,
      season_id: context.ids.seasonA,
      opponent_name: "Mismatch Opponent",
      kickoff_at: "2026-09-10T21:00:00Z",
      home_away: "home",
    });
    expect(insert.error).toBeNull();
    const callup = await context.userAClient.from("callups").insert({
      team_id: context.ids.teamA,
      match_id: matchId,
      player_id: context.ids.playerA2,
    });
    expect(callup.error).toBeNull();

    const completion = await context.userAClient.rpc(
      "complete_match_with_events",
      {
        target_match_id: matchId,
        final_team_score: 2,
        final_opponent_score: 1,
        event_rows: [
          { type: "goal", player_id: context.ids.playerA2, minute: 30 },
        ],
      },
    );
    expect(completion.data).toBeNull();
    expect(completion.error?.code).toBe("22023");

    const unchanged = await context.userAClient
      .from("matches")
      .select("status, team_score, opponent_score")
      .eq("id", matchId)
      .single();
    expect(unchanged.data).toEqual({
      status: "scheduled",
      team_score: null,
      opponent_score: null,
    });
    const events = await context.userAClient
      .from("match_events")
      .select("id")
      .eq("match_id", matchId);
    expect(events.data).toEqual([]);
  });

  it("rejects a foreign match completion through the database function", async () => {
    const completion = await context.userAClient.rpc(
      "complete_match_with_events",
      {
        target_match_id: context.ids.matchB,
        final_team_score: 0,
        final_opponent_score: 0,
        event_rows: [],
      },
    );
    expect(completion.data).toBeNull();
    expect(completion.error?.code).toBe("P0002");
  });

  it("allows an owner to complete a scheduled match atomically and blocks a foreign result", async () => {
    const matchId = securityUuid(context.namespace, "completed-match");
    const insert = await context.userAClient.from("matches").insert({
      id: matchId,
      team_id: context.ids.teamA,
      season_id: context.ids.seasonA,
      opponent_name: "Completed Opponent A",
      kickoff_at: "2026-09-10T20:00:00Z",
      home_away: "away",
    });
    expect(insert.error).toBeNull();

    const bypass = await context.userAClient
      .from("matches")
      .update({
        status: "completed",
        team_score: 1,
        opponent_score: 0,
      })
      .eq("id", matchId)
      .eq("status", "scheduled")
      .select("id");
    expect(bypass.data).toBeNull();
    expect(bypass.error?.code).toBe("55000");

    const callup = await context.userAClient.from("callups").insert({
      team_id: context.ids.teamA,
      match_id: matchId,
      player_id: context.ids.playerA,
    });
    expect(callup.error).toBeNull();

    const completion = await context.userAClient.rpc(
      "complete_match_with_events",
      {
        target_match_id: matchId,
        final_team_score: 1,
        final_opponent_score: 0,
        event_rows: [
          { type: "goal", player_id: context.ids.playerA, minute: 30 },
        ],
      },
    );
    expect(completion.error).toBeNull();
    expect(completion.data).toMatchObject({
      match_id: matchId,
      status: "completed",
      team_score: 1,
      opponent_score: 0,
    });

    const foreignCompletion = await context.userAClient
      .from("matches")
      .update({
        status: "completed",
        team_score: 1,
        opponent_score: 0,
      })
      .eq("id", context.ids.matchB)
      .eq("status", "scheduled")
      .select("id");
    expectNoRowsAffected(foreignCompletion);
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
      .eq("match_id", context.ids.matchA)
      .maybeSingle();
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
