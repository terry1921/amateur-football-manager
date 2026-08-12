import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getBillingConfig: vi.fn(),
  getTeamAccess: vi.fn(),
}));

vi.mock("@/features/billing/config", () => ({
  getBillingConfig: mocks.getBillingConfig,
}));

vi.mock("@/features/teams/access", () => ({
  getTeamAccess: mocks.getTeamAccess,
}));

vi.mock("@/features/billing/pricing-page", () => ({
  PricingPage: ({
    checkoutStatus,
    teamId,
    checkoutAvailable,
  }: {
    checkoutStatus: string;
    teamId?: string;
    checkoutAvailable?: boolean;
  }) => (
    <output
      data-checkout-available={String(checkoutAvailable)}
      data-checkout-status={checkoutStatus}
      data-team-id={teamId ?? ""}
    />
  ),
}));

import PricingRoute from "./page";

describe("PricingRoute", () => {
  it("passes the authenticated server team to checkout without exposing plan configuration", async () => {
    mocks.getTeamAccess.mockResolvedValue({
      team: { id: "11111111-1111-4111-8111-111111111111" },
    });
    mocks.getBillingConfig.mockReturnValue({});

    render(
      await PricingRoute({
        searchParams: Promise.resolve({ checkout: "success" }),
      }),
    );

    expect(screen.getByRole("status")).toHaveAttribute(
      "data-team-id",
      "11111111-1111-4111-8111-111111111111",
    );
    expect(screen.getByRole("status")).toHaveAttribute(
      "data-checkout-available",
      "true",
    );
    expect(screen.getByRole("status")).toHaveAttribute(
      "data-checkout-status",
      "success",
    );
  });
});
