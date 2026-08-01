import { getTeamAccess } from "@/features/teams/access";
import { isMatchId } from "@/features/matches/model";
import { mapBackendError } from "@/lib/errors/map-backend-error";
import type { PlayerPosition, PlayerStatus } from "@/features/players/model";
import type { Tables } from "@/types/database";
import {
  sortCallupPlayers,
  type CallupMatch,
  type CallupPlayer,
  type CallupStatus,
} from "./model";

const CALLUP_ROSTER_LIMIT = 250;
const matchColumns =
  "id, season_id, opponent_name, kickoff_at, home_away, status, venue";
const playerColumns =
  "id, first_name, last_name, nickname, shirt_number, position, status";

type RosterRow = Pick<
  Tables<"players">,
  | "id"
  | "first_name"
  | "last_name"
  | "nickname"
  | "shirt_number"
  | "position"
  | "status"
>;

type CallupRow = Pick<Tables<"callups">, "player_id" | "status" | "updated_at">;

export function hydrateCallupPlayers(
  roster: RosterRow[],
  callups: CallupRow[],
) {
  const selected = new Map(callups.map((row) => [row.player_id, row.status]));
  return sortCallupPlayers(
    roster.map(
      (player) =>
        ({
          ...player,
          position: player.position as PlayerPosition,
          status: player.status as PlayerStatus,
          selected: selected.has(player.id),
          callup_status:
            (selected.get(player.id) as CallupStatus | undefined) ?? null,
        }) satisfies CallupPlayer,
    ),
  );
}

export function resolveCallupLastUpdated(
  rows: Array<Pick<CallupRow, "updated_at">>,
) {
  if (rows.length === 0) return null;
  return rows.reduce(
    (latest, row) => (row.updated_at > latest ? row.updated_at : latest),
    rows[0].updated_at,
  );
}

export async function getCallupData(matchId: string) {
  if (!isMatchId(matchId)) return null;
  const { supabase, team } = await getTeamAccess();
  if (!team) return null;

  const matchResult = await supabase
    .from("matches")
    .select(matchColumns)
    .eq("team_id", team.id)
    .eq("id", matchId)
    .maybeSingle();
  if (matchResult.error) throw mapBackendError(matchResult.error, "match");
  if (!matchResult.data) return null;

  const [seasonResult, rosterResult, callupResult] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, name")
      .eq("team_id", team.id)
      .eq("id", matchResult.data.season_id)
      .maybeSingle(),
    supabase
      .from("players")
      .select(playerColumns)
      .eq("team_id", team.id)
      .order("created_at", { ascending: true })
      .limit(CALLUP_ROSTER_LIMIT),
    supabase
      .from("callups")
      .select("player_id, status, updated_at")
      .eq("team_id", team.id)
      .eq("match_id", matchId),
  ]);

  if (seasonResult.error) throw mapBackendError(seasonResult.error, "season");
  if (rosterResult.error) throw mapBackendError(rosterResult.error, "player");
  if (callupResult.error) throw mapBackendError(callupResult.error, "callup");
  if (!seasonResult.data) return null;

  const match = {
    ...matchResult.data,
    home_away: matchResult.data.home_away as CallupMatch["home_away"],
    status: matchResult.data.status as CallupMatch["status"],
    season_name: seasonResult.data.name,
  } satisfies CallupMatch;
  const callups = callupResult.data as CallupRow[];
  return {
    team,
    match,
    players: hydrateCallupPlayers(rosterResult.data as RosterRow[], callups),
    lastUpdated: resolveCallupLastUpdated(callups),
    rosterTruncated: rosterResult.data.length === CALLUP_ROSTER_LIMIT,
  };
}
