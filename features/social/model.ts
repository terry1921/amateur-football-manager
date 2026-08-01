import type { Tables } from "@/types/database";
import {
  getPlayerDisplayNameFromStatistics,
  type PlayerStatistics,
  type StatisticsSnapshot,
} from "@/features/statistics/model";
import { getTopScorer } from "@/features/leaderboards/model";

export const socialTemplateKinds = [
  "result",
  "upcoming",
  "topScorer",
  "playerOfMatch",
  "lineup",
] as const;

export type SocialTemplateKind = (typeof socialTemplateKinds)[number];
export type SocialPlatform = "facebook" | "instagram" | "x";

export type SocialBranding = {
  id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
};

export type SocialSeason = Pick<
  Tables<"seasons">,
  "id" | "name" | "status" | "start_date" | "end_date"
>;

export type SocialPlayer = Pick<
  Tables<"players">,
  | "team_id"
  | "id"
  | "first_name"
  | "last_name"
  | "nickname"
  | "shirt_number"
  | "position"
  | "photo_url"
  | "status"
>;

export type SocialMatch = Pick<
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
> & { season_name: string };

export type SocialCallup = {
  player_id: string;
  status: string;
};

export type SocialEvent = Pick<
  Tables<"match_events">,
  | "id"
  | "player_id"
  | "type"
  | "minute"
  | "stoppage_time"
  | "notes"
  | "created_at"
>;

export type SocialMatchDetail = {
  callups: SocialCallup[];
  events: SocialEvent[];
};

export type SocialGeneratorData = {
  team: SocialBranding;
  seasons: SocialSeason[];
  activeSeason: SocialSeason | null;
  selectedFilter: string;
  selectedSeason: SocialSeason | null;
  snapshot: StatisticsSnapshot;
  matches: SocialMatch[];
  players: SocialPlayer[];
  selectedMatch: SocialMatch | null;
  selectedDetail: SocialMatchDetail | null;
};

export type SocialGoalScorer = {
  player: SocialPlayer;
  goals: number;
};

export type SocialContent = {
  kind: SocialTemplateKind;
  title: string;
  eyebrow: string;
  opponent: string;
  score: string | null;
  competition: string | null;
  venue: string | null;
  kickoffAt: string | null;
  season: string | null;
  goalScorers: SocialGoalScorer[];
  playerOfMatch: SocialPlayer | null;
  topScorer: PlayerStatistics | null;
  lineup: SocialPlayer[];
};

export function getPlayerDisplayName(player: {
  first_name: string;
  last_name: string | null;
  nickname?: string | null;
}) {
  return (
    player.nickname?.trim() ||
    [player.first_name, player.last_name].filter(Boolean).join(" ").trim() ||
    "Player"
  );
}

