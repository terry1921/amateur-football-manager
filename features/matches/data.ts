import { getTeamAccess } from "@/features/teams/access";
import {
  resolveCurrentSeason,
  type CurrentSeasonClient,
} from "@/features/seasons/current-season";
import type { Tables } from "@/types/database";
import { getPlayerDisplayName } from "@/features/players/model";
import { mapBackendError } from "@/lib/errors/map-backend-error";
import {
  isEligibleSeason,
  isMatchId,
  type Match,
  type MatchCallupPlayer,
  type MatchEvent,
  type MatchEventType,
  type SeasonStatus,
} from "./model";

export const MATCH_LIST_LIMIT = 250;
const MATCH_DETAIL_EVENT_LIMIT = 250;
const MATCH_DETAIL_CALLUP_LIMIT = 250;

const matchColumns =
  "id, team_id, season_id, opponent_name, opponent_logo_url, competition, round, venue, kickoff_at, home_away, status, team_score, opponent_score, notes, created_at, updated_at";

export type MatchSeason = Pick<
  Tables<"seasons">,
  "id" | "name" | "status" | "start_date" | "end_date"
> & { status: SeasonStatus };

type MatchRow = Tables<"matches">;

export function hydrateMatches(
  rows: Array<Omit<MatchRow, "creation_key">>,
  seasons: Array<Pick<MatchSeason, "id" | "name">>,
  dependentMatchIds: Set<string>,
) {
  const seasonNames = new Map(
    seasons.map((season) => [season.id, season.name]),
  );
  return rows.map(
    (row) =>
      ({
        ...row,
        home_away: row.home_away as Match["home_away"],
        status: row.status as Match["status"],
        season_name: seasonNames.get(row.season_id) ?? "",
        has_dependents: dependentMatchIds.has(row.id),
      }) satisfies Match,
  );
}

async function requireMatchTeam() {
  const context = await getTeamAccess();
  const team = context.team;
  if (!team) throw new Error("match_team_not_found");
  return { ...context, team };
}

function currentSeasonClient(value: unknown) {
  return value as CurrentSeasonClient;
}

