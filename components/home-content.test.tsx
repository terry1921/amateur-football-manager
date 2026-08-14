import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import { HomeContent } from "./home-content";

vi.mock("@/components/language-switcher", () => ({
  LanguageSwitcher: () => <div />,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

describe("HomeContent", () => {
  it("shows the Free and Pro plan comparison with their limits and benefits", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <HomeContent locale="en" />
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Start free. Grow with Pro." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Free" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pro" })).toBeInTheDocument();
    expect(screen.getByText("Up to 30 players")).toBeInTheDocument();
    expect(screen.getByText("Unlimited players")).toBeInTheDocument();
    expect(
      screen.getByText("Advanced statistics and full leaderboards"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Compare plans" })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });
});
