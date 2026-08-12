import { describe, expect, it, vi } from "vitest";
import { createBillingEventStore } from "./server-store";
import {
  processBillingEvent,
  type BillingEventStore,
  type StoredSubscription,
} from "./webhooks";

const createAdminClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}));

const teamId = "11111111-1111-4111-8111-111111111111";

class MemoryStore implements BillingEventStore {
  readonly eventStates = new Map<
    string,
    "processing" | "processed" | "failed"
  >();
  readonly subscriptions = new Map<string, StoredSubscription>();
  invalidatedTeamIds: string[] = [];
  failNextSubscriptionSave = false;

  async recordReceived(event: {
    id: string;
    type: string;
    createdAt: string;
    teamId: string | null;
  }) {
    const state = this.eventStates.get(event.id);
    if (state === "processed" || state === "processing") return false;
    this.eventStates.set(event.id, "processing");
    return true;
  }

  async findSubscription(providerSubscriptionId: string) {
    return this.subscriptions.get(providerSubscriptionId) ?? null;
  }

  async saveSubscription(subscription: StoredSubscription) {
    if (this.failNextSubscriptionSave) {
      this.failNextSubscriptionSave = false;
      throw new Error("temporary_subscription_write_failure");
    }
    this.subscriptions.set(subscription.providerSubscriptionId, subscription);
    return subscription;
  }

  async markProcessed(eventId: string) {
    this.eventStates.set(eventId, "processed");
  }

  async markFailed(eventId: string) {
    this.eventStates.set(eventId, "failed");
  }

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
  it("does not repeat the subscription side effect for an already processed event", async () => {
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

  it("reprocesses an event after its first processing attempt fails", async () => {
    const store = new MemoryStore();
    store.failNextSubscriptionSave = true;

    await expect(
      processBillingEvent(store, activeSubscription),
    ).rejects.toThrow("temporary_subscription_write_failure");
    await expect(
      processBillingEvent(store, activeSubscription),
    ).resolves.toEqual({ kind: "processed" });

    expect(store.subscriptions.get("sub_provider_1")?.status).toBe("active");
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

describe("billing webhook event storage", () => {
  it("reclaims a failed event id for a retry", async () => {
    const retryQuery = {
      eq: () => retryQuery,
      is: () => retryQuery,
      not: () => retryQuery,
      select: () => retryQuery,
      maybeSingle: async () => ({ data: { id: "event-row" }, error: null }),
    };
    createAdminClientMock.mockReturnValue({
      from: () => ({
        insert: async () => ({ error: { code: "23505" } }),
        update: () => retryQuery,
      }),
    });

    await expect(
      createBillingEventStore().recordReceived({
        id: activeSubscription.id,
        type: activeSubscription.type,
        createdAt: activeSubscription.createdAt,
        teamId,
      }),
    ).resolves.toBe(true);
  });

  it("keeps an already processed event id as a duplicate", async () => {
    const retryQuery = {
      eq: () => retryQuery,
      is: () => retryQuery,
      not: () => retryQuery,
      select: () => retryQuery,
      maybeSingle: async () => ({ data: null, error: null }),
    };
    createAdminClientMock.mockReturnValue({
      from: () => ({
        insert: async () => ({ error: { code: "23505" } }),
        update: () => retryQuery,
      }),
    });

    await expect(
      createBillingEventStore().recordReceived({
        id: activeSubscription.id,
        type: activeSubscription.type,
        createdAt: activeSubscription.createdAt,
        teamId,
      }),
    ).resolves.toBe(false);
  });
});
