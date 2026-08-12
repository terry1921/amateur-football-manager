import { describe, expect, it } from "vitest";
import {
  processBillingEvent,
  type BillingEventStore,
  type StoredSubscription,
} from "./webhooks";

const teamId = "11111111-1111-4111-8111-111111111111";

class MemoryStore implements BillingEventStore {
  readonly eventIds = new Set<string>();
  readonly subscriptions = new Map<string, StoredSubscription>();
  invalidatedTeamIds: string[] = [];

  async recordReceived(event: {
    id: string;
    type: string;
    createdAt: string;
    teamId: string | null;
  }) {
    if (this.eventIds.has(event.id)) return false;
    this.eventIds.add(event.id);
    return true;
  }

  async findSubscription(providerSubscriptionId: string) {
    return this.subscriptions.get(providerSubscriptionId) ?? null;
  }

  async saveSubscription(subscription: StoredSubscription) {
    this.subscriptions.set(subscription.providerSubscriptionId, subscription);
    return subscription;
  }

  async markProcessed() {}
  async markFailed() {}

  async invalidateTeam(team: string) {
    this.invalidatedTeamIds.push(team);
  }
}

const activeSubscription = {
  id: "evt_subscription_active",
  type: "customer.subscription.updated" as const,
  createdAt: "2026-08-10T12:00:00.000Z",
  subscription: {
    id: "sub_provider_1",
    customerId: "cus_provider_1",
    teamId,
    status: "active",
    cancelAtPeriodEnd: false,
    currentPeriodStart: "2026-08-10T00:00:00.000Z",
    currentPeriodEnd: "2026-09-10T00:00:00.000Z",
  },
};

describe("billing webhook processing", () => {
  it("records a duplicate event once and does not repeat its subscription side effect", async () => {
    const store = new MemoryStore();

    await expect(
      processBillingEvent(store, activeSubscription),
    ).resolves.toEqual({
      kind: "processed",
    });
    await expect(
      processBillingEvent(store, activeSubscription),
    ).resolves.toEqual({
      kind: "duplicate",
    });

    expect(store.subscriptions.get("sub_provider_1")).toMatchObject({
      plan: "pro",
      status: "active",
      teamId,
    });
    expect(store.invalidatedTeamIds).toEqual([teamId]);
  });

  it("ignores a delayed subscription event that predates local provider state", async () => {
    const store = new MemoryStore();
    await store.saveSubscription({
      id: "local-subscription",
      providerSubscriptionId: "sub_provider_1",
      providerCustomerId: "cus_provider_1",
      teamId,
      plan: "pro",
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodStart: "2026-08-10T00:00:00.000Z",
      currentPeriodEnd: "2026-09-10T00:00:00.000Z",
      providerUpdatedAt: "2026-08-11T12:00:00.000Z",
    });

    const result = await processBillingEvent(store, {
      ...activeSubscription,
      id: "evt_delayed_cancel",
      createdAt: "2026-08-10T12:00:00.000Z",
      subscription: { ...activeSubscription.subscription, status: "canceled" },
    });

    expect(result).toEqual({ kind: "stale" });
    expect(store.subscriptions.get("sub_provider_1")?.status).toBe("active");
    expect(store.invalidatedTeamIds).toEqual([]);
  });

  it("marks the matching subscription past due on a payment failure", async () => {
    const store = new MemoryStore();
    await store.saveSubscription({
      id: "local-subscription",
      providerSubscriptionId: "sub_provider_1",
      providerCustomerId: "cus_provider_1",
      teamId,
      plan: "pro",
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodStart: "2026-08-10T00:00:00.000Z",
      currentPeriodEnd: "2026-09-10T00:00:00.000Z",
      providerUpdatedAt: "2026-08-10T12:00:00.000Z",
    });

    await expect(
      processBillingEvent(store, {
        id: "evt_payment_failed",
        type: "invoice.payment_failed",
        createdAt: "2026-08-12T12:00:00.000Z",
        subscriptionId: "sub_provider_1",
      }),
    ).resolves.toEqual({ kind: "processed" });

    expect(store.subscriptions.get("sub_provider_1")?.status).toBe("past_due");
    expect(store.invalidatedTeamIds).toEqual([teamId]);
  });
});