export function getInitials(value: string, fallback = "?") {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return fallback;
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export function getTeamInitials(
  team: Pick<SocialBranding, "name" | "short_name">,
) {
  return getInitials(team.short_name?.trim() || team.name, "TM");
}

export function safeSocialColor(value: string | null, fallback: string) {
  return value && /^#[0-9A-Fa-f]{6}$/.test(value) ? value : fallback;
}

export function getMatchScore(
  match: Pick<SocialMatch, "team_score" | "opponent_score">,
) {
  if (match.team_score === null || match.opponent_score === null) return null;
  return `${match.team_score}–${match.opponent_score}`;
}

function comparePlayers(left: SocialPlayer, right: SocialPlayer) {
  return (
    getPlayerDisplayName(left).localeCompare(
      getPlayerDisplayName(right),
      undefined,
      {
        sensitivity: "base",
      },
    ) || left.id.localeCompare(right.id)
  );
}

export function getGoalScorers(
  events: SocialEvent[],
  players: Map<string, SocialPlayer>,
) {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.type === "goal" && players.has(event.player_id)) {
      counts.set(event.player_id, (counts.get(event.player_id) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([playerId, goals]) => {
      const player = players.get(playerId);
      return player ? { player, goals } : null;
    })
    .filter((scorer): scorer is SocialGoalScorer => scorer !== null)
    .sort(
      (left, right) =>
        right.goals - left.goals || comparePlayers(left.player, right.player),
    );
}

export function getPlayerOfTheMatch(
  events: SocialEvent[],
  players: Map<string, SocialPlayer>,
) {
  const goalScorers = getGoalScorers(events, players);
  if (goalScorers.length === 0) return null;
  const cards = new Map<string, number>();
  for (const event of events) {
    if (
      (event.type === "yellow_card" || event.type === "red_card") &&
      players.has(event.player_id)
    ) {
      cards.set(event.player_id, (cards.get(event.player_id) ?? 0) + 1);
    }
  }
  return (
    [...goalScorers].sort(
      (left, right) =>
        right.goals - left.goals ||
        (cards.get(left.player.id) ?? 0) - (cards.get(right.player.id) ?? 0) ||
        comparePlayers(left.player, right.player),
    )[0]?.player ?? null
  );
}

export function getTopScorerWithProfile(
  snapshot: StatisticsSnapshot,
  players: Map<string, SocialPlayer>,
) {
  const statistic = getTopScorer(snapshot.players);
  if (!statistic) return null;
  return {
    statistic,
    profile: players.get(statistic.player_id) ?? null,
  };
}

export function getSocialContent(
  kind: SocialTemplateKind,
  team: SocialBranding,
  season: SocialSeason | null,
  match: SocialMatch | null,
  detail: SocialMatchDetail | null,
  players: SocialPlayer[],
  snapshot: StatisticsSnapshot,
  labels: {
    result: string;
    upcoming: string;
    topScorer: string;
    playerOfMatch: string;
    lineup: string;
  },
): SocialContent {
  const playerMap = new Map(players.map((player) => [player.id, player]));
  const matchEvents = detail?.events ?? [];
  const callupIds = new Set(detail?.callups.map(({ player_id }) => player_id));
  const lineup = players
    .filter((player) => callupIds.has(player.id))
    .sort((left, right) => {
      const leftNumber = left.shirt_number ?? Number.MAX_SAFE_INTEGER;
      const rightNumber = right.shirt_number ?? Number.MAX_SAFE_INTEGER;
      return leftNumber - rightNumber || comparePlayers(left, right);
    });
  const goalScorers = getGoalScorers(matchEvents, playerMap);
  const topScorer = getTopScorer(snapshot.players);
  return {
    kind,
    title: labels[kind],
    eyebrow: team.name,
    opponent: match?.opponent_name ?? "",
    score: match ? getMatchScore(match) : null,
    competition: match?.competition ?? null,
    venue: match?.venue ?? null,
    kickoffAt: match?.kickoff_at ?? null,
    season: season?.name ?? match?.season_name ?? null,
    goalScorers,
    playerOfMatch: getPlayerOfTheMatch(matchEvents, playerMap),
    topScorer,
    lineup,
  };
}

export function getSocialCaption(
  content: SocialContent,
  platform: SocialPlatform,
  labels: {
    result: string;
    upcoming: string;
    topScorer: string;
    playerOfMatch: string;
    lineup: string;
    vs: string;
    goals: string;
    goal: string;
    topScorerLine: string;
    playerOfMatchLine: string;
    lineupLine: string;
  },
) {
  const header =
    content.kind === "upcoming"
      ? `${labels.upcoming}: ${content.eyebrow} ${labels.vs} ${content.opponent}`
      : content.score
        ? `${content.eyebrow} ${content.score} ${content.opponent}`
        : `${labels[content.kind]}: ${content.eyebrow}`;
  const details = [content.competition, content.season]
    .filter(Boolean)
    .join(" · ");
  const scorerLine = content.goalScorers.length
    ? `${labels.goals}: ${content.goalScorers
        .map(({ player, goals }) => `${getPlayerDisplayName(player)} ${goals}×`)
        .join(", ")}`
    : "";
  const topScorerLine = content.topScorer
    ? labels.topScorerLine.replace(
        "{player}",
        getPlayerDisplayNameFromStatistics(content.topScorer),
      )
    : "";
  const playerOfMatchLine = content.playerOfMatch
    ? labels.playerOfMatchLine.replace(
        "{player}",
        getPlayerDisplayName(content.playerOfMatch),
      )
    : "";
  const lineupLine = content.lineup.length
    ? labels.lineupLine.replace("{count}", String(content.lineup.length))
    : "";
  const lines = [
    header,
    details,
    content.kind === "result" ? scorerLine : "",
    content.kind === "topScorer" ? topScorerLine : "",
    content.kind === "playerOfMatch" ? playerOfMatchLine : "",
    content.kind === "lineup" ? lineupLine : "",
  ].filter(Boolean);
  const hashtag = platform === "x" ? " #Matchday" : "\n#Matchday";
  return `${lines.join("\n")}${hashtag}`;
}

export function getExportFileName(
  teamName: string,
  kind: SocialTemplateKind,
  matchId?: string,
) {
  const safeTeam =
    teamName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "team";
  return `matchday-${safeTeam}-${kind}${matchId ? `-${matchId.slice(0, 8)}` : ""}.png`;
}
