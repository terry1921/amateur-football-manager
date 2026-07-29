import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { expectNoRowsAffected, expectRlsDenied } from "./setup/assertions";
import { createSecurityTestContext, securityUuid } from "./setup/fixtures";
import type { SecurityTestContext } from "./setup/types";

describe("cross-tenant query-shape attacks through Supabase JS", () => {
  let context: SecurityTestContext;

  beforeAll(async () => {
    context = await createSecurityTestContext("cross-tenant");
  });

  afterAll(async () => context.cleanup());

  it("hides every foreign resource when User A guesses its exact UUID", async () => {
    const results = await Promise.all([
      context.userAClient
        .from("teams")
        .select("id")
        .eq("id", context.ids.teamB),
      context.userAClient
        .from("seasons")
        .select("id")
        .eq("id", context.ids.seasonB),
      context.userAClient
        .from("players")
        .select("id")
        .eq("id", context.ids.playerB),
      context.userAClient
        .from("matches")
        .select("id")
        .eq("id", context.ids.matchB),
      context.userAClient
        .from("callups")
        .select("id")
        .eq("id", context.ids.callupB),
      context.userAClient
        .from("match_events")
        .select("id")
        .eq("id", context.ids.eventB),
    ]);

    results.forEach(expectNoRowsAffected);
  });

  it("keeps RLS effective across broad and manipulated player filters", async () => {
    const expectedIds = [context.ids.playerA, context.ids.playerA2].sort();
    const results = await Promise.all([
      context.userAClient.from("players").select("id, team_id"),
      context.userAClient
        .from("players")
        .select("id, team_id")
        .neq("id", securityUuid(context.namespace, "missing-player")),
      context.userAClient
        .from("players")
        .select("id, team_id")
        .in("id", [context.ids.playerA, context.ids.playerB]),
      context.userAClient
        .from("players")
        .select("id, team_id")
        .or(`id.eq.${context.ids.playerA},id.eq.${context.ids.playerB}`),
      context.userAClient
        .from("players")
        .select("id, team_id")
        .not("id", "eq", securityUuid(context.namespace, "missing-player-2")),
      context.userAClient
        .from("players")
        .select("id, team_id")
        .order("id")
        .range(0, 50),
    ]);

    for (const result of results) {
      expect(result.error).toBeNull();
      expect(
        result.data?.every(({ team_id }) => team_id === context.ids.teamA),
      ).toBe(true);
      expect(result.data?.map(({ id }) => id).sort()).toEqual(
        result.data?.length === 1 ? [context.ids.playerA] : expectedIds,
      );
    }
  });

  it("limits a bulk update to the authenticated tenant", async () => {
    const result = await context.userAClient
      .from("players")
      .update({ status: "inactive" })
      .eq("status", "active")
      .select("id, team_id, status");

    expect(result.error).toBeNull();
    expect(result.data?.map(({ id }) => id).sort()).toEqual(
      [context.ids.playerA, context.ids.playerA2].sort(),
    );
    expect(
      result.data?.every(({ team_id }) => team_id === context.ids.teamA),
    ).toBe(true);

    const foreignPlayers = await context.userBClient
      .from("players")
      .select("id, status")
      .order("id");
    expect(
      foreignPlayers.data?.every(({ status }) => status === "active"),
    ).toBe(true);
  });

  it("fails a mixed-tenant bulk insert atomically", async () => {
    const ownPlayerId = securityUuid(context.namespace, "bulk-own-player");
    const foreignPlayerId = securityUuid(
      context.namespace,
      "bulk-foreign-player",
    );
    const insert = await context.userAClient.from("players").insert([
      {
        id: ownPlayerId,
        team_id: context.ids.teamA,
        first_name: "Bulk Own Player",
        position: "MID",
      },
      {
        id: foreignPlayerId,
        team_id: context.ids.teamB,
        first_name: "Bulk Foreign Player",
        position: "MID",
      },
    ]);

    expectRlsDenied(insert);

    const ownRow = await context.userAClient
      .from("players")
      .select("id")
      .eq("id", ownPlayerId);
    expect(ownRow.data).toEqual([]);
  });

  it("limits a bulk delete to owned matches", async () => {
    const ownMatchA = securityUuid(context.namespace, "bulk-match-a-1");
    const ownMatchB = securityUuid(context.namespace, "bulk-match-a-2");
    const foreignMatch = securityUuid(context.namespace, "bulk-match-b");
    const setup = await context.adminSetupClient.from("matches").insert([
      {
        id: ownMatchA,
        team_id: context.ids.teamA,
        season_id: context.ids.seasonA,
        opponent_name: "Bulk Opponent A1",
        kickoff_at: "2026-09-21T18:00:00Z",
        home_away: "home",
      },
      {
        id: ownMatchB,
        team_id: context.ids.teamA,
        season_id: context.ids.seasonA,
        opponent_name: "Bulk Opponent A2",
        kickoff_at: "2026-09-22T18:00:00Z",
        home_away: "home",
      },
      {
        id: foreignMatch,
        team_id: context.ids.teamB,
        season_id: context.ids.seasonB,
        opponent_name: "Bulk Opponent B",
        kickoff_at: "2026-09-23T18:00:00Z",
        home_away: "away",
      },
    ]);
    expect(setup.error).toBeNull();

    const remove = await context.userAClient
      .from("matches")
      .delete()
      .in("id", [ownMatchA, ownMatchB, foreignMatch])
      .select("id, team_id");
    expect(remove.error).toBeNull();
    expect(remove.data?.map(({ id }) => id).sort()).toEqual(
      [ownMatchA, ownMatchB].sort(),
    );
    expect(
      remove.data?.every(({ team_id }) => team_id === context.ids.teamA),
    ).toBe(true);

    const foreignRow = await context.userBClient
      .from("matches")
      .select("id")
      .eq("id", foreignMatch)
      .single();
    expect(foreignRow.data?.id).toBe(foreignMatch);
  });

  it("does not leak foreign rows through nested relationship expansion", async () => {
    const teams = await context.userAClient
      .from("teams")
      .select("id, players(id, team_id)");
    const seasons = await context.userAClient
      .from("seasons")
      .select("id, matches(id, team_id)");
    const matches = await context.userAClient
      .from("matches")
      .select("id, callups(id, team_id), match_events(id, team_id)");

    expect(teams.error).toBeNull();
    expect(teams.data).toHaveLength(1);
    expect(teams.data?.[0].id).toBe(context.ids.teamA);
    expect(
      teams.data?.[0].players.every(
        ({ team_id }) => team_id === context.ids.teamA,
      ),
    ).toBe(true);

    expect(seasons.error).toBeNull();
    expect(seasons.data).toHaveLength(1);
    expect(seasons.data?.[0].id).toBe(context.ids.seasonA);
    expect(seasons.data?.[0].matches).toEqual([
      { id: context.ids.matchA, team_id: context.ids.teamA },
    ]);

    expect(matches.error).toBeNull();
    expect(matches.data).toHaveLength(1);
    expect(matches.data?.[0].id).toBe(context.ids.matchA);
    expect(matches.data?.[0].callups).toEqual([
      { id: context.ids.callupA, team_id: context.ids.teamA },
    ]);
    expect(matches.data?.[0].match_events).toEqual([
      { id: context.ids.eventA, team_id: context.ids.teamA },
    ]);
  });
});
