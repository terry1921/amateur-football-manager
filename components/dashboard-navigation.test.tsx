import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import { DashboardNavigation } from "./dashboard-navigation";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
  usePathname: () => "/dashboard",
}));

function renderNavigation() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <DashboardNavigation />
    </NextIntlClientProvider>,
  );
}

describe("DashboardNavigation mobile shell", () => {
  it("keeps the primary navigation to four destinations plus More", () => {
    renderNavigation();

    expect(screen.getByRole("button", { name: "More" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getAllByRole("link", { name: "Dashboard" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Matches" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Players" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Statistics" })).toHaveLength(2);
    expect(
      screen.queryByRole("link", { name: "Content" }),
    ).not.toBeInTheDocument();
  });

  it("opens an accessible More sheet for the secondary destinations", () => {
    renderNavigation();
    const moreButton = screen.getByRole("button", { name: "More" });

    fireEvent.click(moreButton);

    expect(moreButton).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById("mobile-more-menu")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Team" })).toHaveLength(2);
    expect(
      screen.queryByRole("link", { name: "Content" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    expect(moreButton).toHaveAttribute("aria-expanded", "false");
  });
});

describe("DashboardNavigation desktop shell", () => {
  it("uses the redesigned active desktop link treatment without Content", () => {
    renderNavigation();

    const dashboardLinks = screen.getAllByRole("link", { name: "Dashboard" });

    expect(dashboardLinks[0]).toHaveAttribute("aria-current", "page");
    expect(dashboardLinks[0]).toHaveClass("min-h-12", "rounded-xl");
    expect(
      screen.queryByRole("link", { name: "Content" }),
    ).not.toBeInTheDocument();
  });
});
