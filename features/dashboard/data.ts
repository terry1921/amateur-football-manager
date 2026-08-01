import { getTeamAccess } from "@/features/teams/access";
import {
  resolveCurrentSeason,
  type CurrentSeasonClient,
} from "@/features/seasons/current-season";
import type { Tables } from "@/types/database";
import { getPlayerDisplayName } from "@/features/players/model";
import {
  getTimelineSummary,
  type TimelineEvent,
} from "@/features/timeline/model";
import {
  getDashboardAttentionItems,
  getPrimaryDashboardAction,
  type DashboardData,
  type DashboardMatch,
  type DashboardSeason,
} from "./model";
import { getTeamSetupProgress } from "./progress";
import { parseStatisticsSnapshot } from "@/features/statistics/data";
import { logServerError } from "@/lib/errors/log-error";

const DASHBOARD_UPCOMING_LIMIT = 5;
const DASHBOARD_HISTORY_LIMIT = 1;
const DASHBOARD_CALLUP_ROWS_LIMIT = DASHBOARD_UPCOMING_LIMIT * 250;
const DASHBOARD_EVENT_LIMIT = 250;
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
      statisticsResult,
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
      activeSeason
        ? supabase.rpc("get_statistics_snapshot", {
            target_team_id: team.id,
            target_season_id: activeSeason.id,
          })
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
      statisticsResult,
    ];

    const requiredFailure = results.slice(0, -1).find((result) => result.error);
    if (requiredFailure?.error) {
      logServerError(requiredFailure.error, {
        operation: "dashboard.load",
        teamId: team.id,
      });
      return { status: "error", reason: "dashboard-query" };
    }

    const upcomingRows = (upcomingMatchesResult.data ??
      []) as DashboardMatchRow[];
    const upcomingIds = upcomingRows.map(({ id }) => id);
    const [upcomingCallups, recentEventsResult] = await Promise.all([
      upcomingIds.length
        ? supabase
            .from("callups")
            .select("match_id")
            .eq("team_id", team.id)
            .in("match_id", upcomingIds)
            .limit(DASHBOARD_CALLUP_ROWS_LIMIT)
        : Promise.resolve(emptyRows()),
      recentResultResult.data
        ? supabase
            .from("match_events")
            .select(
              "id, player_id, type, minute, stoppage_time, notes, created_at",
            )
            .eq("team_id", team.id)
            .eq("match_id", recentResultResult.data.id)
            .order("minute", { ascending: true })
            .order("stoppage_time", { ascending: true })
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .limit(DASHBOARD_EVENT_LIMIT)
        : Promise.resolve(emptyRows()),
    ]);

    if (upcomingCallups.error) {
      logServerError(upcomingCallups.error, {
        operation: "dashboard.callups",
        teamId: team.id,
      });
      return { status: "error", reason: "dashboard-query" };
    }
    if (recentEventsResult.error) {
      logServerError(recentEventsResult.error, {
        operation: "dashboard.events",
        teamId: team.id,
      });
      return { status: "error", reason: "dashboard-query" };
    }

    const recentEventRows = (recentEventsResult.data ?? []) as Array<{
      id: string;
      player_id: string;
      type: string;
      minute: number;
      stoppage_time: number;
      notes: string | null;
      created_at: string;
    }>;
    const recentPlayerIds = [
      ...new Set(recentEventRows.map(({ player_id }) => player_id)),
    ];
    const recentPlayersResult = recentPlayerIds.length
      ? await supabase
          .from("players")
          .select(
            "id, first_name, last_name, nickname, shirt_number, position, status",
          )
          .eq("team_id", team.id)
          .in("id", recentPlayerIds)
      : { data: [], error: null };
    if (recentPlayersResult.error) {
      logServerError(recentPlayersResult.error, {
        operation: "dashboard.event-players",
        teamId: team.id,
      });
      return { status: "error", reason: "dashboard-query" };
    }
    const recentPlayersById = new Map(
      recentPlayersResult.data.map((player) => [player.id, player]),
    );
    const recentTimelineEvents: TimelineEvent[] = recentEventRows.flatMap(
      (event) => {
        const player = recentPlayersById.get(event.player_id);
        if (!player) return [];
        return [
          {
            id: event.id,
            playerId: event.player_id,
            type: event.type as TimelineEvent["type"],
            minute: event.minute,
            stoppageTime: event.stoppage_time,
            notes: event.notes,
            createdAt: event.created_at,
            playerName: getPlayerDisplayName(player),
            playerShirtNumber: player.shirt_number,
          },
        ];
      },
    );

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
      pastUnresolvedMatch,
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
      recentResultTimeline: recentResult
        ? getTimelineSummary(recentTimelineEvents)
        : null,
      dashboardStatistics: statisticsResult.data
        ? parseStatisticsSnapshot(statisticsResult.data)
        : null,
      dashboardStatisticsStatus: statisticsResult.error ? "error" : "success",
      recentFixture,
    };
  } catch (error) {
    logServerError(error, { operation: "dashboard.load", teamId: team.id });
    return { status: "error", reason: "dashboard-query" };
  }
}
