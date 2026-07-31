import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import type { MatchCallupPlayer } from "@/features/matches/model";
import { ResultForm } from "./result-form";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={`/en${href}`} {...props}>
      {children}
    </a>
  ),
}));

const players: MatchCallupPlayer[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    first_name: "Marco",
    last_name: "Guerrero",
    nickname: null,
    shirt_number: 9,
    position: "FWD",
    status: "active",
    callup_status: "called_up",
  },
];

function renderForm() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ResultForm
        action={vi.fn(async () => ({ status: "idle" as const }))}
        teamName="Loros FC"
        opponentName="Verona FC"
        location="home"
        cancelHref="/matches/match-a"
        players={players}
        initialEvents={[]}
      />
    </NextIntlClientProvider>,
  );
}

describe("ResultForm", () => {
  it("blocks submission when team goals and goal events disagree", () => {
    renderForm();
    fireEvent.change(screen.getByRole("spinbutton", { name: /Home score/ }), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Goal" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The score shows 2 team goals, but 1 goal event has been recorded.",
    );
    expect(
      screen.getByRole("button", { name: "Record result" }),
    ).toBeDisabled();
  });

  it("adds an editable player event with a removable accessible control", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Add Goal" }));

    expect(screen.getByRole("combobox", { name: "Player" })).toHaveValue(
      players[0].id,
    );
    expect(screen.getByRole("spinbutton", { name: "Minute" })).toHaveValue(0);
    expect(
      screen.getByRole("button", { name: "Remove Goal" }),
    ).toBeInTheDocument();
  });
});
