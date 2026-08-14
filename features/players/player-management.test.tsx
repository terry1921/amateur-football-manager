import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import type { Player } from "./model";
import { PlayerManagement } from "./player-management";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("./actions", () => ({
  changePlayerStatusAction: vi.fn(),
}));

function createPlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `player-${index}`,
    team_id: "team-1",
    first_name: `Player ${index}`,
    last_name: null,
    nickname: null,
    shirt_number: index,
    position: "DEF",
    photo_url: null,
    status: "active",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  }));
}

describe("PlayerManagement", () => {
  it("opens the Pro invitation instead of the player form at the Free limit", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <PlayerManagement
          players={createPlayers(30)}
          playerLimit={30}
          teamId="team-1"
          checkoutAvailable
        />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add player" }));

    expect(
      screen.getByRole("dialog", { name: "Free plan limit reached" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The Free plan includes up to 30 players. Upgrade to Pro to add more.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Add player" }),
    ).not.toBeInTheDocument();
  });
});
