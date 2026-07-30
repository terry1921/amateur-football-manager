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

  it("allows own-tenant season insert and update but preserves it from deletion", async () => {
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
    expectRlsDenied(remove);
  });

  it("enforces case-insensitive season names inside one team", async () => {
    const first = await context.userAClient.from("seasons").insert({
      team_id: context.ids.teamA,
      name: "Apertura 2027",
    });
    const duplicate = await context.userAClient.from("seasons").insert({
      team_id: context.ids.teamA,
      name: "  APERTURA 2027  ",
    });

    expect(first.error).toBeNull();
    expect(duplicate.error?.code).toBe("23505");
  });

  it("atomically activates an owned draft and completes the previous active season", async () => {
    const previousId = securityUuid(context.namespace, "previous-active");
    const nextId = securityUuid(context.namespace, "next-active");
    await context.userAClient.from("seasons").insert([
      {
        id: previousId,
        team_id: context.ids.teamA,
        name: "Previous Active",
        status: "active",
      },
      {
        id: nextId,
        team_id: context.ids.teamA,
        name: "Next Active",
        status: "draft",
      },
    ]);

    const activation = await context.userAClient.rpc("activate_season", {
      target_season_id: nextId,
    });
    const seasons = await context.userAClient
      .from("seasons")
      .select("id, status")
      .in("id", [previousId, nextId])
      .order("id");

    expect(activation.error).toBeNull();
    expect(seasons.error).toBeNull();
    expect(seasons.data).toEqual(
      [
        { id: previousId, status: "completed" },
        { id: nextId, status: "active" },
      ].sort((a, b) => a.id.localeCompare(b.id)),
    );
  });

  it("cannot activate another tenant's known season UUID", async () => {
    const result = await context.userAClient.rpc("activate_season", {
      target_season_id: context.ids.seasonB,
    });

    expect(result.error?.code).toBe("P0002");
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
    expectRlsDenied(remove);
  });

  it("rejects moving an owned season into the foreign team", async () => {
    const result = await context.userAClient
      .from("seasons")
      .update({ team_id: context.ids.teamB })
      .eq("id", context.ids.seasonA)
      .select("id");

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe("55000");
  });
});
