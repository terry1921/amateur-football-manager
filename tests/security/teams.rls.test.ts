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

  it("allows both users to insert, update, and delete their own eligible team", async () => {
    const teamAId = securityUuid(context.namespace, "owned-team-a");
    const teamBId = securityUuid(context.namespace, "owned-team-b");

    const insertA = await context.userAClient
      .from("teams")
      .insert({
        id: teamAId,
        owner_id: context.ids.userA,
        name: "User A Added Team",
        slug: "security-teams-owned-a",
      })
      .select("id, owner_id, name")
      .single();
    const insertB = await context.userBClient
      .from("teams")
      .insert({
        id: teamBId,
        owner_id: context.ids.userB,
        name: "User B Added Team",
        slug: "security-teams-owned-b",
      })
      .select("id, owner_id, name")
      .single();

    expect(insertA.error).toBeNull();
    expect(insertA.data).toEqual({
      id: teamAId,
      owner_id: context.ids.userA,
      name: "User A Added Team",
    });
    expect(insertB.error).toBeNull();
    expect(insertB.data?.owner_id).toBe(context.ids.userB);

    const updateA = await context.userAClient
      .from("teams")
      .update({ name: "User A Updated Team" })
      .eq("id", teamAId)
      .select("id, name")
      .single();
    const updateB = await context.userBClient
      .from("teams")
      .update({ name: "User B Updated Team" })
      .eq("id", teamBId)
      .select("id, name")
      .single();

    expect(updateA.data).toEqual({ id: teamAId, name: "User A Updated Team" });
    expect(updateB.data).toEqual({ id: teamBId, name: "User B Updated Team" });

    const deleteA = await context.userAClient
      .from("teams")
      .delete()
      .eq("id", teamAId)
      .select("id");
    const deleteB = await context.userBClient
      .from("teams")
      .delete()
      .eq("id", teamBId)
      .select("id");

    expect(deleteA.error).toBeNull();
    expect(deleteA.data).toEqual([{ id: teamAId }]);
    expect(deleteB.error).toBeNull();
    expect(deleteB.data).toEqual([{ id: teamBId }]);
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
