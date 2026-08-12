import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { expectRlsDenied } from "./setup/assertions";
import { createSecurityTestContext, securityUuid } from "./setup/fixtures";
import type { SecurityTestContext } from "./setup/types";

describe("billing RLS through Supabase JS", () => {
  let context: SecurityTestContext;
  let subscriptionAId: string;

  beforeAll(async () => {
    context = await createSecurityTestContext("billing");
    subscriptionAId = securityUuid(context.namespace, "subscription-a");

    const created = await context.adminSetupClient
      .from("subscriptions")
      .insert({
        id: subscriptionAId,
        team_id: context.ids.teamA,
        plan: "pro",
        status: "active",
        provider: "security-test-provider",
        provider_subscription_id: `subscription-${context.namespace}`,
      });

    expect(created.error).toBeNull();
  });

  afterAll(async () => {
    await context.cleanup();
  });

  it("hides a foreign team's paid subscription even when its UUID is known", async () => {
    const result = await context.userBClient
      .from("subscriptions")
      .select("id, team_id, plan")
      .eq("id", subscriptionAId);

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it("rejects browser attempts to upgrade or alter a plan directly", async () => {
    const insert = await context.userCClient.from("subscriptions").insert({
      team_id: context.ids.teamB,
      plan: "pro",
      status: "active",
    });
    const update = await context.userAClient
      .from("subscriptions")
      .update({ plan: "free" })
      .eq("id", subscriptionAId);

    expectRlsDenied(insert);
    expectRlsDenied(update);
  });

  it("rejects direct changes to a subscription even for its owning team", async () => {
    const result = await context.userAClient
      .from("subscriptions")
      .update({ status: "canceled", cancel_at_period_end: true })
      .eq("id", subscriptionAId)
      .select("id");

    expectRlsDenied(result);
  });

  it("rejects forged billing events and makes provider event IDs replay-safe", async () => {
    const forged = await context.userAClient.from("billing_events").insert({
      provider: "security-test-provider",
      provider_event_id: `forged-${context.namespace}`,
      event_type: "customer.subscription.updated",
      team_id: context.ids.teamA,
      subscription_id: subscriptionAId,
    });

    expectRlsDenied(forged);

    const eventId = `provider-event-${context.namespace}`;
    const recorded = await context.adminSetupClient
      .from("billing_events")
      .insert({
        provider: "security-test-provider",
        provider_event_id: eventId,
        event_type: "customer.subscription.updated",
        team_id: context.ids.teamA,
        subscription_id: subscriptionAId,
      });
    const replay = await context.adminSetupClient
      .from("billing_events")
      .insert({
        provider: "security-test-provider",
        provider_event_id: eventId,
        event_type: "customer.subscription.updated",
        team_id: context.ids.teamA,
        subscription_id: subscriptionAId,
      });

    expect(recorded.error).toBeNull();
    expect(replay.data).toBeNull();
    expect(replay.error?.code).toBe("23505");
  });

  it("does not permit a subscriber to delete their billing record", async () => {
    const result = await context.userAClient
      .from("subscriptions")
      .delete()
      .eq("id", subscriptionAId)
      .select("id");

    expectRlsDenied(result);
  });
});
