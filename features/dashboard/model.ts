import type { Tables } from "@/types/database";

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

export type DashboardSeason = Pick<Tables<"seasons">, "name" | "status">;

export type DashboardMatch = Pick<
  Tables<"matches">,
  | "id"
  | "opponent_name"
  | "kickoff_at"
  | "home_away"
  | "venue"
  | "team_score"
  | "opponent_score"
>;

export type DashboardSuccessData = {
  status: "success";
  team: DashboardTeam;
  progress: TeamSetupProgress;
  seasonCount: number;
  activeSeason: DashboardSeason | null;
  playerCount: number;
  activePlayerCount: number;
  unavailablePlayerCount: number;
  upcomingMatch: DashboardMatch | null;
  recentResult: DashboardMatch | null;
};

export type DashboardData =
  DashboardSuccessData | { status: "error"; reason: "dashboard-query" };
