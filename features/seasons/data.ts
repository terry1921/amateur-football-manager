import { getTeamAccess } from "@/features/teams/access";
import {
  resolveCurrentSeason,
  type CurrentSeasonClient,
} from "./current-season";
import { canEditSeason, sortSeasons, type Season } from "./model";

export type SeasonWithUsage = Season & {
  matchCount: number;
  editable: boolean;
};

async function requireSeasonTeam() {
  const context = await getTeamAccess();
  const team = context.team;
  if (!team) throw new Error("season_team_not_found");
  return { ...context, team };
}

function seasonClient(value: unknown) {
  return value as CurrentSeasonClient;
}

export async function getSeasonsData() {
  const { supabase, team } = await requireSeasonTeam();
  const [seasonsResult, matchesResult, activeSeason] = await Promise.all([
    supabase
      .from("seasons")
      .select(
        "id, team_id, name, start_date, end_date, status, created_at, updated_at",
      )
      .eq("team_id", team.id),
    supabase.from("matches").select("season_id").eq("team_id", team.id),
    resolveCurrentSeason({
      supabase: seasonClient(supabase),
      teamId: team.id,
    }),
  ]);

  if (seasonsResult.error) throw seasonsResult.error;
  if (matchesResult.error) throw matchesResult.error;

  const usage = new Map<string, number>();
  for (const match of matchesResult.data) {
    usage.set(match.season_id, (usage.get(match.season_id) ?? 0) + 1);
  }

  const seasons = sortSeasons(seasonsResult.data as Season[]).map((season) => {
    const matchCount = usage.get(season.id) ?? 0;
    return {
      ...season,
      matchCount,
      editable: canEditSeason(season.status, matchCount),
    } satisfies SeasonWithUsage;
  });

  return { team, seasons, activeSeason };
}

export async function getSeasonDetails(seasonId: string) {
  const { supabase, team } = await requireSeasonTeam();
  const [seasonResult, matchesResult] = await Promise.all([
    supabase
      .from("seasons")
      .select(
        "id, team_id, name, start_date, end_date, status, created_at, updated_at",
      )
      .eq("team_id", team.id)
      .eq("id", seasonId)
      .maybeSingle(),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.id)
      .eq("season_id", seasonId),
  ]);

  if (seasonResult.error) throw seasonResult.error;
  if (matchesResult.error) throw matchesResult.error;
  if (!seasonResult.data) return null;

  const season = seasonResult.data as Season;
  const matchCount = matchesResult.count ?? 0;
  return {
    ...season,
    matchCount,
    editable: canEditSeason(season.status, matchCount),
  } satisfies SeasonWithUsage;
}