export async function getMatchesData() {
  const { supabase, team } = await requireMatchTeam();
  const [matchesResult, seasonsResult] = await Promise.all([
    supabase
      .from("matches")
      .select(matchColumns)
      .eq("team_id", team.id)
      .order("kickoff_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(MATCH_LIST_LIMIT),
    supabase
      .from("seasons")
      .select("id, name, status, start_date, end_date")
      .eq("team_id", team.id)
      .order("created_at", { ascending: false }),
  ]);

  if (matchesResult.error) throw mapBackendError(matchesResult.error, "match");
  if (seasonsResult.error) throw mapBackendError(seasonsResult.error, "season");

  const ids = matchesResult.data.map(({ id }) => id);
  let dependentMatchIds = new Set<string>();
  if (ids.length > 0) {
    const [callups, events] = await Promise.all([
      supabase.from("callups").select("match_id").in("match_id", ids),
      supabase.from("match_events").select("match_id").in("match_id", ids),
    ]);
    if (callups.error) throw mapBackendError(callups.error, "callup");
    if (events.error) throw mapBackendError(events.error, "result");
    dependentMatchIds = new Set([
      ...callups.data.map(({ match_id }) => match_id),
      ...events.data.map(({ match_id }) => match_id),
    ]);
  }

  const seasons = seasonsResult.data as MatchSeason[];
  return {
    team,
    seasons,
    matches: hydrateMatches(matchesResult.data, seasons, dependentMatchIds),
    truncated: matchesResult.data.length === MATCH_LIST_LIMIT,
  };
}

export async function getMatchDetails(matchId: string) {
  if (!isMatchId(matchId)) return null;
  const { supabase, team } = await requireMatchTeam();
  const matchResult = await supabase
    .from("matches")
    .select(matchColumns)
    .eq("team_id", team.id)
    .eq("id", matchId)
    .maybeSingle();

  if (matchResult.error) throw mapBackendError(matchResult.error, "match");
  if (!matchResult.data) return null;

  const [seasonResult, callupsResult, eventsResult] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, name, status, start_date, end_date")
      .eq("team_id", team.id)
      .eq("id", matchResult.data.season_id)
      .maybeSingle(),
    supabase
      .from("callups")
      .select("player_id, status")
      .eq("match_id", matchId)
      .limit(MATCH_DETAIL_CALLUP_LIMIT),
    supabase
      .from("match_events")
      .select("id, player_id, type, minute, stoppage_time, notes, created_at")
      .eq("match_id", matchId)
      .order("minute", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(MATCH_DETAIL_EVENT_LIMIT),
  ]);
  if (seasonResult.error) throw mapBackendError(seasonResult.error, "season");
  if (callupsResult.error) throw mapBackendError(callupsResult.error, "callup");
  if (eventsResult.error) throw mapBackendError(eventsResult.error, "result");
  if (!seasonResult.data) return null;

  const callupRows = callupsResult.data as Array<{
    player_id: string;
    status: string;
  }>;
  const eventRows = eventsResult.data as Array<{
    id: string;
    player_id: string;
    type: string;
    minute: number;
    stoppage_time: number;
    notes: string | null;
    created_at: string;
  }>;
  const playerIds = [
    ...new Set([
      ...callupRows.map(({ player_id }) => player_id),
      ...eventRows.map(({ player_id }) => player_id),
    ]),
  ];
  const playersResult = playerIds.length
    ? await supabase
        .from("players")
        .select(
          "id, first_name, last_name, nickname, shirt_number, position, status",
        )
        .eq("team_id", team.id)
        .in("id", playerIds)
    : { data: [], error: null };
  if (playersResult.error) throw mapBackendError(playersResult.error, "player");
  const playersById = new Map(
    playersResult.data.map((player) => [player.id, player]),
  );
  const callupPlayers = callupRows
    .map(({ player_id, status }) => {
      const player = playersById.get(player_id);
      if (!player) return null;
      return {
        ...player,
        callup_status: status,
      } satisfies MatchCallupPlayer;
    })
    .filter((player): player is MatchCallupPlayer => player !== null)
    .sort((left, right) =>
      getPlayerDisplayName(left).localeCompare(getPlayerDisplayName(right)),
    );
  const events = eventRows
    .map((event) => {
      const player = playersById.get(event.player_id);
      if (!player) return null;
      return {
        ...event,
        type: event.type as MatchEventType,
        stoppage_time: event.stoppage_time,
        notes: event.notes,
        player_name: getPlayerDisplayName(player),
        player_shirt_number: player.shirt_number,
      } satisfies MatchEvent;
    })
    .filter((event): event is MatchEvent => event !== null)
    .sort(
      (left, right) =>
        left.minute - right.minute ||
        left.stoppage_time - right.stoppage_time ||
        left.created_at.localeCompare(right.created_at) ||
        left.id.localeCompare(right.id),
    );

  const [match] = hydrateMatches(
    [matchResult.data],
    [seasonResult.data],
    new Set(callupRows.length + eventRows.length > 0 ? [matchId] : []),
  );
  return {
    team,
    match,
    season: seasonResult.data as MatchSeason,
    callupPlayers,
    events,
  };
}

export async function getMatchFormData(matchId?: string) {
  if (matchId && !isMatchId(matchId)) {
    return { team: null, seasons: [], defaultSeasonId: null, match: null };
  }
  const { supabase, team } = await requireMatchTeam();
  const [seasonsResult, activeSeason, details] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, name, status, start_date, end_date")
      .eq("team_id", team.id)
      .in("status", ["draft", "active"])
      .order("created_at", { ascending: false }),
    resolveCurrentSeason({
      supabase: currentSeasonClient(supabase),
      teamId: team.id,
    }),
    matchId ? getMatchDetails(matchId) : Promise.resolve(null),
  ]);
  if (seasonsResult.error) throw mapBackendError(seasonsResult.error, "season");

  const seasons = (seasonsResult.data as MatchSeason[]).filter(({ status }) =>
    isEligibleSeason(status),
  );
  const currentMatchSeason = details?.match.season_id;
  const defaultSeasonId =
    (currentMatchSeason && seasons.some(({ id }) => id === currentMatchSeason)
      ? currentMatchSeason
      : undefined) ??
    (activeSeason && seasons.some(({ id }) => id === activeSeason.id)
      ? activeSeason.id
      : undefined) ??
    (seasons.length === 1 ? seasons[0].id : undefined);

  return {
    team,
    seasons,
    defaultSeasonId: defaultSeasonId ?? null,
    match: details?.match ?? null,
  };
}
