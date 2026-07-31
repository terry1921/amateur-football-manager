import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import type { MatchSeason } from "./data";
import type { Match } from "./model";
import { MatchManagement } from "./match-management";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={`/en${href}`} {...props}>
      {children}
    </a>
  ),
}));

const seasons: MatchSeason[] = [
  {
    id: "season-a",
    name: "Apertura 2026",
    status: "active",
    start_date: "2026-07-01",
    end_date: "2026-12-31",
  },
];

function match(overrides: Partial<Match> = {}): Match {
  return {
    id: "match-a",
    team_id: "team-a",
    season_id: "season-a",
    opponent_name: "Verona FC",
    opponent_logo_url: null,
    competition: null,
    round: null,
    venue: "Campo Norte",
    kickoff_at: "2026-08-10T18:00:00.000Z",
    home_away: "home",
    status: "scheduled",
    team_score: null,
    opponent_score: null,
    notes: null,
    created_at: "2026-07-30T12:00:00.000Z",
    updated_at: "2026-07-30T12:00:00.000Z",
    season_name: "Apertura 2026",
    has_dependents: false,
    ...overrides,
  };
}

function renderManagement(matches: Match[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <MatchManagement
        matches={matches}
        seasons={seasons}
        initialFilters={{
          search: "",
          season: "all",
          status: "all",
          location: "all",
          group: "all",
        }}
      />
    </NextIntlClientProvider>,
  );
}

describe("MatchManagement", () => {
  it("distinguishes upcoming, unresolved, completed, and cancelled fixtures", () => {
    renderManagement([
      match({
        id: "upcoming",
        opponent_name: "Upcoming United",
        kickoff_at: "2099-08-10T18:00:00.000Z",
      }),
      match({
        id: "overdue",
        opponent_name: "Overdue Athletic",
        kickoff_at: "2020-08-10T18:00:00.000Z",
      }),
      match({
        id: "completed",
        opponent_name: "Completed City",
        status: "completed",
        team_score: 2,
        opponent_score: 1,
      }),
      match({
        id: "cancelled",
        opponent_name: "Cancelled Rovers",
        status: "cancelled",
      }),
    ]);

    expect(
      screen.getByRole("heading", { name: "Upcoming" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Past · unresolved" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Completed" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Cancelled" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2–1")).toBeInTheDocument();
    expect(screen.queryByText("0–0")).not.toBeInTheDocument();
    expect(screen.getAllByText("vs").length).toBeGreaterThan(0);
  });

  it("filters by opponent or venue and distinguishes filtered empty state", () => {
    renderManagement([
      match({ id: "verona", opponent_name: "Verona FC" }),
      match({
        id: "halcones",
        opponent_name: "Halcones",
        venue: "Unidad El Tintero",
      }),
    ]);

    fireEvent.change(screen.getByPlaceholderText("Search opponent or venue"), {
      target: { value: "tintero" },
    });
    expect(screen.getByText("Halcones")).toBeInTheDocument();
    expect(screen.queryByText("Verona FC")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search opponent or venue"), {
      target: { value: "does not exist" },
    });
    expect(
      screen.getByText("No fixtures match these filters"),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Reset filters" }).at(-1)!,
    );
    expect(screen.getByText("Verona FC")).toBeInTheDocument();
  });

  it("renders a first-fixture empty state with the canonical create route", () => {
    renderManagement([]);

    expect(screen.getByText("Schedule your first match")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "Schedule a match" })
        .every((link) => link.getAttribute("href") === "/en/matches/new"),
    ).toBe(true);
  });
});
