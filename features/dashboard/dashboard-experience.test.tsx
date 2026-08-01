import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import {
  DashboardExperience,
  DashboardLoadError,
} from "./dashboard-experience";
import {
  getDashboardAttentionItems,
  getPrimaryDashboardAction,
  type DashboardFacts,
  type DashboardSuccessData,
} from "./model";
import { getTeamSetupProgress } from "./progress";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={`/en${href}`} {...props}>
      {children}
    </a>
  ),
}));

const newTeamFacts: DashboardFacts = {
  teamExists: true,
  seasonExists: false,
  playerCount: 0,
  matchExists: false,
  callupExists: false,
  completedResultExists: false,
};

function dashboardData(
  facts: DashboardFacts,
  overrides: Partial<DashboardSuccessData> = {},
): DashboardSuccessData {
  const activeSeason = overrides.activeSeason ?? null;
  const upcomingMatch = overrides.upcomingMatch ?? null;
  const playerCount = overrides.playerCount ?? facts.playerCount;
  const activePlayerCount = overrides.activePlayerCount ?? facts.playerCount;
  const matchCount = facts.matchExists ? 1 : 0;
  return {
    status: "success",
    team: {
      id: "team-a",
      name: "Loros FC",
      short_name: "Loros",
      city: "Mexico City",
      country: "Mexico",
      primary_color: "#00A331",
      secondary_color: "#071A36",
    },
    progress: getTeamSetupProgress(facts),
    seasonCount: facts.seasonExists ? 1 : 0,
    activeSeason,
    playerCount,
    activePlayerCount,
    unavailablePlayerCount: 0,
    squadSummary: {
      total: playerCount,
      available: activePlayerCount,
      unavailable: 0,
      injured: 0,
      suspended: 0,
      inactive: 0,
    },
    primaryAction: getPrimaryDashboardAction({
      activeSeason,
      playerCount,
      activePlayerCount,
      matchCount,
      upcomingMatch,
    }),
    attentionItems: getDashboardAttentionItems({
      activeSeason,
      playerCount,
      activePlayerCount,
      upcomingMatch,
      pastUnresolvedMatch: null,
    }),
    upcomingMatch,
    upcomingMatches: upcomingMatch ? [upcomingMatch] : [],
    pastUnresolvedMatch: null,
    recentResult: null,
    recentFixture: null,
    ...overrides,
  };
}

function renderDashboard(data: DashboardSuccessData) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <DashboardExperience data={data} />
    </NextIntlClientProvider>,
  );
}

