import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  BillingProvider,
  BillingProviderEvent,
  CustomerPortalInput,
  ProviderSubscription,
  SubscriptionManagementInput,
  SubscriptionCheckoutInput,
} from "./provider";

type StripeProviderConfig = {
  secretKey: string;
  webhookSecret: string;
  fetch?: typeof fetch;
};

type StripeWebhookEnvelope = {
  id?: unknown;
  type?: unknown;
  created?: unknown;
  data?: { object?: Record<string, unknown> };
};

function toIsoTimestamp(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) return null;
  return new Date(value * 1000).toISOString();
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseSignature(header: string | null) {
  if (!header) return null;
  const values = Object.fromEntries(
    header.split(",").map((entry) => {
      const [key, value] = entry.split("=", 2);
      return [key, value];
    }),
  );
  return values.t && values.v1
    ? { timestamp: values.t, digest: values.v1 }
    : null;
}

function hasValidSignature(
  rawBody: string,
  signature: string | null,
  webhookSecret: string,
) {
  const parsed = parseSignature(signature);
  if (
    !parsed ||
    !/^\d+$/.test(parsed.timestamp) ||
    !/^[a-f0-9]{64}$/i.test(parsed.digest)
  ) {
    return false;
  }
  const expected = createHmac("sha256", webhookSecret)
    .update(`${parsed.timestamp}.${rawBody}`)
    .digest();
  const received = Buffer.from(parsed.digest, "hex");
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}

function subscriptionFromStripe(
  object: Record<string, unknown>,
): ProviderSubscription {
  const metadata = object.metadata;
  const teamId =
    metadata && typeof metadata === "object"
      ? stringValue((metadata as Record<string, unknown>).team_id)
      : null;

  return {
    id: stringValue(object.id) ?? "",
    customerId: stringValue(object.customer),
    teamId,
    status: stringValue(object.status) ?? "incomplete",
    cancelAtPeriodEnd: object.cancel_at_period_end === true,
    currentPeriodStart: toIsoTimestamp(object.current_period_start),
    currentPeriodEnd: toIsoTimestamp(object.current_period_end),
  };
}

function parseStripeEvent(rawBody: string): BillingProviderEvent {
  const event = JSON.parse(rawBody) as StripeWebhookEnvelope;
  const id = stringValue(event.id);
  const type = stringValue(event.type);
  const createdAt = toIsoTimestamp(event.created);
  if (!id || !type || !createdAt)
    throw new Error("Invalid Stripe webhook payload");

  const object = event.data?.object ?? {};
  if (type.startsWith("customer.subscription.")) {
    const subscription = subscriptionFromStripe(object);
    if (!subscription.id)
      throw new Error("Invalid Stripe subscription payload");
    if (
      type === "customer.subscription.created" ||
      type === "customer.subscription.updated" ||
      type === "customer.subscription.deleted"
    ) {
      return { id, type, createdAt, subscription };
    }
  }

  if (type === "invoice.payment_failed") {
    return {
      id,
      type,
      createdAt,
      subscriptionId: stringValue(object.subscription),
    };
  }

  if (type === "checkout.session.completed") {
    return { id, type, createdAt };
  }

  return { id, type, createdAt };
}

async function createStripeCheckout(
  input: SubscriptionCheckoutInput,
  secretKey: string,
  request: typeof fetch,
) {
  const form = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": input.priceId,
    "line_items[0][quantity]": "1",
    client_reference_id: input.teamId,
    "metadata[team_id]": input.teamId,
    "subscription_data[metadata][team_id]": input.teamId,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });
  const response = await request(
    "https://api.stripe.com/v1/checkout/sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    },
  );
  if (!response.ok) throw new Error("Stripe checkout creation failed");
  const data = (await response.json()) as { url?: unknown };
  const url = stringValue(data.url);
  if (!url || new URL(url).protocol !== "https:") {
    throw new Error("Stripe checkout returned an invalid URL");
  }
  return { url };
}

async function createStripeCustomerPortalSession(
  input: CustomerPortalInput,
  secretKey: string,
  request: typeof fetch,
) {
  const form = new URLSearchParams({
    customer: input.customerId,
    return_url: input.returnUrl,
  });
  const response = await request(
    "https://api.stripe.com/v1/billing_portal/sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    },
  );
  if (!response.ok) throw new Error("Stripe customer portal creation failed");
  const data = (await response.json()) as { url?: unknown };
  const url = stringValue(data.url);
  if (!url || new URL(url).protocol !== "https:") {
    throw new Error("Stripe customer portal returned an invalid URL");
  }
  return { url };
}

async function updateStripeSubscriptionCancellation(
  input: SubscriptionManagementInput,
  cancelAtPeriodEnd: boolean,
  secretKey: string,
  request: typeof fetch,
) {
  const response = await request(
    `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(input.subscriptionId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        cancel_at_period_end: String(cancelAtPeriodEnd),
      }),
    },
  );
  if (!response.ok) throw new Error("Stripe subscription update failed");
}

export function createStripeBillingProvider(
  config: StripeProviderConfig,
): BillingProvider {
  const request = config.fetch ?? fetch;
  return {
    createSubscriptionCheckout: (input) =>
      createStripeCheckout(input, config.secretKey, request),
    createCustomerPortalSession: (input) =>
      createStripeCustomerPortalSession(input, config.secretKey, request),
    cancelSubscriptionAtPeriodEnd: (input) =>
      updateStripeSubscriptionCancellation(
        input,
        true,
        config.secretKey,
        request,
      ),
    resumeSubscription: (input) =>
      updateStripeSubscriptionCancellation(
        input,
        false,
        config.secretKey,
        request,
      ),
    async verifyWebhook(rawBody, signature) {
      if (!hasValidSignature(rawBody, signature, config.webhookSecret)) {
        throw new Error("Invalid Stripe webhook signature");
      }
      return parseStripeEvent(rawBody);
    },
  };
}
