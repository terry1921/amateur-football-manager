import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  expectForeignKeyDenied,
  expectNoRowsAffected,
  expectRlsDenied,
} from "./setup/assertions";
import { createSecurityTestContext, securityUuid } from "./setup/fixtures";
import type { SecurityTestContext } from "./setup/types";

describe("match-events RLS through Supabase JS", () => {
  let context: SecurityTestContext;

  beforeAll(async () => {
    context = await createSecurityTestContext("match-events");
  });

  afterAll(async () => context.cleanup());

  it("returns only the event belonging to the signed-in user's match", async () => {
    const result = await context.userAClient
      .from("match_events")
      .select("id, team_id, match_id, player_id")
      .order("id");

    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      {
        id: context.ids.eventA,
        team_id: context.ids.teamA,
        match_id: context.ids.matchA,
        player_id: context.ids.playerA,
      },
    ]);
  });

  it("allows own-match event insert, update, and eligible delete", async () => {
    const eventId = securityUuid(context.namespace, "owned-event");
    const insert = await context.userAClient
      .from("match_events")
      .insert({
        id: eventId,
        team_id: context.ids.teamA,
        match_id: context.ids.matchA,
        player_id: context.ids.playerA,
        type: "red_card",
        minute: 70,
      })
      .select("id, team_id, minute")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data?.team_id).toBe(context.ids.teamA);

    const update = await context.userAClient
      .from("match_events")
      .update({ minute: 71 })
      .eq("id", eventId)
      .select("id, minute")
      .single();
    expect(update.data).toEqual({ id: eventId, minute: 71 });

    const remove = await context.userAClient
      .from("match_events")
      .delete()
      .eq("id", eventId)
      .select("id");
    expect(remove.error).toBeNull();
    expect(remove.data).toEqual([{ id: eventId }]);
  });

  it("blocks foreign event update and delete by guessed ID", async () => {
    const update = await context.userAClient
      .from("match_events")
      .update({ minute: 99 })
      .eq("id", context.ids.eventB)
      .select("id");
    const remove = await context.userAClient
      .from("match_events")
      .delete()
      .eq("id", context.ids.eventB)
      .select("id");

    expectNoRowsAffected(update);
    expectNoRowsAffected(remove);
  });

  it("rejects Match B plus Player A through match-derived RLS", async () => {
    const result = await context.userAClient.from("match_events").insert({
      team_id: context.ids.teamA,
      match_id: context.ids.matchB,
      player_id: context.ids.playerA,
      type: "goal",
      minute: 10,
    });

    expectRlsDenied(result);
  });

  it("rejects Match A plus Player B through tenant integrity constraints", async () => {
    const result = await context.userAClient.from("match_events").insert({
      team_id: context.ids.teamA,
      match_id: context.ids.matchA,
      player_id: context.ids.playerB,
      type: "goal",
      minute: 10,
    });

    expectForeignKeyDenied(result);
  });

  it("rejects Match B plus Player B through match-derived RLS", async () => {
    const result = await context.userAClient.from("match_events").insert({
      team_id: context.ids.teamB,
      match_id: context.ids.matchB,
      player_id: context.ids.playerB,
      type: "goal",
      minute: 10,
    });

    expectRlsDenied(result);
  });

  it("rejects a foreign assisting player through tenant integrity constraints", async () => {
    const result = await context.userAClient.from("match_events").insert({
      team_id: context.ids.teamA,
      match_id: context.ids.matchA,
      player_id: context.ids.playerA2,
      related_player_id: context.ids.playerB,
      type: "goal",
      minute: 10,
    });

    expectForeignKeyDenied(result);
  });

  it("rejects moving an owned event into the foreign match", async () => {
    const result = await context.userAClient
      .from("match_events")
      .update({
        team_id: context.ids.teamB,
        match_id: context.ids.matchB,
        player_id: context.ids.playerB,
      })
      .eq("id", context.ids.eventA)
      .select("id");

    expectRlsDenied(result);
  });
});
