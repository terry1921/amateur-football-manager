import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { expectNoRowsAffected, expectRlsDenied } from "./setup/assertions";
import { createSecurityTestContext, securityUuid } from "./setup/fixtures";
import type { SecurityTestContext } from "./setup/types";

describe("players RLS through Supabase JS", () => {
  let context: SecurityTestContext;

  beforeAll(async () => {
    context = await createSecurityTestContext("players");
  });

  afterAll(async () => context.cleanup());

  it("broadly selects only the signed-in user's players", async () => {
    const result = await context.userAClient
      .from("players")
      .select("id, team_id")
      .order("id");

    expect(result.error).toBeNull();
    expect(result.data?.map(({ team_id }) => team_id)).toEqual([
      context.ids.teamA,
      context.ids.teamA,
    ]);
    expect(result.data?.map(({ id }) => id).sort()).toEqual(
      [context.ids.playerA, context.ids.playerA2].sort(),
    );
  });

  it("allows own-tenant player insert, update, deactivate, and eligible delete", async () => {
    const playerId = securityUuid(context.namespace, "owned-player");
    const insert = await context.userAClient
      .from("players")
      .insert({
        id: playerId,
        team_id: context.ids.teamA,
        first_name: "Added Player A",
        position: "GK",
      })
      .select("id, team_id")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data).toEqual({ id: playerId, team_id: context.ids.teamA });

    const update = await context.userAClient
      .from("players")
      .update({ first_name: "Updated Player A", status: "inactive" })
      .eq("id", playerId)
      .select("id, first_name, status")
      .single();
    expect(update.data).toEqual({
      id: playerId,
      first_name: "Updated Player A",
      status: "inactive",
    });

    const remove = await context.userAClient
      .from("players")
      .delete()
      .eq("id", playerId)
      .select("id");
    expect(remove.error).toBeNull();
    expect(remove.data).toEqual([{ id: playerId }]);
  });

  it("blocks foreign insert, update, deactivation, and delete", async () => {
    const insert = await context.userAClient.from("players").insert({
      team_id: context.ids.teamB,
      first_name: "Foreign Player Attack",
      position: "MID",
    });
    const update = await context.userAClient
      .from("players")
      .update({ first_name: "Foreign Update", status: "inactive" })
      .eq("id", context.ids.playerB)
      .select("id");
    const remove = await context.userAClient
      .from("players")
      .delete()
      .eq("id", context.ids.playerB)
      .select("id");

    expectRlsDenied(insert);
    expectNoRowsAffected(update);
    expectNoRowsAffected(remove);

    const unchanged = await context.userBClient
      .from("players")
      .select("first_name, status")
      .eq("id", context.ids.playerB)
      .single();
    expect(unchanged.data).toEqual({
      first_name: "Security Player B",
      status: "active",
    });
  });

  it("rejects moving an owned player into the foreign team", async () => {
    const result = await context.userAClient
      .from("players")
      .update({ team_id: context.ids.teamB })
      .eq("id", context.ids.playerA)
      .select("id");

    expectRlsDenied(result);
  });
});
