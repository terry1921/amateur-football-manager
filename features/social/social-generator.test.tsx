import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import type { SocialGeneratorData } from "./model";
import { SocialGenerator } from "./social-generator";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={"/en" + href} {...props}>
      {children}
    </a>
  ),
}));

const data: SocialGeneratorData = {
  team: {
    id: "team-1",
    name: "Loros FC",
    short_name: "Loros",
    logo_url: null,
    primary_color: "#00a331",
    secondary_color: "#071a36",
  },
  seasons: [
    {
      id: "season-1",
      name: "Apertura 2026",
      status: "active",
      start_date: null,
      end_date: null,
    },
  ],
  activeSeason: {
    id: "season-1",
    name: "Apertura 2026",
    status: "active",
    start_date: null,
    end_date: null,
  },
  selectedFilter: "current",
  selectedSeason: {
    id: "season-1",
    name: "Apertura 2026",
    status: "active",
    start_date: null,
    end_date: null,
  },
  snapshot: {
    has_completed_matches: true,
    team: {
      matches_played: 1,
      wins: 1,
      draws: 0,
      losses: 0,
      goals_scored: 1,
      goals_conceded: 0,
      goal_difference: 1,
      yellow_cards: 0,
      red_cards: 0,
    },
    players: [
      {
        player_id: "player-1",
        first_name: "Ana",
        last_name: "Díaz",
        nickname: null,
        shirt_number: 9,
        position: "FWD",
        status: "active",
        total_matches_called_up: 1,
        matches_called_up: 1,
        matches_won: 1,
        matches_drawn: 0,
        matches_lost: 0,
        goals: 1,
        scoring_matches: 1,
        multi_goal_matches: 0,
        yellow_cards: 0,
        red_cards: 0,
      },
    ],
  },
  matches: [
    {
      id: "match-1",
      team_id: "team-1",
      season_id: "season-1",
      opponent_name: "Abejas FC",
      opponent_logo_url: null,
      competition: "Liga",
      round: null,
      venue: "Cancha Norte",
      kickoff_at: "2026-08-01T18:00:00.000Z",
      home_away: "home",
      status: "completed",
      team_score: 1,
      opponent_score: 0,
      season_name: "Apertura 2026",
    },
  ],
  players: [
    {
      id: "player-1",
      team_id: "team-1",
      first_name: "Ana",
      last_name: "Díaz",
      nickname: null,
      shirt_number: 9,
      position: "FWD",
      photo_url: null,
      status: "active",
    },
  ],
  selectedMatch: null,
  selectedDetail: null,
};

describe("SocialGenerator", () => {
  it("exposes all templates, responsive preview controls, export, and caption actions", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <SocialGenerator
          data={{
            ...data,
            selectedMatch: data.matches[0],
            selectedDetail: {
              callups: [{ player_id: "player-1", status: "called_up" }],
              events: [
                {
                  id: "event-1",
                  player_id: "player-1",
                  type: "goal",
                  minute: 12,
                  stoppage_time: 0,
                  notes: null,
                  created_at: "2026-08-01T18:12:00.000Z",
                },
              ],
            },
          }}
        />
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Social media generator" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Match result/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Upcoming match/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Top scorer/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Player of the Match/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lineup/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Export high-resolution PNG" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Instagram caption" }),
    ).toHaveValue(
      "Loros FC 1–0 Abejas FC\nLiga · Apertura 2026\nGoal scorers: Ana Díaz 1×\n#Matchday",
    );
    expect(
      screen.getByRole("img", { name: "Loros FC logo" }),
    ).toHaveTextContent("LO");
  });
});
