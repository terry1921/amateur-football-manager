import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import type { StatisticsSnapshot } from "@/features/statistics/model";
import {
  LeaderboardsView,
  type LeaderboardsViewData,
} from "./leaderboards-view";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={`/en${href}`} {...props}>
      {children}
    </a>
  ),
}));

const snapshot: StatisticsSnapshot = {
  has_completed_matches: true,
  team: {
    matches_played: 2,
    wins: 1,
    draws: 1,
    losses: 0,
    goals_scored: 3,
    goals_conceded: 1,
    goal_difference: 2,
    yellow_cards: 1,
    red_cards: 0,
  },
  players: [
    {
      player_id: "player-a",
      first_name: "Ana",
      last_name: "Díaz",
      nickname: null,
      shirt_number: 10,
      position: "FWD",
      status: "active",
      total_matches_called_up: 2,
      matches_called_up: 2,
      matches_won: 1,
      matches_drawn: 1,
      matches_lost: 0,
      goals: 2,
      scoring_matches: 1,
      multi_goal_matches: 1,
      yellow_cards: 0,
      red_cards: 0,
    },
    {
      player_id: "player-b",
      first_name: "Luis",
      last_name: "Soto",
      nickname: null,
      shirt_number: 4,
      position: "DEF",
      status: "active",
      total_matches_called_up: 2,
      matches_called_up: 2,
      matches_won: 1,
      matches_drawn: 1,
      matches_lost: 0,
      goals: 0,
      scoring_matches: 0,
      multi_goal_matches: 0,
      yellow_cards: 1,
      red_cards: 0,
    },
    {
      player_id: "player-c",
      first_name: "Cora",
      last_name: "Vega",
      nickname: null,
      shirt_number: 5,
      position: "MID",
      status: "active",
      total_matches_called_up: 1,
      matches_called_up: 1,
      matches_won: 0,
      matches_drawn: 0,
      matches_lost: 1,
      goals: 0,
      scoring_matches: 0,
      multi_goal_matches: 0,
      yellow_cards: 0,
      red_cards: 1,
    },
  ],
};

function renderView(overrides: Partial<LeaderboardsViewData> = {}) {
  const data: LeaderboardsViewData = {
    team: { name: "Loros FC" },
    seasons: [
      {
        id: "season-a",
        name: "Apertura 2026",
        status: "active",
        start_date: null,
        end_date: null,
      },
    ],
    activeSeason: {
      id: "season-a",
      name: "Apertura 2026",
      status: "active",
      start_date: null,
      end_date: null,
    },
    selectedFilter: "current",
    selectedSeason: {
      id: "season-a",
      name: "Apertura 2026",
      status: "active",
      start_date: null,
      end_date: null,
    },
    snapshot,
    players: snapshot.players,
    filters: { search: "", position: "all", status: "all" },
    ...overrides,
  };
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <LeaderboardsView data={data} />
    </NextIntlClientProvider>,
  );
}

describe("LeaderboardsView", () => {
  it("renders accessible ranking tables, awards, filters, and player links", () => {
    renderView();

    expect(
      screen.getByRole("heading", { name: "Leaderboards" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("table")).toHaveLength(4);
    expect(screen.getAllByRole("columnheader", { name: "Rank" })).toHaveLength(
      4,
    );
    expect(
      screen.getAllByRole("link", { name: "Ana Díaz" })[0],
    ).toHaveAttribute("href", "/en/players/player-a");
    expect(screen.getByText("Golden Boot")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Most called-up players" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Search players")).toBeInTheDocument();
  });

  it("shows the completed-match empty state before rendering rankings", () => {
    renderView({
      snapshot: { ...snapshot, has_completed_matches: false },
      players: [],
    });

    expect(screen.getByText("No completed matches yet")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
