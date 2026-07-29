import { afterAll, beforeAll, describe, it } from "vitest";
import { expectRlsDenied } from "./setup/assertions";
import { createSecurityTestContext } from "./setup/fixtures";
import type { SecurityTestContext } from "./setup/types";

describe("anonymous access through Supabase JS", () => {
  let context: SecurityTestContext;

  beforeAll(async () => {
    context = await createSecurityTestContext("anonymous");
  });

  afterAll(async () => context.cleanup());

  it("blocks SELECT, INSERT, UPDATE, and DELETE on teams", async () => {
    expectRlsDenied(await context.anonymousClient.from("teams").select("id"));
    expectRlsDenied(
      await context.anonymousClient.from("teams").insert({
        owner_id: context.ids.userA,
        name: "Anonymous Team",
        slug: "security-anonymous-team",
      }),
    );
    expectRlsDenied(
      await context.anonymousClient
        .from("teams")
        .update({ name: "Anonymous Update" })
        .eq("id", context.ids.teamA),
    );
    expectRlsDenied(
      await context.anonymousClient
        .from("teams")
        .delete()
        .eq("id", context.ids.teamA),
    );
  });

  it("blocks SELECT, INSERT, UPDATE, and DELETE on seasons", async () => {
    expectRlsDenied(await context.anonymousClient.from("seasons").select("id"));
    expectRlsDenied(
      await context.anonymousClient.from("seasons").insert({
        team_id: context.ids.teamA,
        name: "Anonymous Season",
      }),
    );
    expectRlsDenied(
      await context.anonymousClient
        .from("seasons")
        .update({ name: "Anonymous Update" })
        .eq("id", context.ids.seasonA),
    );
    expectRlsDenied(
      await context.anonymousClient
        .from("seasons")
        .delete()
        .eq("id", context.ids.seasonA),
    );
  });

  it("blocks SELECT, INSERT, UPDATE, and DELETE on players", async () => {
    expectRlsDenied(await context.anonymousClient.from("players").select("id"));
    expectRlsDenied(
      await context.anonymousClient.from("players").insert({
        team_id: context.ids.teamA,
        first_name: "Anonymous Player",
        position: "GK",
      }),
    );
    expectRlsDenied(
      await context.anonymousClient
        .from("players")
        .update({ first_name: "Anonymous Update" })
        .eq("id", context.ids.playerA),
    );
    expectRlsDenied(
      await context.anonymousClient
        .from("players")
        .delete()
        .eq("id", context.ids.playerA),
    );
  });

  it("blocks SELECT, INSERT, UPDATE, and DELETE on matches", async () => {
    expectRlsDenied(await context.anonymousClient.from("matches").select("id"));
    expectRlsDenied(
      await context.anonymousClient.from("matches").insert({
        team_id: context.ids.teamA,
        season_id: context.ids.seasonA,
        opponent_name: "Anonymous Opponent",
        kickoff_at: "2026-09-20T18:00:00Z",
        home_away: "home",
      }),
    );
    expectRlsDenied(
      await context.anonymousClient
        .from("matches")
        .update({ notes: "Anonymous Update" })
        .eq("id", context.ids.matchA),
    );
    expectRlsDenied(
      await context.anonymousClient
        .from("matches")
        .delete()
        .eq("id", context.ids.matchA),
    );
  });

  it("blocks SELECT, INSERT, UPDATE, and DELETE on call-ups", async () => {
    expectRlsDenied(await context.anonymousClient.from("callups").select("id"));
    expectRlsDenied(
      await context.anonymousClient.from("callups").insert({
        team_id: context.ids.teamA,
        match_id: context.ids.matchA,
        player_id: context.ids.playerA2,
      }),
    );
    expectRlsDenied(
      await context.anonymousClient
        .from("callups")
        .update({ status: "confirmed" })
        .eq("id", context.ids.callupA),
    );
    expectRlsDenied(
      await context.anonymousClient
        .from("callups")
        .delete()
        .eq("id", context.ids.callupA),
    );
  });

  it("blocks SELECT, INSERT, UPDATE, and DELETE on match events", async () => {
    expectRlsDenied(
      await context.anonymousClient.from("match_events").select("id"),
    );
    expectRlsDenied(
      await context.anonymousClient.from("match_events").insert({
        team_id: context.ids.teamA,
        match_id: context.ids.matchA,
        player_id: context.ids.playerA2,
        type: "goal",
      }),
    );
    expectRlsDenied(
      await context.anonymousClient
        .from("match_events")
        .update({ minute: 90 })
        .eq("id", context.ids.eventA),
    );
    expectRlsDenied(
      await context.anonymousClient
        .from("match_events")
        .delete()
        .eq("id", context.ids.eventA),
    );
  });
});
