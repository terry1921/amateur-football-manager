import { getTeamAccess } from "@/features/teams/access";
import {
  resolveCurrentSeason,
  type CurrentSeasonClient,
} from "@/features/seasons/current-season";
import type { Tables } from "@/types/database";
import {
  isEligibleSeason,
  isMatchId,
  type Match,
  type SeasonStatus,
} from "./model";

export const MATCH_LIST_LIMIT = 250;

const matchColumns =
  "id, team_id, season_id, opponent_name, opponent_logo_url, competition, round, venue, kickoff_at, home_away, status, team_score, opponent_score, notes, created_at, updated_at";

export type MatchSeason = Pick<
  Tables<"seasons">,
  "id" | "name" | "status" | "start_date" | "end_date"
> & { status: SeasonStatus };

type MatchRow = Tables<"matches">;

export function hydrateMatches(
  rows: MatchRow[],
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

  if (matchesResult.error) throw matchesResult.error;
  if (seasonsResult.error) throw seasonsResult.error;

  const ids = matchesResult.data.map(({ id }) => id);
  let dependentMatchIds = new Set<string>();
  if (ids.length > 0) {
    const [callups, events] = await Promise.all([
      supabase.from("callups").select("match_id").in("match_id", ids),
      supabase.from("match_events").select("match_id").in("match_id", ids),
    ]);
    if (callups.error) throw callups.error;
    if (events.error) throw events.error;
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

  if (matchResult.error) throw matchResult.error;
  if (!matchResult.data) return null;

  const [seasonResult, callups, events] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, name, status, start_date, end_date")
      .eq("team_id", team.id)
      .eq("id", matchResult.data.season_id)
      .maybeSingle(),
    supabase
      .from("callups")
      .select("id", { count: "exact", head: true })
      .eq("match_id", matchId),
    supabase
      .from("match_events")
      .select("id", { count: "exact", head: true })
      .eq("match_id", matchId),
  ]);
  if (seasonResult.error) throw seasonResult.error;
  if (callups.error) throw callups.error;
  if (events.error) throw events.error;
  if (!seasonResult.data) return null;

  const [match] = hydrateMatches(
    [matchResult.data],
    [seasonResult.data],
    new Set((callups.count ?? 0) + (events.count ?? 0) > 0 ? [matchId] : []),
  );
  return { match, season: seasonResult.data as MatchSeason };
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
  if (seasonsResult.error) throw seasonsResult.error;

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
