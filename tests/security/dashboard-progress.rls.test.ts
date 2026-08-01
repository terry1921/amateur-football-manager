import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getTeamSetupProgress } from "@/features/dashboard/progress";
import { createSecurityTestContext } from "./setup/fixtures";
import type { SecurityClient, SecurityTestContext } from "./setup/types";

async function progressFor(client: SecurityClient) {
  const teamResult = await client
    .from("teams")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (teamResult.error || !teamResult.data) throw teamResult.error;
  const teamId = teamResult.data.id;
  const [seasons, players, matches, callups, results] = await Promise.all([
    client
      .from("seasons")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId),
    client
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId),
    client
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId),
    client
      .from("callups")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId),
    client
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("status", "completed")
      .not("team_score", "is", null)
      .not("opponent_score", "is", null),
  ]);

  for (const result of [seasons, players, matches, callups, results]) {
    if (result.error) throw result.error;
  }

  return getTeamSetupProgress({
    teamExists: true,
    seasonExists: (seasons.count ?? 0) > 0,
    playerCount: players.count ?? 0,
    matchExists: (matches.count ?? 0) > 0,
    callupExists: (callups.count ?? 0) > 0,
    completedResultExists: (results.count ?? 0) > 0,
  });
}

describe("dashboard progress tenant isolation", () => {
  let context: SecurityTestContext;

  beforeAll(async () => {
    context = await createSecurityTestContext("dashboard-progress");
    const completedByA = await context.userAClient.rpc(
      "complete_match_with_events",
      {
        target_match_id: context.ids.matchA,
        final_team_score: 1,
        final_opponent_score: 0,
        event_rows: [
          { type: "goal", player_id: context.ids.playerA, minute: 10 },
        ],
      },
    );

    if (completedByA.error) throw completedByA.error;
  });

  afterAll(async () => {
    await context.cleanup();
  });

  it("derives each user's progress only from their RLS-visible graph", async () => {
    const [userAProgress, userBProgress] = await Promise.all([
      progressFor(context.userAClient),
      progressFor(context.userBClient),
    ]);

    expect(userAProgress.completedCount).toBe(6);
    expect(userAProgress.isComplete).toBe(true);
    expect(userBProgress.completedCount).toBe(5);
    expect(userBProgress.nextStep?.id).toBe("result");
  });
});
