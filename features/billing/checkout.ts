import type { BillingProvider } from "./provider";

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
}: {
  teamId: string;
  userId: string;
  store: CheckoutStore;
  provider: Pick<BillingProvider, "createSubscriptionCheckout">;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
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

  return { kind: "redirect" as const, url: checkout.url };
}
