import { getTeamAccess } from "@/features/teams/access";
import {
  resolveCurrentSeason,
  type CurrentSeasonClient,
} from "@/features/seasons/current-season";
import type { Tables } from "@/types/database";
import {
  getDashboardAttentionItems,
  getPrimaryDashboardAction,
  type DashboardData,
  type DashboardMatch,
  type DashboardSeason,
} from "./model";
import { getTeamSetupProgress } from "./progress";

const DASHBOARD_UPCOMING_LIMIT = 5;
const DASHBOARD_HISTORY_LIMIT = 1;
const DASHBOARD_CALLUP_ROWS_LIMIT = DASHBOARD_UPCOMING_LIMIT * 250;
const dashboardMatchColumns =
  "id, season_id, opponent_name, kickoff_at, home_away, venue, status, team_score, opponent_score";

type DashboardMatchRow = Pick<
  Tables<"matches">,
  | "id"
  | "season_id"
  | "opponent_name"
  | "kickoff_at"
  | "home_away"
  | "venue"
  | "status"
  | "team_score"
  | "opponent_score"
>;

type EmptyRows = { data: never[]; error: null };

function emptyRows(): EmptyRows {
  return { data: [], error: null };
}

function hydrateMatch(
  match: DashboardMatchRow,
  activeSeason: DashboardSeason | null,
  callupCount = 0,
): DashboardMatch {
  return {
    ...match,
    callup_count: callupCount,
    season_name:
      activeSeason?.id === match.season_id ? activeSeason.name : undefined,
  };
}

