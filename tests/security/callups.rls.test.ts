import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  expectForeignKeyDenied,
  expectNoRowsAffected,
  expectRlsDenied,
} from "./setup/assertions";
import { createSecurityTestContext, securityUuid } from "./setup/fixtures";
import type { SecurityTestContext } from "./setup/types";

describe("call-ups RLS through Supabase JS", () => {
  let context: SecurityTestContext;

  beforeAll(async () => {
    context = await createSecurityTestContext("callups");
  });

  afterAll(async () => context.cleanup());

  it("returns only the call-up belonging to the signed-in user's match", async () => {
    const result = await context.userAClient
      .from("callups")
      .select("id, team_id, match_id, player_id")
      .order("id");

    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      {
        id: context.ids.callupA,
        team_id: context.ids.teamA,
        match_id: context.ids.matchA,
        player_id: context.ids.playerA,
      },
    ]);
  });

  it("allows own-match call-up insert, update, and eligible delete", async () => {
    const callupId = securityUuid(context.namespace, "owned-callup");
    const insert = await context.userAClient
      .from("callups")
      .insert({
        id: callupId,
        team_id: context.ids.teamA,
        match_id: context.ids.matchA,
        player_id: context.ids.playerA2,
      })
      .select("id, team_id, status")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data?.team_id).toBe(context.ids.teamA);

    const update = await context.userAClient
      .from("callups")
      .update({ status: "confirmed" })
      .eq("id", callupId)
      .select("id, status")
      .single();
    expect(update.data).toEqual({ id: callupId, status: "confirmed" });

    const remove = await context.userAClient
      .from("callups")
      .delete()
      .eq("id", callupId)
      .select("id");
    expect(remove.error).toBeNull();
    expect(remove.data).toEqual([{ id: callupId }]);
  });

  it("blocks foreign call-up update and delete by guessed ID", async () => {
    const update = await context.userAClient
      .from("callups")
      .update({ status: "declined" })
      .eq("id", context.ids.callupB)
      .select("id");
    const remove = await context.userAClient
      .from("callups")
      .delete()
      .eq("id", context.ids.callupB)
      .select("id");

    expectNoRowsAffected(update);
    expectNoRowsAffected(remove);
  });

  it("rejects Match B plus Player A through match-derived RLS", async () => {
    const result = await context.userAClient.from("callups").insert({
      team_id: context.ids.teamA,
      match_id: context.ids.matchB,
      player_id: context.ids.playerA,
    });

    expectRlsDenied(result);
  });

  it("rejects Match A plus Player B through tenant integrity constraints", async () => {
    const result = await context.userAClient.from("callups").insert({
      team_id: context.ids.teamA,
      match_id: context.ids.matchA,
      player_id: context.ids.playerB,
    });

    expectForeignKeyDenied(result);
  });

  it("rejects Match B plus Player B through match-derived RLS", async () => {
    const result = await context.userAClient.from("callups").insert({
      team_id: context.ids.teamB,
      match_id: context.ids.matchB,
      player_id: context.ids.playerB,
    });

    expectRlsDenied(result);
  });

  it("rejects moving an owned call-up into the foreign match", async () => {
    const result = await context.userAClient
      .from("callups")
      .update({
        team_id: context.ids.teamB,
        match_id: context.ids.matchB,
        player_id: context.ids.playerB,
      })
      .eq("id", context.ids.callupA)
      .select("id");

    expectRlsDenied(result);
  });
});
