import type { BillingProviderEvent, ProviderSubscription } from "./provider";
import type { ServerMonetizationAnalytics } from "@/lib/analytics/monetization";

export type StoredSubscription = {
  id: string;
  providerSubscriptionId: string;
  providerCustomerId: string | null;
  teamId: string;
  plan: "pro";
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  providerUpdatedAt: string | null;
};

export type BillingEventStore = {
  recordReceived(event: {
    id: string;
    type: string;
    createdAt: string;
    teamId: string | null;
  }): Promise<boolean>;
  findSubscription(
    providerSubscriptionId: string,
  ): Promise<StoredSubscription | null>;
  saveSubscription(
    subscription: StoredSubscription,
  ): Promise<StoredSubscription>;
  markProcessed(eventId: string, subscriptionId?: string): Promise<void>;
  markFailed(eventId: string, errorCode: string): Promise<void>;
  invalidateTeam(teamId: string): Promise<void>;
};

function subscriptionSnapshot(
  source: ProviderSubscription,
  existing: StoredSubscription | null,
  createdAt: string,
): StoredSubscription {
  if (!source.teamId && !existing) throw new Error("billing_team_missing");
  return {
    id: existing?.id ?? "",
    providerSubscriptionId: source.id,
    providerCustomerId: source.customerId,
    teamId: source.teamId ?? existing!.teamId,
    plan: "pro",
    status: source.status,
    cancelAtPeriodEnd: source.cancelAtPeriodEnd,
    currentPeriodStart: source.currentPeriodStart,
    currentPeriodEnd: source.currentPeriodEnd,
    providerUpdatedAt: createdAt,
  };
}

function isOlderEvent(existing: StoredSubscription, createdAt: string) {
  return Boolean(
    existing.providerUpdatedAt &&
    Date.parse(existing.providerUpdatedAt) >= Date.parse(createdAt),
  );
}

export async function processBillingEvent(
  store: BillingEventStore,
  event: BillingProviderEvent,
  analytics?: ServerMonetizationAnalytics,
) {
  const teamId = "subscription" in event ? event.subscription.teamId : null;
  if (
    !(await store.recordReceived({
      id: event.id,
      type: event.type,
      createdAt: event.createdAt,
      teamId,
    }))
  ) {
    return { kind: "duplicate" as const };
  }

  try {
    if ("subscription" in event) {
      const existing = await store.findSubscription(event.subscription.id);
      if (existing && isOlderEvent(existing, event.createdAt)) {
        await store.markProcessed(event.id, existing.id);
        return { kind: "stale" as const };
      }
      const saved = await store.saveSubscription(
        subscriptionSnapshot(event.subscription, existing, event.createdAt),
      );
      await store.markProcessed(event.id, saved.id);
      await store.invalidateTeam(saved.teamId);
      if (!existing && ["active", "trialing"].includes(saved.status)) {
        await analytics?.track({
          name: "pro_activated",
          properties: { plan: "pro" },
        });
      }
      return { kind: "processed" as const };
    }

    if (
      event.type === "invoice.payment_failed" &&
      "subscriptionId" in event &&
      event.subscriptionId
    ) {
      const existing = await store.findSubscription(event.subscriptionId);
      if (existing && !isOlderEvent(existing, event.createdAt)) {
        const saved = await store.saveSubscription({
          ...existing,
          status: "past_due",
          providerUpdatedAt: event.createdAt,
        });
        await store.markProcessed(event.id, saved.id);
        await store.invalidateTeam(saved.teamId);
        return { kind: "processed" as const };
      }
    }

    await store.markProcessed(event.id);
    if (event.type === "checkout.session.completed") {
      await analytics?.track({
        name: "checkout_completed",
        properties: { plan: "pro" },
      });
    }
    return { kind: "processed" as const };
  } catch (error) {
    const errorCode =
      error instanceof Error
        ? error.message.slice(0, 80)
        : "billing_processing_failed";
    await store.markFailed(event.id, errorCode);
    throw error;
  }
}
