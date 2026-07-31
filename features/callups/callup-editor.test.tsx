import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import type { CallupMatch, CallupPlayer } from "./model";
import { CallupEditor } from "./callup-editor";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={`/en${href}`} {...props}>
      {children}
    </a>
  ),
}));

const match: CallupMatch = {
  id: "10000000-0000-4000-8000-000000000010",
  season_id: "10000000-0000-4000-8000-000000000020",
  season_name: "Apertura 2026",
  opponent_name: "Verona FC",
  kickoff_at: "2026-08-10T19:00:00.000Z",
  home_away: "home",
  status: "scheduled",
  venue: "Campo Central",
};

function player(
  id: string,
  overrides: Partial<CallupPlayer> = {},
): CallupPlayer {
  return {
    id,
    first_name: id,
    last_name: null,
    nickname: null,
    shirt_number: null,
    position: "MID",
    status: "active",
    selected: false,
    callup_status: null,
    ...overrides,
  };
}

const players = [
  player("keeper", {
    first_name: "Ana",
    last_name: "Keeper",
    shirt_number: 1,
    position: "GK",
    selected: true,
    callup_status: "called_up",
  }),
  player("defender", {
    first_name: "Bea",
    last_name: "Defender",
    shirt_number: 4,
    position: "DEF",
  }),
  player("injured", {
    first_name: "Carla",
    last_name: "Injured",
    position: "FWD",
    status: "injured",
    selected: true,
    callup_status: "called_up",
  }),
  player("inactive", {
    first_name: "Diana",
    status: "inactive",
  }),
];

function renderEditor(
  overrides: Partial<React.ComponentProps<typeof CallupEditor>> = {},
) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <CallupEditor
        match={match}
        players={players}
        lastUpdated="2026-07-30T12:00:00.000Z"
        {...overrides}
      />
    </NextIntlClientProvider>,
  );
}

describe("CallupEditor", () => {
  it("shows the selected squad grouped by position and explains unavailable players", () => {
    renderEditor();

    expect(screen.getByText("2 players selected")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Goalkeepers" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Forwards" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Injured — cannot be newly selected"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Inactive — cannot be newly selected"),
    ).toBeInTheDocument();
    expect(screen.getByText("Last updated")).toBeInTheDocument();
  });

  it("selects all active players, retains unavailable history, and can clear everything", () => {
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Select all active" }));
    expect(screen.getByRole("checkbox", { name: "Ana Keeper" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Bea Defender" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Carla Injured" }),
    ).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Diana" })).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(
      screen.getByRole("checkbox", { name: "Ana Keeper" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Carla Injured" }),
    ).not.toBeChecked();
  });

  it("filters by search, position, status, and selection", () => {
    renderEditor();

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search players" }),
      {
        target: { value: "Bea" },
      },
    );
    expect(screen.getByText("Bea Defender")).toBeInTheDocument();
    expect(screen.queryByText("Ana Keeper")).not.toBeInTheDocument();

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search players" }),
      {
        target: { value: "" },
      },
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Position" }), {
      target: { value: "FWD" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Player status" }), {
      target: { value: "injured" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Selection" }), {
      target: { value: "selected" },
    });
    expect(
      screen.getByRole("checkbox", { name: "Carla Injured" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: "Bea Defender" }),
    ).not.toBeInTheDocument();
  });

  it("renders completed and cancelled call-ups as read-only history", () => {
    renderEditor({ match: { ...match, status: "completed" } });

    expect(screen.getByText("This call-up is read-only.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save call-up" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Select all active" }),
    ).not.toBeInTheDocument();
  });

  it("guides teams with no players to player management", () => {
    renderEditor({ players: [] });

    expect(
      screen.getByText("Add players before creating a call-up."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Players" })).toHaveAttribute(
      "href",
      "/en/players",
    );
  });

  it("contains no lineup, captain, bench, or event controls", () => {
    renderEditor();
    expect(screen.queryByText("Starting XI")).not.toBeInTheDocument();
    expect(screen.queryByText("Captain")).not.toBeInTheDocument();
    expect(screen.queryByText("Bench")).not.toBeInTheDocument();
    expect(screen.queryByText("Goal")).not.toBeInTheDocument();
  });
});
