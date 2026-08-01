import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { expectNoRowsAffected, expectRlsDenied } from "./setup/assertions";
import { createSecurityTestContext, securityUuid } from "./setup/fixtures";
import type { SecurityTestContext } from "./setup/types";

describe("teams RLS through Supabase JS", () => {
  let context: SecurityTestContext;

  beforeAll(async () => {
    context = await createSecurityTestContext("teams");
  });

  afterAll(async () => {
    await context.cleanup();
  });

  it("returns each authenticated owner's team and hides the foreign UUID", async () => {
    const userAResult = await context.userAClient
      .from("teams")
      .select("id, owner_id")
      .order("id");
    const userBResult = await context.userBClient
      .from("teams")
      .select("id, owner_id")
      .order("id");

    expect(userAResult.error).toBeNull();
    expect(userAResult.data).toEqual([
      { id: context.ids.teamA, owner_id: context.ids.userA },
    ]);
    expect(userBResult.error).toBeNull();
    expect(userBResult.data).toEqual([
      { id: context.ids.teamB, owner_id: context.ids.userB },
    ]);
  });

  it("allows a new owner to insert, update, and delete their own eligible team", async () => {
    const teamCId = securityUuid(context.namespace, "owned-team-c");

    const insertC = await context.userCClient
      .from("teams")
      .insert({
        id: teamCId,
        owner_id: context.ids.userC,
        name: "User C Added Team",
        slug: "security-teams-owned-c",
      })
      .select("id, owner_id, name")
      .single();

    expect(insertC.error).toBeNull();
    expect(insertC.data).toEqual({
      id: teamCId,
      owner_id: context.ids.userC,
      name: "User C Added Team",
    });

    const updateC = await context.userCClient
      .from("teams")
      .update({ name: "User C Updated Team" })
      .eq("id", teamCId)
      .select("id, name")
      .single();

    expect(updateC.data).toEqual({ id: teamCId, name: "User C Updated Team" });

    const deleteC = await context.userCClient
      .from("teams")
      .delete()
      .eq("id", teamCId)
      .select("id");

    expect(deleteC.error).toBeNull();
    expect(deleteC.data).toEqual([{ id: teamCId }]);
  });

  it("rejects owner spoofing on insert for both users", async () => {
    const spoofByA = await context.userAClient.from("teams").insert({
      owner_id: context.ids.userB,
      name: "Spoofed by A",
      slug: "security-teams-spoof-a",
    });
    const spoofByB = await context.userBClient.from("teams").insert({
      owner_id: context.ids.userA,
      name: "Spoofed by B",
      slug: "security-teams-spoof-b",
    });

    expectRlsDenied(spoofByA);
    expectRlsDenied(spoofByB);
  });

  it("makes foreign updates and deletes no-ops even with the real IDs", async () => {
    const updateByA = await context.userAClient
      .from("teams")
      .update({ name: "Attacked by A" })
      .eq("id", context.ids.teamB)
      .select("id");
    const deleteByA = await context.userAClient
      .from("teams")
      .delete()
      .eq("id", context.ids.teamB)
      .select("id");
    const updateByB = await context.userBClient
      .from("teams")
      .update({ name: "Attacked by B" })
      .eq("id", context.ids.teamA)
      .select("id");

    expectNoRowsAffected(updateByA);
    expectNoRowsAffected(deleteByA);
    expectNoRowsAffected(updateByB);

    const unchanged = await context.userBClient
      .from("teams")
      .select("name")
      .eq("id", context.ids.teamB)
      .single();
    expect(unchanged.data?.name).toBe("Security Team B");
  });

  it("rejects attempts to move team ownership through WITH CHECK", async () => {
    const moveByA = await context.userAClient
      .from("teams")
      .update({ owner_id: context.ids.userB })
      .eq("id", context.ids.teamA)
      .select("id");
    const moveByB = await context.userBClient
      .from("teams")
      .update({ owner_id: context.ids.userA })
      .eq("id", context.ids.teamB)
      .select("id");

    expectRlsDenied(moveByA);
    expectRlsDenied(moveByB);
  });
});
