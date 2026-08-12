import { describe, expect, it } from "vitest";
import { formatBillingDate, proPlan, toBillingOverview } from "./ui-model";

describe("billing UI model", () => {
  it("defines one honest monthly Pro price in Mexican pesos", () => {
    expect(proPlan).toMatchObject({
      id: "pro",
      price: 99,
      currency: "MXN",
      interval: "month",
    });
  });

  it("turns a cancel-at-period-end domain subscription into a resumable UI state", () => {
    expect(
      toBillingOverview({
        teamId: "team-a",
        subscriptionId: "sub-a",
        plan: "pro",
        status: "active",
        isActive: true,
        cancelAtPeriodEnd: true,
        currentPeriodStart: "2026-08-01T00:00:00.000Z",
        currentPeriodEnd: "2026-09-01T00:00:00.000Z",
        entitlements: [],
        limits: {
          maxPlayers: null,
          maxHistoricalSeasons: null,
          maxSocialTemplates: null,
          maxLeaderboardRows: null,
        },
        source: "subscription",
      }),
    ).toMatchObject({
      status: "canceling",
      renewalAt: "2026-09-01T00:00:00.000Z",
    });
  });

  it("formats a renewal date in the viewer locale", () => {
    expect(formatBillingDate("2026-09-04T12:00:00.000Z", "en")).toBe(
      "September 4, 2026",
    );
  });
});
