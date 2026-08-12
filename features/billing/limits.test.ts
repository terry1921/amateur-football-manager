import { describe, expect, it } from "vitest";
import * as billingModel from "./model";

const now = new Date("2026-08-12T12:00:00.000Z");

function subscription(plan: "free" | "pro") {
  return billingModel.resolveTeamSubscription(
    "team-a",
    plan === "pro"
      ? {
          id: "subscription-a",
          plan,
          status: "active",
          cancel_at_period_end: false,
          current_period_start: "2026-08-01T00:00:00.000Z",
          current_period_end: "2026-09-01T00:00:00.000Z",
        }
      : null,
    now,
  );
}

describe("billing limits", () => {
  it("blocks a Free team from creating player 31 without altering its existing roster", () => {
    const canCreate = (billingModel as Record<string, unknown>)
      .canCreateWithinLimit as
      | ((
          subscription: billingModel.ResolvedTeamSubscription,
          limit: "maxPlayers",
          currentCount: number,
        ) => boolean)
      | undefined;

    expect(canCreate?.(subscription("free"), "maxPlayers", 30)).toBe(false);
    expect(canCreate?.(subscription("free"), "maxPlayers", 31)).toBe(false);
  });

  it("allows a Free team to access only its newest historical season", () => {
    const canAccessHistoricalSeason = (billingModel as Record<string, unknown>)
      .canAccessHistoricalSeason as
      | ((
          subscription: billingModel.ResolvedTeamSubscription,
          historicalSeasonIndex: number,
        ) => boolean)
      | undefined;

    expect(canAccessHistoricalSeason?.(subscription("free"), 0)).toBe(true);
    expect(canAccessHistoricalSeason?.(subscription("free"), 1)).toBe(false);
  });

  it("allows a Free team to use only its included social template", () => {
    const canUseSocialTemplate = (billingModel as Record<string, unknown>)
      .canUseSocialTemplate as
      | ((
          subscription: billingModel.ResolvedTeamSubscription,
          templateIndex: number,
        ) => boolean)
      | undefined;

    expect(canUseSocialTemplate?.(subscription("free"), 0)).toBe(true);
    expect(canUseSocialTemplate?.(subscription("free"), 1)).toBe(false);
    expect(canUseSocialTemplate?.(subscription("pro"), 99)).toBe(true);
  });

  it("returns a bounded leaderboard preview for Free and all rows for Pro", () => {
    const limitLeaderboardRows = (billingModel as Record<string, unknown>)
      .limitLeaderboardRows as
      | (<T>(
          subscription: billingModel.ResolvedTeamSubscription,
          rows: readonly T[],
        ) => { rows: T[]; isPreview: boolean })
      | undefined;
    const rows = Array.from({ length: 12 }, (_, index) => index + 1);

    expect(limitLeaderboardRows?.(subscription("free"), rows)).toEqual({
      rows: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      isPreview: true,
    });
    expect(limitLeaderboardRows?.(subscription("pro"), rows)).toEqual({
      rows,
      isPreview: false,
    });
  });

  it("centralizes every Premium capability behind the resolved subscription", () => {
    const hasPremiumFeature = (billingModel as Record<string, unknown>)
      .hasPremiumFeature as
      | ((
          subscription: billingModel.ResolvedTeamSubscription,
          feature: billingModel.Entitlement,
        ) => boolean)
      | undefined;

    for (const feature of billingModel.entitlements) {
      expect(hasPremiumFeature?.(subscription("free"), feature)).toBe(false);
      expect(hasPremiumFeature?.(subscription("pro"), feature)).toBe(true);
    }
  });
});
