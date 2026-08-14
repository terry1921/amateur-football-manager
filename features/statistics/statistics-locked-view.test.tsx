import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import messages from "@/messages/en.json";
import { StatisticsLockedView } from "./statistics-locked-view";

describe("StatisticsLockedView", () => {
  it("renders the Pro invitation with the localized statistics copy", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <StatisticsLockedView teamId="team-1" checkoutAvailable />
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Unlock advanced statistics" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pro feature")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Learn about Pro" }),
    ).toBeInTheDocument();
  });
});
