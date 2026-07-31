import type { Tables } from "@/types/database";
import {
  getMatchResult as getManagedMatchResult,
  type MatchResult,
} from "@/features/matches/model";

export type SetupStepId =
  "team" | "season" | "players" | "match" | "callup" | "result";

export type SetupStepStatus =
  "completed" | "available" | "upcoming" | "blocked";

export type DashboardFacts = {
  teamExists: boolean;
  seasonExists: boolean;
  playerCount: number;
  matchExists: boolean;
  callupExists: boolean;
  completedResultExists: boolean;
};

export type SetupStep = {
  id: SetupStepId;
  completed: boolean;
  dependencyMet: boolean;
  featureAvailable: boolean;
  status: SetupStepStatus;
  href: string;
};

export type TeamSetupProgress = {
  completedCount: number;
  totalCount: number;
  percentage: number;
  isComplete: boolean;
  isOperational: boolean;
  nextStep: SetupStep | null;
  steps: SetupStep[];
};

export type DashboardTeam = Pick<
  Tables<"teams">,
  | "id"
  | "name"
  | "short_name"
  | "city"
  | "country"
  | "primary_color"
  | "secondary_color"
>;

export type DashboardSeason = Pick<
  Tables<"seasons">,
  "id" | "name" | "status" | "start_date" | "end_date"
>;

export type DashboardMatch = Pick<
  Tables<"matches">,
  | "id"
  | "season_id"
  | "opponent_name"
  | "kickoff_at"
  | "home_away"
  | "venue"
  | "team_score"
  | "opponent_score"
  | "status"
> & { callup_count: number; season_name?: string };

export type SquadSummary = {
  total: number;
  available: number;
  unavailable: number;
  injured: number;
  suspended: number;
  inactive: number;
};

export type CallupReadiness = "not_started" | "ready" | "unavailable";

export type PrimaryDashboardActionId =
  | "create-season"
  | "add-player"
  | "schedule-match"
  | "manage-callup"
  | "view-squad"
  | "view-next-match"
  | "record-result";

export type PrimaryDashboardAction = {
  id: PrimaryDashboardActionId;
  href: string;
};

export type DashboardAttentionSeverity = "critical" | "warning" | "info";
export type DashboardAttentionId =
  | "past-unresolved-match"
  | "upcoming-match-callup"
  | "no-available-players"
  | "no-upcoming-match"
  | "no-active-season"
  | "no-players";

export type DashboardAttentionItem = {
  id: DashboardAttentionId;
  severity: DashboardAttentionSeverity;
  href: string;
};

export type DashboardMatchResult = MatchResult | null;

export function getCallupReadiness(
  match: Pick<DashboardMatch, "status" | "callup_count"> | null,
): CallupReadiness {
  if (!match || match.status !== "scheduled") return "unavailable";
  return match.callup_count > 0 ? "ready" : "not_started";
}

export function getMatchResult(
  match: Pick<DashboardMatch, "team_score" | "opponent_score"> | null,
): DashboardMatchResult {
  return match ? getManagedMatchResult(match) : null;
}

export function getPrimaryDashboardAction({
  activeSeason,
  playerCount,
  activePlayerCount,
  matchCount,
  upcomingMatch,
  pastUnresolvedMatch,
}: {
  activeSeason: DashboardSeason | null;
  playerCount: number;
  activePlayerCount: number;
  matchCount: number;
  upcomingMatch: DashboardMatch | null;
  pastUnresolvedMatch?: DashboardMatch | null;
}): PrimaryDashboardAction {
  if (!activeSeason) return { id: "create-season", href: "/seasons" };
  if (playerCount === 0) return { id: "add-player", href: "/players" };
  if (activePlayerCount === 0) return { id: "view-squad", href: "/players" };
  if (pastUnresolvedMatch) {
    return {
      id: "record-result",
      href: `/matches/${pastUnresolvedMatch.id}/result`,
    };
  }
  if (matchCount === 0 || !upcomingMatch) {
    return { id: "schedule-match", href: "/matches/new" };
  }
  if (getCallupReadiness(upcomingMatch) === "not_started") {
    return {
      id: "manage-callup",
      href: `/matches/${upcomingMatch.id}/call-up`,
    };
  }
  return { id: "view-next-match", href: `/matches/${upcomingMatch.id}` };
}

export function getDashboardAttentionItems({
  activeSeason,
  playerCount,
  activePlayerCount,
  upcomingMatch,
  pastUnresolvedMatch,
}: {
  activeSeason: DashboardSeason | null;
  playerCount: number;
  activePlayerCount: number;
  upcomingMatch: DashboardMatch | null;
  pastUnresolvedMatch: DashboardMatch | null;
}): DashboardAttentionItem[] {
  const items: DashboardAttentionItem[] = [];

  if (pastUnresolvedMatch) {
    items.push({
      id: "past-unresolved-match",
      severity: "warning",
      href: `/matches/${pastUnresolvedMatch.id}/result`,
    });
  }

  if (upcomingMatch && getCallupReadiness(upcomingMatch) === "not_started") {
    items.push({
      id: "upcoming-match-callup",
      severity: "warning",
      href: `/matches/${upcomingMatch.id}/call-up`,
    });
  }

  if (playerCount > 0 && activePlayerCount === 0) {
    items.push({
      id: "no-available-players",
      severity: "warning",
      href: "/players",
    });
  }

  if (activeSeason && !upcomingMatch) {
    items.push({
      id: "no-upcoming-match",
      severity: "info",
      href: "/matches/new",
    });
  }

  if (!activeSeason) {
    items.push({ id: "no-active-season", severity: "info", href: "/seasons" });
  }

  if (playerCount === 0) {
    items.push({ id: "no-players", severity: "info", href: "/players" });
  }

  return items.slice(0, 5);
}

export type DashboardSuccessData = {
  status: "success";
  team: DashboardTeam;
  progress: TeamSetupProgress;
  seasonCount: number;
  activeSeason: DashboardSeason | null;
  playerCount: number;
  activePlayerCount: number;
  unavailablePlayerCount: number;
  squadSummary: SquadSummary;
  primaryAction: PrimaryDashboardAction;
  attentionItems: DashboardAttentionItem[];
  upcomingMatch: DashboardMatch | null;
  upcomingMatches: DashboardMatch[];
  pastUnresolvedMatch: DashboardMatch | null;
  recentResult: DashboardMatch | null;
  recentFixture: DashboardMatch | null;
};

export type DashboardData =
  DashboardSuccessData | { status: "error"; reason: "dashboard-query" };
