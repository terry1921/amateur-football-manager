import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type SecurityClient = SupabaseClient<Database>;

export type SecurityFixtureIds = {
  userA: string;
  userB: string;
  userC: string;
  teamA: string;
  teamB: string;
  seasonA: string;
  seasonB: string;
  playerA: string;
  playerA2: string;
  playerB: string;
  playerB2: string;
  matchA: string;
  matchB: string;
  callupA: string;
  callupB: string;
  eventA: string;
  eventB: string;
};

export type SecurityTestContext = {
  namespace: string;
  ids: SecurityFixtureIds;
  adminSetupClient: SecurityClient;
  userAClient: SecurityClient;
  userBClient: SecurityClient;
  userCClient: SecurityClient;
  anonymousClient: SecurityClient;
  cleanup: () => Promise<void>;
};
