import { getTeamAccess } from "@/features/teams/access";
import {
  resolveCurrentSeason,
  type CurrentSeasonClient,
} from "@/features/seasons/current-season";
import type { DashboardData, DashboardMatch } from "./model";
import { getTeamSetupProgress } from "./progress";

export async function getDashboardData(
  now: Date = new Date(),
): Promise<DashboardData> {
  const { supabase, team } = await getTeamAccess();

  // The protected dashboard layout guarantees a team. Keep this defensive
  // branch distinct from a valid empty-data state.
  if (!team) return { status: "error", reason: "dashboard-query" };

  const teamId = team.id;
  try {
    const activeSeason = await resolveCurrentSeason({
      supabase: supabase as unknown as CurrentSeasonClient,
      teamId,
    });
    let upcomingQuery = supabase
      .from("matches")
      .select(
        "id, opponent_name, kickoff_at, home_away, venue, team_score, opponent_score",
      )
      .eq("team_id", teamId)
      .eq("status", "scheduled")
      .gte("kickoff_at", now.toISOString());
    let recentResultQuery = supabase
      .from("matches")
      .select(
        "id, opponent_name, kickoff_at, home_away, venue, team_score, opponent_score",
      )
      .eq("team_id", teamId)
      .eq("status", "completed")
      .not("team_score", "is", null)
      .not("opponent_score", "is", null);
    if (activeSeason) {
      upcomingQuery = upcomingQuery.eq("season_id", activeSeason.id);
      recentResultQuery = recentResultQuery.eq("season_id", activeSeason.id);
    }

    const [
      seasons,
      players,
      activePlayers,
      unavailablePlayers,
      matches,
      callups,
      upcomingMatch,
      recentResult,
    ] = await Promise.all([
      supabase
        .from("seasons")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId),
      supabase
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId),
      supabase
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("status", "active"),
      supabase
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .neq("status", "active"),
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId),
      supabase
        .from("callups")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId),
      upcomingQuery
        .order("kickoff_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle(),
      recentResultQuery
        .order("kickoff_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const results = [
      seasons,
      players,
      activePlayers,
      unavailablePlayers,
      matches,
      callups,
      upcomingMatch,
      recentResult,
    ];

    if (results.some((result) => result.error)) {
      return { status: "error", reason: "dashboard-query" };
    }

    const seasonCount = seasons.count ?? 0;
    const playerCount = players.count ?? 0;
    const matchCount = matches.count ?? 0;
    const callupCount = callups.count ?? 0;
    const result = recentResult.data as DashboardMatch | null;
    const upcoming = upcomingMatch.data as DashboardMatch | null;
    let upcomingCallupCount = 0;
    if (upcoming) {
      const upcomingCallups = await supabase
        .from("callups")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("match_id", upcoming.id);
      if (upcomingCallups.error) {
        return { status: "error", reason: "dashboard-query" };
      }
      upcomingCallupCount = upcomingCallups.count ?? 0;
    }

    return {
      status: "success",
      team,
      progress: getTeamSetupProgress({
        teamExists: true,
        seasonExists: seasonCount > 0,
        playerCount,
        matchExists: matchCount > 0,
        callupExists: callupCount > 0,
        completedResultExists: Boolean(result),
      }),
      seasonCount,
      activeSeason,
      playerCount,
      activePlayerCount: activePlayers.count ?? 0,
      unavailablePlayerCount: unavailablePlayers.count ?? 0,
      upcomingMatch: upcoming
        ? { ...upcoming, callup_count: upcomingCallupCount }
        : null,
      recentResult: result,
    };
  } catch {
    return { status: "error", reason: "dashboard-query" };
  }
}