describe("DashboardExperience", () => {
  it("renders the welcome, progress, guidance, and empty states for a new team", () => {
    renderDashboard(dashboardData(newTeamFacts));

    expect(
      screen.getByRole("heading", { name: "Welcome to Matchday" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 of 6 completed")).toBeInTheDocument();
    expect(screen.getAllByText("No active season").length).toBeGreaterThan(0);
    expect(screen.getByText("No players yet")).toBeInTheDocument();
    expect(screen.getByText("No upcoming match")).toBeInTheDocument();
    expect(screen.getByText("No completed matches")).toBeInTheDocument();
    expect(screen.getByText("No recent activity")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Team setup progress" }),
    ).toHaveAttribute("aria-valuenow", "17");
  });

  it("renders partial real data and recommends the first missing step", () => {
    renderDashboard(
      dashboardData(
        { ...newTeamFacts, seasonExists: true, playerCount: 4 },
        {
          seasonCount: 1,
          activeSeason: {
            id: "season-a",
            name: "Apertura 2026",
            status: "active",
            start_date: null,
            end_date: null,
          },
        },
      ),
    );

    expect(screen.getByText("3 of 6 completed")).toBeInTheDocument();
    expect(screen.getByText("4 players")).toBeInTheDocument();
    expect(screen.queryByText("No players yet")).not.toBeInTheDocument();
    expect(
      screen.getAllByText("Schedule your first match").length,
    ).toBeGreaterThan(0);
    const matchLinks = screen.getAllByRole("link", {
      name: "Schedule a match",
    });
    expect(
      matchLinks.some((link) => link.getAttribute("href") === "/en/matches"),
    ).toBe(true);
    expect(
      matchLinks.some(
        (link) => link.getAttribute("href") === "/en/matches/new",
      ),
    ).toBe(true);
  });

  it("makes operational data primary and compacts completed setup", () => {
    const data = dashboardData(
      {
        teamExists: true,
        seasonExists: true,
        playerCount: 18,
        matchExists: true,
        callupExists: true,
        completedResultExists: true,
      },
      {
        seasonCount: 1,
        activeSeason: {
          id: "season-a",
          name: "Apertura 2026",
          status: "active",
          start_date: null,
          end_date: null,
        },
        playerCount: 18,
        upcomingMatch: {
          id: "upcoming-match",
          season_id: "season-a",
          opponent_name: "Verona FC",
          kickoff_at: "2026-08-11T21:10:00.000Z",
          home_away: "home",
          venue: "Torneo del Barrio HG",
          team_score: null,
          opponent_score: null,
          status: "scheduled",
          callup_count: 3,
        },
        recentResult: {
          id: "recent-result",
          season_id: "season-a",
          opponent_name: "Halcones",
          kickoff_at: "2026-07-20T21:10:00.000Z",
          home_away: "away",
          venue: null,
          team_score: 3,
          opponent_score: 1,
          status: "completed",
          callup_count: 0,
        },
        dashboardStatistics: {
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
              player_id: "top-scorer",
              first_name: "Marco",
              last_name: "Guerrero",
              nickname: null,
              shirt_number: 9,
              position: "FWD",
              status: "active",
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
        },
      },
    );

    const { container } = renderDashboard(data);

    expect(
      screen.getByText("Loros FC is ready for matchday."),
    ).toBeInTheDocument();
    expect(screen.getByText("Apertura 2026")).toBeInTheDocument();
    expect(screen.getByText("18 players")).toBeInTheDocument();
    expect(screen.getByText("Loros FC 3–1 Halcones")).toBeInTheDocument();
    expect(screen.getByText("Season statistics")).toBeInTheDocument();
    expect(screen.getByText("Marco Guerrero (2)")).toBeInTheDocument();
    expect(screen.getByText("Most called-up")).toBeInTheDocument();
    expect(screen.getByText("Discipline leader")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open leaderboards" }),
    ).toHaveAttribute("href", "/en/leaderboards");
    expect(screen.getByRole("link", { name: "Verona FC" })).toHaveAttribute(
      "href",
      "/en/matches/upcoming-match",
    );
    expect(screen.getByText("Call-up ready · 3 players")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "Manage call-up" })
        .some(
          (link) =>
            link.getAttribute("href") === "/en/matches/upcoming-match/call-up",
        ),
    ).toBe(true);
    expect(screen.getByText("Setup complete")).toBeInTheDocument();
    expect(container.querySelector("details")).not.toHaveAttribute("open");
  });

  it("marks an upcoming match without selected players as call-up incomplete", () => {
    renderDashboard(
      dashboardData(
        {
          ...newTeamFacts,
          seasonExists: true,
          playerCount: 4,
          matchExists: true,
        },
        {
          seasonCount: 1,
          upcomingMatch: {
            id: "empty-callup-match",
            season_id: "season-a",
            opponent_name: "Halcones",
            kickoff_at: "2026-08-11T21:10:00.000Z",
            home_away: "away",
            venue: null,
            team_score: null,
            opponent_score: null,
            status: "scheduled",
            callup_count: 0,
          },
        },
      ),
    );

    expect(screen.getByText("Call-up not started")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "Create call-up" })
        .some(
          (link) =>
            link.getAttribute("href") ===
            "/en/matches/empty-callup-match/call-up",
        ),
    ).toBe(true);
  });

  it("links the now-available season step to season management", () => {
    renderDashboard(dashboardData(newTeamFacts));

    expect(
      screen.getAllByRole("link", { name: "Create your first season" })[0],
    ).toHaveAttribute("href", "/en/seasons");
    expect(screen.queryByText("Coming in Task 007")).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Add players" })[0],
    ).toHaveAttribute("href", "/en/players");
    expect(screen.queryByText("Coming in Task 008")).not.toBeInTheDocument();
  });

  it("renders query failure separately from legitimate empty data", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <DashboardLoadError />
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByRole("heading", {
        name: "We couldn’t load your dashboard",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("No active season")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Refresh dashboard" }),
    ).toHaveAttribute("href", "/en/dashboard");
  });
});
