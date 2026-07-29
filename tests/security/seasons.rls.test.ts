import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { expectNoRowsAffected, expectRlsDenied } from "./setup/assertions";
import { createSecurityTestContext, securityUuid } from "./setup/fixtures";
import type { SecurityTestContext } from "./setup/types";

describe("seasons RLS through Supabase JS", () => {
  let context: SecurityTestContext;

  beforeAll(async () => {
    context = await createSecurityTestContext("seasons");
  });

  afterAll(async () => context.cleanup());

  it("returns only the signed-in user's season", async () => {
    const result = await context.userAClient
      .from("seasons")
      .select("id, team_id")
      .order("id");

    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      { id: context.ids.seasonA, team_id: context.ids.teamA },
    ]);
  });

  it("allows own-tenant season insert, update, and eligible delete", async () => {
    const seasonId = securityUuid(context.namespace, "owned-season");
    const insert = await context.userAClient
      .from("seasons")
      .insert({
        id: seasonId,
        team_id: context.ids.teamA,
        name: "Added Season A",
      })
      .select("id, team_id, name")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data?.team_id).toBe(context.ids.teamA);

    const update = await context.userAClient
      .from("seasons")
      .update({ name: "Updated Season A" })
      .eq("id", seasonId)
      .select("id, name")
      .single();
    expect(update.data).toEqual({ id: seasonId, name: "Updated Season A" });

    const remove = await context.userAClient
      .from("seasons")
      .delete()
      .eq("id", seasonId)
      .select("id");
    expect(remove.error).toBeNull();
    expect(remove.data).toEqual([{ id: seasonId }]);
  });

  it("blocks foreign inserts, updates, and deletes using known UUIDs", async () => {
    const insert = await context.userAClient.from("seasons").insert({
      team_id: context.ids.teamB,
      name: "Foreign Season Attack",
    });
    const update = await context.userAClient
      .from("seasons")
      .update({ name: "Foreign Update" })
      .eq("id", context.ids.seasonB)
      .select("id");
    const remove = await context.userAClient
      .from("seasons")
      .delete()
      .eq("id", context.ids.seasonB)
      .select("id");

    expectRlsDenied(insert);
    expectNoRowsAffected(update);
    expectNoRowsAffected(remove);
  });

  it("rejects moving an owned season into the foreign team", async () => {
    const result = await context.userAClient
      .from("seasons")
      .update({ team_id: context.ids.teamB })
      .eq("id", context.ids.seasonA)
      .select("id");

    expectRlsDenied(result);
  });
});
