import {
  getStatisticsContext,
  readStatisticsSnapshot,
} from "@/features/statistics/data";
import type { Tables } from "@/types/database";
import { mapBackendError } from "@/lib/errors/map-backend-error";
import {
  type SocialBranding,
  type SocialCallup,
  type SocialEvent,
  type SocialGeneratorData,
  type SocialMatch,
  type SocialMatchDetail,
  type SocialPlayer,
} from "./model";

export const SOCIAL_MATCH_LIMIT = 100;
export const SOCIAL_PLAYER_LIMIT = 250;
export const SOCIAL_DETAIL_LIMIT = 250;

const socialMatchColumns =
  "id, team_id, season_id, opponent_name, opponent_logo_url, competition, round, venue, kickoff_at, home_away, status, team_score, opponent_score";

function isScheduledMatch(match: SocialMatch) {
  return match.status === "scheduled";
}

function chooseDefaultMatch(matches: SocialMatch[]) {
  const now = Date.now();
  const next = matches
    .filter(
      (match) =>
        isScheduledMatch(match) && new Date(match.kickoff_at).getTime() >= now,
    )
    .sort(
      (left, right) =>
        left.kickoff_at.localeCompare(right.kickoff_at) ||
        left.id.localeCompare(right.id),
    )[0];
  return next ?? matches.find((match) => match.status === "completed") ?? null;
}

function hydrateMatches(
  rows: Array<
    Pick<
      Tables<"matches">,
      | "id"
      | "team_id"
      | "season_id"
      | "opponent_name"
      | "opponent_logo_url"
      | "competition"
      | "round"
      | "venue"
      | "kickoff_at"
      | "home_away"
      | "status"
      | "team_score"
      | "opponent_score"
    >
  >,
  seasons: Array<{ id: string; name: string }>,
) {
  const seasonNames = new Map(
    seasons.map((season) => [season.id, season.name]),
  );
  return rows.map(
    (row) =>
      ({
        id: row.id,
        team_id: row.team_id,
        season_id: row.season_id,
        opponent_name: row.opponent_name,
        opponent_logo_url: row.opponent_logo_url,
        competition: row.competition,
        round: row.round,
        venue: row.venue,
        kickoff_at: row.kickoff_at,
        home_away: row.home_away,
        status: row.status,
        team_score: row.team_score,
        opponent_score: row.opponent_score,
        season_name: seasonNames.get(row.season_id) ?? "",
      }) satisfies SocialMatch,
  );
}

export async function getSocialGeneratorData(
  requestedFilter?: string,
  requestedMatchId?: string,
): Promise<SocialGeneratorData> {
  const context = await getStatisticsContext(requestedFilter);
  const team = {
    id: context.team.id,
    name: context.team.name,
    short_name: context.team.short_name,
    logo_url: context.team.logo_url,
    primary_color: context.team.primary_color,
    secondary_color: context.team.secondary_color,
  } satisfies SocialBranding;

  const matchesQuery = context.supabase
    .from("matches")
    .select(socialMatchColumns)
    .eq("team_id", team.id)
    .order("kickoff_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(SOCIAL_MATCH_LIMIT);
  const scopedMatchesQuery = context.seasonId
    ? matchesQuery.eq("season_id", context.seasonId)
    : matchesQuery;

  const [matchesResult, playersResult, snapshot] = await Promise.all([
    scopedMatchesQuery,
    context.supabase
      .from("players")
      .select(
        "id, team_id, first_name, last_name, nickname, shirt_number, position, photo_url, status",
      )
      .eq("team_id", team.id)
      .order("last_name", { ascending: true, nullsFirst: false })
      .order("first_name", { ascending: true })
      .limit(SOCIAL_PLAYER_LIMIT),
    readStatisticsSnapshot(
      context.supabase as unknown as Parameters<
        typeof readStatisticsSnapshot
      >[0],
      team.id,
      context.seasonId,
    ),
  ]);
  if (matchesResult.error) throw mapBackendError(matchesResult.error, "match");
  if (playersResult.error) throw mapBackendError(playersResult.error, "player");

  const matches = hydrateMatches(matchesResult.data, context.seasons);
  const players = playersResult.data as SocialPlayer[];
  const selectedMatch =
    matches.find(({ id }) => id === requestedMatchId) ??
    chooseDefaultMatch(matches);
  let selectedDetail: SocialMatchDetail | null = null;

  if (selectedMatch) {
    const [callupsResult, eventsResult] = await Promise.all([
      context.supabase
        .from("callups")
        .select("player_id, status")
        .eq("team_id", team.id)
        .eq("match_id", selectedMatch.id)
        .order("player_id", { ascending: true })
        .limit(SOCIAL_DETAIL_LIMIT),
      context.supabase
        .from("match_events")
        .select("id, player_id, type, minute, stoppage_time, notes, created_at")
        .eq("team_id", team.id)
        .eq("match_id", selectedMatch.id)
        .order("minute", { ascending: true })
        .order("stoppage_time", { ascending: true })
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(SOCIAL_DETAIL_LIMIT),
    ]);
    if (callupsResult.error)
      throw mapBackendError(callupsResult.error, "callup");
    if (eventsResult.error) throw mapBackendError(eventsResult.error, "result");
    selectedDetail = {
      callups: callupsResult.data as SocialCallup[],
      events: eventsResult.data as SocialEvent[],
    };
  }

  return {
    team,
    seasons: context.seasons,
    activeSeason: context.activeSeason,
    selectedFilter: context.selectedFilter,
    selectedSeason: context.selectedSeason,
    snapshot,
    matches,
    players,
    selectedMatch,
    selectedDetail,
  };
}
