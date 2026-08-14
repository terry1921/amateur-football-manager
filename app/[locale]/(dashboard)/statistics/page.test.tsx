import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { appError } from "@/lib/errors/error-codes";

const mocks = vi.hoisted(() => ({
  getBillingConfig: vi.fn(),
  getStatisticsData: vi.fn(),
  getTeamAccess: vi.fn(),
}));

vi.mock("@/features/billing/config", () => ({
  getBillingConfig: mocks.getBillingConfig,
}));

vi.mock("@/features/statistics/data", () => ({
  getStatisticsData: mocks.getStatisticsData,
}));

vi.mock("@/features/teams/access", () => ({
  getTeamAccess: mocks.getTeamAccess,
}));

vi.mock("@/features/statistics/statistics-view", () => ({
  StatisticsView: () => <div>statistics-view</div>,
}));

vi.mock("@/features/statistics/statistics-locked-view", () => ({
  StatisticsLockedView: ({
    teamId,
    checkoutAvailable,
  }: {
    teamId: string;
    checkoutAvailable: boolean;
  }) => (
    <output
      role="status"
      data-checkout-available={String(checkoutAvailable)}
      data-team-id={teamId}
    >
      upgrade-statistics
    </output>
  ),
}));

import StatisticsPage from "./page";

describe("StatisticsPage", () => {
  it("renders the Pro upgrade state when advanced statistics are unavailable", async () => {
    mocks.getStatisticsData.mockRejectedValue(
      appError({
        code: "ENTITLEMENT_REQUIRED",
        category: "authorization",
        recoverable: false,
        retryable: false,
      }),
    );
    mocks.getTeamAccess.mockResolvedValue({
      team: { id: "team-1" },
    });
    mocks.getBillingConfig.mockReturnValue({});

    render(
      await StatisticsPage({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole("status")).toHaveTextContent("upgrade-statistics");
    expect(screen.getByRole("status")).toHaveAttribute(
      "data-team-id",
      "team-1",
    );
    expect(screen.getByRole("status")).toHaveAttribute(
      "data-checkout-available",
      "true",
    );
  });
});
