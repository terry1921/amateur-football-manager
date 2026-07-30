import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import {
  DashboardExperience,
  DashboardLoadError,
} from "./dashboard-experience";
import type { DashboardFacts, DashboardSuccessData } from "./model";
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
    activeSeason: null,
    playerCount: facts.playerCount,
    upcomingMatch: null,
    recentResult: null,
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
    expect(screen.getByText("No active season")).toBeInTheDocument();
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
        { seasonCount: 1 },
      ),
    );

    expect(screen.getByText("3 of 6 completed")).toBeInTheDocument();
    expect(screen.getByText("4 players")).toBeInTheDocument();
    expect(screen.queryByText("No players yet")).not.toBeInTheDocument();
    expect(
      screen.getAllByText("Schedule your first match").length,
    ).toBeGreaterThan(0);
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
        activeSeason: { name: "Apertura 2026", status: "active" },
        playerCount: 18,
        upcomingMatch: {
          opponent_name: "Verona FC",
          kickoff_at: "2026-08-11T21:10:00.000Z",
          venue: "Torneo del Barrio HG",
          team_score: null,
          opponent_score: null,
        },
        recentResult: {
          opponent_name: "Halcones",
          kickoff_at: "2026-07-20T21:10:00.000Z",
          venue: null,
          team_score: 3,
          opponent_score: 1,
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
    expect(screen.getByText("Setup complete")).toBeInTheDocument();
    expect(container.querySelector("details")).not.toHaveAttribute("open");
  });

  it("links the now-available season step to season management", () => {
    renderDashboard(dashboardData(newTeamFacts));

    expect(
      screen.getAllByRole("link", { name: "Create your first season" })[0],
    ).toHaveAttribute("href", "/en/seasons");
    expect(screen.queryByText("Coming in Task 007")).not.toBeInTheDocument();
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
