import type { Tables } from "@/types/database";

export const matchStatuses = ["scheduled", "completed", "cancelled"] as const;
export const matchLocations = ["home", "away", "neutral"] as const;
export const matchGroupIds = [
  "all",
  "upcoming",
  "past",
  "completed",
  "cancelled",
] as const;
export const matchEventTypes = ["goal", "yellow_card", "red_card"] as const;

export type MatchStatus = (typeof matchStatuses)[number];
export type MatchLocation = (typeof matchLocations)[number];
export type MatchGroupId = (typeof matchGroupIds)[number];
export type MatchEventType = (typeof matchEventTypes)[number];
export type SeasonStatus = "draft" | "active" | "completed";
export type MatchResult = "win" | "draw" | "loss";

export type MatchEvent = {
  id: string;
  player_id: string;
  type: MatchEventType;
  minute: number;
  created_at: string;
  player_name: string;
  player_shirt_number: number | null;
};

export type MatchCallupPlayer = {
  id: string;
  first_name: string;
  last_name: string | null;
  nickname: string | null;
  shirt_number: number | null;
  position: string;
  status: string;
  callup_status: string;
};

export type Match = Omit<Tables<"matches">, "home_away" | "status"> & {
  home_away: MatchLocation;
  status: MatchStatus;
  season_name: string;
  has_dependents: boolean;
};

export type MatchFilters = {
  search: string;
  season: string | "all";
  status: MatchStatus | "all";
  location: MatchLocation | "all";
  group: MatchGroupId;
};

export type MatchGroups = {
  upcoming: Match[];
  pastScheduled: Match[];
  completed: Match[];
  cancelled: Match[];
};

function compareAscending(left: Match, right: Match) {
  return (
    left.kickoff_at.localeCompare(right.kickoff_at) ||
    left.created_at.localeCompare(right.created_at) ||
    left.id.localeCompare(right.id)
  );
}

function compareDescending(left: Match, right: Match) {
  return (
    right.kickoff_at.localeCompare(left.kickoff_at) ||
    right.created_at.localeCompare(left.created_at) ||
    right.id.localeCompare(left.id)
  );
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .trim();
}

function groupForMatch(match: Match, now: Date): Exclude<MatchGroupId, "all"> {
  if (match.status === "completed") return "completed";
  if (match.status === "cancelled") return "cancelled";
  return new Date(match.kickoff_at).getTime() >= now.getTime()
    ? "upcoming"
    : "past";
}

export function isEligibleSeason(status: string): status is "draft" | "active" {
  return status === "draft" || status === "active";
}

export function isMatchId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function groupMatches(
  matches: Match[],
  now: Date = new Date(),
): MatchGroups {
  const groups: MatchGroups = {
    upcoming: [],
    pastScheduled: [],
    completed: [],
    cancelled: [],
  };

  for (const match of matches) {
    const group = groupForMatch(match, now);
    if (group === "past") groups.pastScheduled.push(match);
    else groups[group].push(match);
  }

  groups.upcoming.sort(compareAscending);
  groups.pastScheduled.sort(compareDescending);
  groups.completed.sort(compareDescending);
  groups.cancelled.sort(compareDescending);
  return groups;
}

export function filterMatches(
  matches: Match[],
  filters: MatchFilters,
  now: Date = new Date(),
) {
  const search = normalizeSearch(filters.search);

  return matches.filter((match) => {
    const searchable = normalizeSearch(
      `${match.opponent_name} ${match.venue ?? ""}`,
    );
    return (
      (!search || searchable.includes(search)) &&
      (filters.season === "all" || match.season_id === filters.season) &&
      (filters.status === "all" || match.status === filters.status) &&
      (filters.location === "all" || match.home_away === filters.location) &&
      (filters.group === "all" || groupForMatch(match, now) === filters.group)
    );
  });
}

export function canEditMatch(match: Pick<Match, "status">) {
  return match.status === "scheduled";
}

export function canDeleteMatch(
  match: Pick<Match, "status" | "has_dependents">,
) {
  return match.status !== "completed" && !match.has_dependents;
}

export function getManagedScore(
  match: Pick<Match, "team_score" | "opponent_score">,
) {
  if (match.team_score === null || match.opponent_score === null) return null;
  return { team: match.team_score, opponent: match.opponent_score };
}

export function getManagedScoreFromHomeAway({
  homeScore,
  awayScore,
  location,
}: {
  homeScore: number;
  awayScore: number;
  location: MatchLocation;
}) {
  // Neutral fixtures use the documented V1 convention: home is the managed
  // team and away is the opponent because the stored columns are team-first.
  return location === "away"
    ? { team: awayScore, opponent: homeScore }
    : { team: homeScore, opponent: awayScore };
}

export function getMatchResult(
  match: Pick<Match, "team_score" | "opponent_score">,
): MatchResult | null {
  const score = getManagedScore(match);
  if (!score) return null;
  if (score.team === score.opponent) return "draw";
  return score.team > score.opponent ? "win" : "loss";
}
