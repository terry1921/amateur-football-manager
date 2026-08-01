import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { readSecurityTestEnvironment } from "./local-environment.mjs";
import type {
  SecurityClient,
  SecurityFixtureIds,
  SecurityTestContext,
} from "./types";

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

export function securityUuid(namespace: string, label: string) {
  const hexadecimal = createHash("sha256")
    .update(`matchday-security:${namespace}:${label}`)
    .digest("hex")
    .slice(0, 32);

  return [
    hexadecimal.slice(0, 8),
    hexadecimal.slice(8, 12),
    hexadecimal.slice(12, 16),
    hexadecimal.slice(16, 20),
    hexadecimal.slice(20),
  ].join("-");
}

function fixtureIds(namespace: string): SecurityFixtureIds {
  return {
    userA: securityUuid(namespace, "user-a"),
    userB: securityUuid(namespace, "user-b"),
    userC: securityUuid(namespace, "user-c"),
    teamA: securityUuid(namespace, "team-a"),
    teamB: securityUuid(namespace, "team-b"),
    seasonA: securityUuid(namespace, "season-a"),
    seasonB: securityUuid(namespace, "season-b"),
    playerA: securityUuid(namespace, "player-a"),
    playerA2: securityUuid(namespace, "player-a-2"),
    playerB: securityUuid(namespace, "player-b"),
    playerB2: securityUuid(namespace, "player-b-2"),
    matchA: securityUuid(namespace, "match-a"),
    matchB: securityUuid(namespace, "match-b"),
    callupA: securityUuid(namespace, "callup-a"),
    callupB: securityUuid(namespace, "callup-b"),
    eventA: securityUuid(namespace, "event-a"),
    eventB: securityUuid(namespace, "event-b"),
  };
}

async function throwOnError(
  operation: PromiseLike<{ error: { message: string } | null }>,
  label: string,
) {
  const { error } = await operation;

  if (error) throw new Error(`${label}: ${error.message}`);
}

async function removeFixtureData(
  adminSetupClient: SecurityClient,
  ids: SecurityFixtureIds,
) {
  await adminSetupClient
    .from("teams")
    .delete()
    .in("owner_id", [ids.userA, ids.userB, ids.userC]);
  await adminSetupClient.auth.admin.deleteUser(ids.userA);
  await adminSetupClient.auth.admin.deleteUser(ids.userB);
  await adminSetupClient.auth.admin.deleteUser(ids.userC);
}

async function seedTenantGraphs(
  adminSetupClient: SecurityClient,
  namespace: string,
  ids: SecurityFixtureIds,
) {
  await throwOnError(
    adminSetupClient.from("teams").insert([
      {
        id: ids.teamA,
        owner_id: ids.userA,
        name: "Security Team A",
        slug: `security-${namespace}-team-a`,
      },
      {
        id: ids.teamB,
        owner_id: ids.userB,
        name: "Security Team B",
        slug: `security-${namespace}-team-b`,
      },
    ]),
    "create team fixtures",
  );

  await throwOnError(
    adminSetupClient.from("seasons").insert([
      { id: ids.seasonA, team_id: ids.teamA, name: "Security Season A" },
      { id: ids.seasonB, team_id: ids.teamB, name: "Security Season B" },
    ]),
    "create season fixtures",
  );

  await throwOnError(
    adminSetupClient.from("players").insert([
      {
        id: ids.playerA,
        team_id: ids.teamA,
        first_name: "Security Player A",
        position: "MID",
      },
      {
        id: ids.playerA2,
        team_id: ids.teamA,
        first_name: "Security Player A2",
        position: "DEF",
      },
      {
        id: ids.playerB,
        team_id: ids.teamB,
        first_name: "Security Player B",
        position: "FWD",
      },
      {
        id: ids.playerB2,
        team_id: ids.teamB,
        first_name: "Security Player B2",
        position: "GK",
      },
    ]),
    "create player fixtures",
  );

  await throwOnError(
    adminSetupClient.from("matches").insert([
      {
        id: ids.matchA,
        team_id: ids.teamA,
        season_id: ids.seasonA,
        opponent_name: "Security Opponent A",
        kickoff_at: "2026-09-01T18:00:00Z",
        home_away: "home",
      },
      {
        id: ids.matchB,
        team_id: ids.teamB,
        season_id: ids.seasonB,
        opponent_name: "Security Opponent B",
        kickoff_at: "2026-09-02T18:00:00Z",
        home_away: "away",
      },
    ]),
    "create match fixtures",
  );

  await throwOnError(
    adminSetupClient.from("callups").insert([
      {
        id: ids.callupA,
        team_id: ids.teamA,
        match_id: ids.matchA,
        player_id: ids.playerA,
      },
      {
        id: ids.callupB,
        team_id: ids.teamB,
        match_id: ids.matchB,
        player_id: ids.playerB,
      },
    ]),
    "create call-up fixtures",
  );

  await throwOnError(
    adminSetupClient.from("match_events").insert([
      {
        id: ids.eventA,
        team_id: ids.teamA,
        match_id: ids.matchA,
        player_id: ids.playerA,
        type: "goal",
        minute: 10,
      },
      {
        id: ids.eventB,
        team_id: ids.teamB,
        match_id: ids.matchB,
        player_id: ids.playerB,
        type: "yellow_card",
        minute: 20,
      },
    ]),
    "create match-event fixtures",
  );
}