export async function getDashboardData(
  now: Date = new Date(),
): Promise<DashboardData> {
  const { supabase, team } = await getTeamAccess();

  // The protected dashboard layout guarantees a team. Keep this defensive
  // branch distinct from a valid empty-data state.
  if (!team) return { status: "error", reason: "dashboard-query" };

  try {
    // This is the only season-context lookup. Every season-scoped dashboard
    // query below uses the same resolved value.
    const activeSeason = await resolveCurrentSeason({
      supabase: supabase as unknown as CurrentSeasonClient,
      teamId: team.id,
    });

    // These reads are independent after team and season context are known.
    // Counts stay head-only; fixture reads are deliberately small and indexed.
    const [
      seasons,
      players,
      activePlayers,
      injuredPlayers,
      suspendedPlayers,
      inactivePlayers,
      matches,
      callups,
      upcomingMatchesResult,
      pastUnresolvedResult,
      recentResultResult,
      recentFixtureResult,
    ] = await Promise.all([
      supabase
        .from("seasons")
        .select("id", { count: "exact", head: true })
        .eq("team_id", team.id),
      supabase
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("team_id", team.id),
      supabase
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("team_id", team.id)
        .eq("status", "active"),
      supabase
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("team_id", team.id)
        .eq("status", "injured"),
      supabase
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("team_id", team.id)
        .eq("status", "suspended"),
      supabase
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("team_id", team.id)
        .eq("status", "inactive"),
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("team_id", team.id),
      supabase
        .from("callups")
        .select("id", { count: "exact", head: true })
        .eq("team_id", team.id),
      activeSeason
        ? supabase
            .from("matches")
            .select(dashboardMatchColumns)
            .eq("team_id", team.id)
            .eq("season_id", activeSeason.id)
            .eq("status", "scheduled")
            .gte("kickoff_at", now.toISOString())
            .order("kickoff_at", { ascending: true })
            .order("id", { ascending: true })
            .limit(DASHBOARD_UPCOMING_LIMIT)
        : Promise.resolve(emptyRows()),
      activeSeason
        ? supabase
            .from("matches")
            .select(dashboardMatchColumns)
            .eq("team_id", team.id)
            .eq("season_id", activeSeason.id)
            .eq("status", "scheduled")
            .lt("kickoff_at", now.toISOString())
            .order("kickoff_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(DASHBOARD_HISTORY_LIMIT)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      activeSeason
        ? supabase
            .from("matches")
            .select(dashboardMatchColumns)
            .eq("team_id", team.id)
            .eq("season_id", activeSeason.id)
            .eq("status", "completed")
            .not("team_score", "is", null)
            .not("opponent_score", "is", null)
            .order("kickoff_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(DASHBOARD_HISTORY_LIMIT)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      activeSeason
        ? supabase
            .from("matches")
            .select(dashboardMatchColumns)
            .eq("team_id", team.id)
            .eq("season_id", activeSeason.id)
            .in("status", ["scheduled", "cancelled"])
            .lt("kickoff_at", now.toISOString())
            .order("kickoff_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(DASHBOARD_HISTORY_LIMIT)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const results = [
      seasons,
      players,
      activePlayers,
      injuredPlayers,
      suspendedPlayers,
      inactivePlayers,
      matches,
      callups,
      upcomingMatchesResult,
      pastUnresolvedResult,
      recentResultResult,
      recentFixtureResult,
    ];

    if (results.some((result) => result.error)) {
      return { status: "error", reason: "dashboard-query" };
    }

    const upcomingRows = (upcomingMatchesResult.data ??
      []) as DashboardMatchRow[];
    const upcomingIds = upcomingRows.map(({ id }) => id);
    const upcomingCallups = upcomingIds.length
      ? await supabase
          .from("callups")
          .select("match_id")
          .eq("team_id", team.id)
          .in("match_id", upcomingIds)
          .limit(DASHBOARD_CALLUP_ROWS_LIMIT)
      : emptyRows();

    if (upcomingCallups.error) {
      return { status: "error", reason: "dashboard-query" };
    }

    const callupCounts = new Map<string, number>();
    for (const row of upcomingCallups.data as Array<{ match_id: string }>) {
      callupCounts.set(row.match_id, (callupCounts.get(row.match_id) ?? 0) + 1);
    }

    const upcomingMatches = upcomingRows.map((match) =>
      hydrateMatch(match, activeSeason, callupCounts.get(match.id) ?? 0),
    );
    const upcomingMatch = upcomingMatches[0] ?? null;
    const pastUnresolvedMatch = pastUnresolvedResult.data
      ? hydrateMatch(
          pastUnresolvedResult.data as DashboardMatchRow,
          activeSeason,
        )
      : null;
    const recentResult = recentResultResult.data
      ? hydrateMatch(recentResultResult.data as DashboardMatchRow, activeSeason)
      : null;
    const recentFixture = recentFixtureResult.data
      ? hydrateMatch(
          recentFixtureResult.data as DashboardMatchRow,
          activeSeason,
        )
      : null;

    const seasonCount = seasons.count ?? 0;
    const playerCount = players.count ?? 0;
    const activePlayerCount = activePlayers.count ?? 0;
    const injuredCount = injuredPlayers.count ?? 0;
    const suspendedCount = suspendedPlayers.count ?? 0;
    const inactiveCount = inactivePlayers.count ?? 0;
    const matchCount = matches.count ?? 0;
    const callupCount = callups.count ?? 0;
    const unavailablePlayerCount =
      injuredCount + suspendedCount + inactiveCount;
    const facts = {
      teamExists: true,
      seasonExists: seasonCount > 0,
      playerCount,
      matchExists: matchCount > 0,
      callupExists: callupCount > 0,
      completedResultExists: Boolean(recentResult),
    };
    const progress = getTeamSetupProgress(facts);
    const primaryAction = getPrimaryDashboardAction({
      activeSeason,
      playerCount,
      activePlayerCount,
      matchCount,
      upcomingMatch,
    });
    const attentionItems = getDashboardAttentionItems({
      activeSeason,
      playerCount,
      activePlayerCount,
      upcomingMatch,
      pastUnresolvedMatch,
    });

    return {
      status: "success",
      team,
      progress,
      seasonCount,
      activeSeason,
      playerCount,
      activePlayerCount,
      unavailablePlayerCount,
      squadSummary: {
        total: playerCount,
        available: activePlayerCount,
        unavailable: unavailablePlayerCount,
        injured: injuredCount,
        suspended: suspendedCount,
        inactive: inactiveCount,
      },
      primaryAction,
      attentionItems,
      upcomingMatch,
      upcomingMatches,
      pastUnresolvedMatch,
      recentResult,
      recentFixture,
    };
  } catch {
    return { status: "error", reason: "dashboard-query" };
  }
}
