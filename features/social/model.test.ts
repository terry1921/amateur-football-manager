import { describe, expect, it } from "vitest";
import type {
  SocialBranding,
  SocialEvent,
  SocialMatch,
  SocialPlayer,
  SocialSeason,
} from "./model";
import {
  getExportFileName,
  getGoalScorers,
  getInitials,
  getPlayerOfTheMatch,
  getSocialCaption,
  getSocialContent,
  safeSocialColor,
} from "./model";

const branding: SocialBranding = {
  id: "team-1",
  name: "Loros de México",
  short_name: "Loros",
  logo_url: null,
  primary_color: "#00a331",
  secondary_color: "#071a36",
};

const season: SocialSeason = {
  id: "season-1",
  name: "Apertura 2026",
  status: "active",
  start_date: null,
  end_date: null,
};

const match: SocialMatch = {
  id: "match-1",
  team_id: "team-1",
  season_id: "season-1",
  opponent_name: "Abejas FC",
  opponent_logo_url: null,
  competition: "Liga municipal",
  round: "Jornada 2",
  venue: "Cancha Norte",
  kickoff_at: "2026-08-01T18:00:00.000Z",
  home_away: "home",
  status: "completed",
  team_score: 3,
  opponent_score: 1,
  season_name: "Apertura 2026",
};

const players: SocialPlayer[] = [
  {
    id: "p-1",
    team_id: "team-1",
    first_name: "Ana",
    last_name: "Díaz",
    nickname: null,
    shirt_number: 9,
    position: "FWD",
    photo_url: null,
    status: "active",
  },
  {
    id: "p-2",
    team_id: "team-1",
    first_name: "Luis",
    last_name: "Soto",
    nickname: null,
    shirt_number: 4,
    position: "DEF",
    photo_url: null,
    status: "active",
  },
  {
    id: "p-3",
    team_id: "team-1",
    first_name: "Cora",
    last_name: "Vega",
    nickname: null,
    shirt_number: 7,
    position: "MID",
    photo_url: null,
    status: "active",
  },
];

const events: SocialEvent[] = [
  {
    id: "e-1",
    player_id: "p-1",
    type: "goal",
    minute: 12,
    stoppage_time: 0,
    notes: null,
    created_at: "2026-08-01T18:12:00.000Z",
  },
  {
    id: "e-2",
    player_id: "p-1",
    type: "goal",
    minute: 40,
    stoppage_time: 0,
    notes: null,
    created_at: "2026-08-01T18:40:00.000Z",
  },
  {
    id: "e-3",
    player_id: "p-2",
    type: "goal",
    minute: 80,
    stoppage_time: 0,
    notes: null,
    created_at: "2026-08-01T19:20:00.000Z",
  },
  {
    id: "e-4",
    player_id: "p-1",
    type: "yellow_card",
    minute: 55,
    stoppage_time: 0,
    notes: null,
    created_at: "2026-08-01T18:55:00.000Z",
  },
];

const snapshot = {
  has_completed_matches: true,
  team: {
    matches_played: 1,
    wins: 1,
    draws: 0,
    losses: 0,
    goals_scored: 3,
    goals_conceded: 1,
    goal_difference: 2,
    yellow_cards: 1,
    red_cards: 0,
  },
  players: [
    {
      player_id: "p-1",
      first_name: "Ana",
      last_name: "Díaz",
      nickname: null,
      shirt_number: 9,
      position: "FWD" as const,
      status: "active" as const,
      total_matches_called_up: 1,
      matches_called_up: 1,
      matches_won: 1,
      matches_drawn: 0,
      matches_lost: 0,
      goals: 2,
      scoring_matches: 1,
      multi_goal_matches: 1,
      yellow_cards: 1,
      red_cards: 0,
    },
  ],
};

const labels = {
  result: "Match result",
  upcoming: "Upcoming match",
  topScorer: "Top scorer",
  playerOfMatch: "Player of the Match",
  lineup: "Lineup",
};

describe("social model", () => {
  it("groups normalized goal events without changing the source records", () => {
    const result = getGoalScorers(
      events,
      new Map(players.map((player) => [player.id, player])),
    );
    expect(
      result.map(({ player, goals }) => [player.first_name, goals]),
    ).toEqual([
      ["Ana", 2],
      ["Luis", 1],
    ]);
    expect(events).toHaveLength(4);
  });

  it("uses a transparent deterministic player-of-the-match tie break", () => {
    const tiedEvents = [
      { ...events[0], player_id: "p-1" },
      { ...events[1], player_id: "p-2" },
      { ...events[3], player_id: "p-1" },
    ];
    expect(
      getPlayerOfTheMatch(
        tiedEvents,
        new Map(players.map((player) => [player.id, player])),
      ),
    ).toMatchObject({ id: "p-2" });
  });

  it("keeps lineup content tied to recorded call-ups", () => {
    const content = getSocialContent(
      "lineup",
      branding,
      season,
      match,
      { callups: [{ player_id: "p-2", status: "called_up" }], events: [] },
      players,
      snapshot,
      labels,
    );
    expect(content.lineup.map((player) => player.id)).toEqual(["p-2"]);
  });

  it("creates deterministic captions from the selected content", () => {
    const content = getSocialContent(
      "result",
      branding,
      season,
      match,
      { callups: [], events },
      players,
      snapshot,
      labels,
    );
    const caption = getSocialCaption(content, "instagram", {
      ...labels,
      vs: "vs",
      goals: "Goal scorers",
      goal: "goal",
      topScorerLine: "Top scorer: {player}",
      playerOfMatchLine: "Player of the Match: {player}",
      lineupLine: "{count} players called up",
    });
    expect(caption).toContain("Loros de México 3–1 Abejas FC");
    expect(caption).toContain("Ana Díaz 2×");
    expect(caption).toContain("Liga municipal");
    expect(caption).toContain("#Matchday");
  });

  it("uses initials and safe brand fallbacks when assets or colors are absent", () => {
    expect(getInitials("Loros de México")).toBe("LM");
    expect(safeSocialColor("not-a-color", "#071a36")).toBe("#071a36");
    expect(getExportFileName("Loros de México", "result", "match-1234")).toBe(
      "matchday-loros-de-mexico-result-match-12.png",
    );
  });
});
