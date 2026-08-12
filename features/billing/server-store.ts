import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BillingEventStore, StoredSubscription } from "./webhooks";

const provider = "stripe";

export type BillingManagementSubscription = {
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
};

function billingCacheTag(teamId: string) {
  return `billing:team:${teamId}`;
}

function toStoredSubscription(row: {
  id: string;
  provider_subscription_id: string | null;
  provider_customer_id: string | null;
  team_id: string;
  plan: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  provider_updated_at: string | null;
}): StoredSubscription {
  if (!row.provider_subscription_id)
    throw new Error("billing_subscription_missing_provider_id");
  return {
    id: row.id,
    providerSubscriptionId: row.provider_subscription_id,
    providerCustomerId: row.provider_customer_id,
    teamId: row.team_id,
    plan: "pro",
    status: row.status,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    providerUpdatedAt: row.provider_updated_at,
  };
}

export function createBillingEventStore(): BillingEventStore {
  const supabase = createAdminClient();
  return {
    async recordReceived(event) {
      const { error } = await supabase.from("billing_events").insert({
        provider,
        provider_event_id: event.id,
        event_type: event.type,
        team_id: event.teamId,
        // Reconciliation metadata belongs in typed columns; never retain raw
        // provider payloads, signature headers, or sensitive customer data.
        payload: {},
      });
      if (!error) return true;
      if (error.code === "23505") return false;
      throw error;
    },
    async findSubscription(providerSubscriptionId) {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(
          "id, provider_subscription_id, provider_customer_id, team_id, plan, status, cancel_at_period_end, current_period_start, current_period_end, provider_updated_at",
        )
        .eq("provider", provider)
        .eq("provider_subscription_id", providerSubscriptionId)
        .maybeSingle();
      if (error) throw error;
      return data ? toStoredSubscription(data) : null;
    },
    async saveSubscription(subscription) {
      const row = {
        team_id: subscription.teamId,
        plan: subscription.plan,
        status: subscription.status,
        provider,
        provider_customer_id: subscription.providerCustomerId,
        provider_subscription_id: subscription.providerSubscriptionId,
        cancel_at_period_end: subscription.cancelAtPeriodEnd,
        current_period_start: subscription.currentPeriodStart,
        current_period_end: subscription.currentPeriodEnd,
        provider_updated_at: subscription.providerUpdatedAt,
      };
      if (subscription.id) {
        const { data, error } = await supabase
          .from("subscriptions")
          .update(row)
          .eq("id", subscription.id)
          .select(
            "id, provider_subscription_id, provider_customer_id, team_id, plan, status, cancel_at_period_end, current_period_start, current_period_end, provider_updated_at",
          )
          .single();
        if (error) throw error;
        return toStoredSubscription(data);
      }
      const { data: existing, error: lookupError } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("team_id", subscription.teamId)
        .maybeSingle();
      if (lookupError) throw lookupError;
      const mutation = existing
        ? supabase.from("subscriptions").update(row).eq("id", existing.id)
        : supabase.from("subscriptions").insert(row);
      const { data, error } = await mutation
        .select(
          "id, provider_subscription_id, provider_customer_id, team_id, plan, status, cancel_at_period_end, current_period_start, current_period_end, provider_updated_at",
        )
        .single();
      if (error) throw error;
      return toStoredSubscription(data);
    },
    async markProcessed(eventId, subscriptionId) {
      const { error } = await supabase
        .from("billing_events")
        .update({
          processed_at: new Date().toISOString(),
          subscription_id: subscriptionId ?? null,
        })
        .eq("provider", provider)
        .eq("provider_event_id", eventId);
      if (error) throw error;
    },
    async markFailed(eventId, errorCode) {
      const { error } = await supabase
        .from("billing_events")
        .update({ processing_error: errorCode })
        .eq("provider", provider)
        .eq("provider_event_id", eventId);
      if (error) throw error;
    },
    async invalidateTeam(teamId) {
      revalidateTag(billingCacheTag(teamId), "max");
      revalidatePath("/", "layout");
    },
  };
}

export function createBillingManagementStore() {
  const supabase = createAdminClient();
  return {
    async findSubscriptionForOwnedTeam(
      teamId: string,
      userId: string,
    ): Promise<BillingManagementSubscription | null> {
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("id")
        .eq("id", teamId)
        .eq("owner_id", userId)
        .maybeSingle();
      if (teamError) throw teamError;
      if (!team) return null;

      const { data, error } = await supabase
        .from("subscriptions")
        .select(
          "provider_customer_id, provider_subscription_id, cancel_at_period_end",
        )
        .eq("team_id", teamId)
        .eq("provider", provider)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        providerCustomerId: data.provider_customer_id,
        providerSubscriptionId: data.provider_subscription_id,
        cancelAtPeriodEnd: data.cancel_at_period_end,
      };
    },
  };
}