export async function createSecurityTestContext(
  namespace: string,
): Promise<SecurityTestContext> {
  const environment = readSecurityTestEnvironment(process.env);
  const ids = fixtureIds(namespace);
  const adminSetupClient = createClient<Database>(
    environment.url,
    environment.secretKey,
    clientOptions,
  );

  await removeFixtureData(adminSetupClient, ids);

  const password = `${randomBytes(24).toString("base64url")}Aa1!`;
  const userAResult = await adminSetupClient.auth.admin.createUser({
    id: ids.userA,
    email: `security-${namespace}-a@example.test`,
    password,
    email_confirm: true,
  });

  if (userAResult.error) throw userAResult.error;

  const userBResult = await adminSetupClient.auth.admin.createUser({
    id: ids.userB,
    email: `security-${namespace}-b@example.test`,
    password,
    email_confirm: true,
  });

  if (userBResult.error) throw userBResult.error;

  const userCResult = await adminSetupClient.auth.admin.createUser({
    id: ids.userC,
    email: `security-${namespace}-c@example.test`,
    password,
    email_confirm: true,
  });

  if (userCResult.error) throw userCResult.error;

  await seedTenantGraphs(adminSetupClient, namespace, ids);

  const userAClient = createClient<Database>(
    environment.url,
    environment.publishableKey,
    clientOptions,
  );
  const userBClient = createClient<Database>(
    environment.url,
    environment.publishableKey,
    clientOptions,
  );
  const userCClient = createClient<Database>(
    environment.url,
    environment.publishableKey,
    clientOptions,
  );
  const anonymousClient = createClient<Database>(
    environment.url,
    environment.publishableKey,
    clientOptions,
  );

  const userASignIn = await userAClient.auth.signInWithPassword({
    email: `security-${namespace}-a@example.test`,
    password,
  });
  const userBSignIn = await userBClient.auth.signInWithPassword({
    email: `security-${namespace}-b@example.test`,
    password,
  });
  const userCSignIn = await userCClient.auth.signInWithPassword({
    email: `security-${namespace}-c@example.test`,
    password,
  });

  if (userASignIn.error) throw userASignIn.error;
  if (userBSignIn.error) throw userBSignIn.error;
  if (userCSignIn.error) throw userCSignIn.error;

  return {
    namespace,
    ids,
    adminSetupClient,
    userAClient,
    userBClient,
    userCClient,
    anonymousClient,
    cleanup: async () => {
      await userAClient.auth.signOut();
      await userBClient.auth.signOut();
      await userCClient.auth.signOut();
      await removeFixtureData(adminSetupClient, ids);
    },
  };
}
