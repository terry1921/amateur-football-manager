import { describe, expect, it } from "vitest";
import {
  entitlements,
  hasEntitlement,
  resolveTeamSubscription,
} from "@/features/billing/model";

const now = new Date("2026-08-12T12:00:00.000Z");

describe("billing entitlement security boundaries", () => {
  it("does not grant a Free team any Pro entitlement when called directly", () => {
    const subscription = resolveTeamSubscription("free-team", null, now);

    expect(subscription.plan).toBe("free");
    for (const entitlement of entitlements) {
      expect(hasEntitlement(subscription, entitlement)).toBe(false);
    }
  });

  it("does not trust a Pro plan value unless its subscription is active", () => {
    const subscription = resolveTeamSubscription(
      "tampered-plan-team",
      {
        id: "subscription-tampered-plan",
        plan: "pro",
        status: "past_due",
        cancel_at_period_end: false,
        current_period_start: "2026-08-01T00:00:00.000Z",
        current_period_end: "2026-09-01T00:00:00.000Z",
      },
      now,
    );

    expect(subscription.plan).toBe("free");
    expect(subscription.isActive).toBe(false);
    expect(hasEntitlement(subscription, "advanced_statistics")).toBe(false);
  });

  it("fails closed after expiry and after cancellation period end", () => {
    const expired = resolveTeamSubscription(
      "expired-team",
      {
        id: "subscription-expired",
        plan: "pro",
        status: "active",
        cancel_at_period_end: false,
        current_period_start: "2026-07-01T00:00:00.000Z",
        current_period_end: "2026-08-12T11:59:59.000Z",
      },
      now,
    );
    const canceled = resolveTeamSubscription(
      "canceled-team",
      {
        id: "subscription-canceled",
        plan: "pro",
        status: "canceled",
        cancel_at_period_end: true,
        current_period_start: "2026-07-01T00:00:00.000Z",
        current_period_end: "2026-08-12T11:59:59.000Z",
      },
      now,
    );

    expect(expired.plan).toBe("free");
    expect(canceled.plan).toBe("free");
    expect(hasEntitlement(expired, "full_leaderboards")).toBe(false);
    expect(hasEntitlement(canceled, "full_leaderboards")).toBe(false);
  });

  it("keeps cancellation active only during the already-paid period", () => {
    const subscription = resolveTeamSubscription(
      "cancellation-period-team",
      {
        id: "subscription-cancellation-period",
        plan: "pro",
        status: "canceled",
        cancel_at_period_end: true,
        current_period_start: "2026-08-01T00:00:00.000Z",
        current_period_end: "2026-08-13T00:00:00.000Z",
      },
      now,
    );

    expect(subscription.plan).toBe("pro");
    expect(subscription.isActive).toBe(true);
    expect(hasEntitlement(subscription, "full_leaderboards")).toBe(true);
  });
});
