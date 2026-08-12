import { describe, expect, it } from "vitest";
import {
  hasEntitlement,
  normalizeBillingPlan,
  normalizeSubscriptionStatus,
  resolveTeamSubscription,
  subscriptionHasAccess,
} from "./model";

const now = new Date("2026-08-07T12:00:00.000Z");

describe("billing model", () => {
  it("normalizes unknown plans to the safe Free plan", () => {
    expect(normalizeBillingPlan("pro")).toBe("pro");
    expect(normalizeBillingPlan("enterprise")).toBe("free");
    expect(normalizeBillingPlan(null)).toBe("free");
  });

  it("normalizes provider status variants and fails closed", () => {
    expect(normalizeSubscriptionStatus("past-due")).toBe("past_due");
    expect(normalizeSubscriptionStatus("cancelled")).toBe("canceled");
    expect(normalizeSubscriptionStatus("incomplete_expired")).toBe(
      "incomplete",
    );
    expect(normalizeSubscriptionStatus("future_status")).toBe("incomplete");
  });

  it("keeps canceled subscriptions active through their paid period", () => {
    expect(
      subscriptionHasAccess("canceled", "2026-08-08T00:00:00.000Z", now),
    ).toBe(true);
    expect(
      subscriptionHasAccess("canceled", "2026-08-07T11:59:59.000Z", now),
    ).toBe(false);
    expect(subscriptionHasAccess("past_due", null, now)).toBe(false);
    expect(
      subscriptionHasAccess("active", "2026-08-07T11:59:59.000Z", now),
    ).toBe(false);
  });

  it("fails closed when an active or trialing Pro subscription has no period end", () => {
    expect(subscriptionHasAccess("active", null, now)).toBe(false);
    expect(subscriptionHasAccess("trialing", null, now)).toBe(false);
  });

  it("fails closed for active or trialing Pro without a period end", () => {
    expect(subscriptionHasAccess("active", null, now)).toBe(false);
    expect(subscriptionHasAccess("trialing", null, now)).toBe(false);

    const subscription = resolveTeamSubscription(
      "team-a",
      {
        id: "sub-a",
        plan: "pro",
        status: "active",
        cancel_at_period_end: false,
        current_period_start: "2026-08-01T00:00:00.000Z",
        current_period_end: null,
      },
      now,
    );

    expect(subscription.plan).toBe("free");
    expect(hasEntitlement(subscription, "advanced_statistics")).toBe(false);
  });

  it("resolves the default Free plan without a stored subscription", () => {
    const subscription = resolveTeamSubscription("team-a", null, now);

    expect(subscription.plan).toBe("free");
    expect(subscription.source).toBe("default");
    expect(subscription.limits.maxPlayers).toBe(30);
    expect(subscription.entitlements).toEqual([]);
  });

  it("downgrades inactive or invalid Pro records to Free", () => {
    const subscription = resolveTeamSubscription(
      "team-a",
      {
        id: "sub-a",
        plan: "pro",
        status: "unpaid",
        cancel_at_period_end: false,
        current_period_start: null,
        current_period_end: null,
      },
      now,
    );

    expect(subscription.plan).toBe("free");
    expect(subscription.isActive).toBe(false);
    expect(hasEntitlement(subscription, "advanced_statistics")).toBe(false);
  });

  it("exposes all premium capabilities only for active Pro", () => {
    const subscription = resolveTeamSubscription(
      "team-a",
      {
        id: "sub-a",
        plan: "pro",
        status: "active",
        cancel_at_period_end: false,
        current_period_start: "2026-08-01T00:00:00.000Z",
        current_period_end: "2026-09-01T00:00:00.000Z",
      },
      now,
    );

    expect(subscription.plan).toBe("pro");
    expect(subscription.limits.maxPlayers).toBeNull();
    expect(hasEntitlement(subscription, "full_leaderboards")).toBe(true);
  });
});
