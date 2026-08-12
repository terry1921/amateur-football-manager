export type SubscriptionCheckoutInput = {
  teamId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
};

export type ProviderSubscription = {
  id: string;
  customerId: string | null;
  teamId: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
};

export type BillingProviderEvent =
  | {
      id: string;
      type:
        | "customer.subscription.created"
        | "customer.subscription.updated"
        | "customer.subscription.deleted";
      createdAt: string;
      subscription: ProviderSubscription;
    }
  | {
      id: string;
      type: "invoice.payment_failed";
      createdAt: string;
      subscriptionId: string | null;
    }
  | { id: string; type: string; createdAt: string };

export type BillingProvider = {
  createSubscriptionCheckout(
    input: SubscriptionCheckoutInput,
  ): Promise<{ url: string }>;
  verifyWebhook(
    rawBody: string,
    signature: string | null,
  ): Promise<BillingProviderEvent>;
};
