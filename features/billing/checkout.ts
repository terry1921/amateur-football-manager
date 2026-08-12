import type { BillingProvider } from "./provider";
import type { ServerMonetizationAnalytics } from "@/lib/analytics/monetization";

export type CheckoutStore = {
  isTeamOwnedByUser(teamId: string, userId: string): Promise<boolean>;
};

export async function createCheckoutForAuthenticatedTeam({
  teamId,
  userId,
  store,
  provider,
  priceId,
  successUrl,
  cancelUrl,
  analytics,
}: {
  teamId: string;
  userId: string;
  store: CheckoutStore;
  provider: Pick<BillingProvider, "createSubscriptionCheckout">;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  analytics?: ServerMonetizationAnalytics;
}) {
  if (!(await store.isTeamOwnedByUser(teamId, userId))) {
    return { kind: "forbidden" as const };
  }

  const checkout = await provider.createSubscriptionCheckout({
    teamId,
    priceId,
    successUrl,
    cancelUrl,
  });
  await analytics?.track({
    name: "checkout_started",
    properties: { plan: "pro" },
  });

  return { kind: "redirect" as const, url: checkout.url };
}
