import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createStripeBillingProvider } from "./stripe-provider";

const webhookSecret = "whsec_test_only";
const payload = JSON.stringify({
  id: "evt_1",
  type: "customer.subscription.created",
  created: 1_786_385_600,
  data: {
    object: {
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      metadata: { team_id: "11111111-1111-4111-8111-111111111111" },
      cancel_at_period_end: false,
      current_period_start: 1_786_385_600,
      current_period_end: 1_789_063_200,
    },
  },
});

function signature(body: string, timestamp = 1_786_385_600) {
  const digest = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

describe("Stripe billing provider", () => {
  it("creates a customer portal session with the server-provided customer id", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const provider = createStripeBillingProvider({
      secretKey: "sk_test_only",
      webhookSecret,
      fetch: async (url, init) => {
        requests.push({ url: String(url), init });
        return new Response(
          JSON.stringify({ url: "https://billing.stripe.com/session" }),
        );
      },
    });

    await expect(
      provider.createCustomerPortalSession({
        customerId: "cus_from_database",
        returnUrl: "https://app.example/settings/billing",
      }),
    ).resolves.toEqual({ url: "https://billing.stripe.com/session" });

    expect(requests).toEqual([
      {
        url: "https://api.stripe.com/v1/billing_portal/sessions",
        init: expect.objectContaining({
          method: "POST",
          body: expect.any(URLSearchParams),
        }),
      },
    ]);
  });

  it("schedules cancellation or resumes using the provider subscription id", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const provider = createStripeBillingProvider({
      secretKey: "sk_test_only",
      webhookSecret,
      fetch: async (url, init) => {
        requests.push({ url: String(url), init });
        return new Response(JSON.stringify({}));
      },
    });

    await provider.cancelSubscriptionAtPeriodEnd({
      subscriptionId: "sub_from_database",
    });
    await provider.resumeSubscription({ subscriptionId: "sub_from_database" });

    expect(requests).toEqual([
      {
        url: "https://api.stripe.com/v1/subscriptions/sub_from_database",
        init: expect.objectContaining({
          method: "POST",
          body: expect.any(URLSearchParams),
        }),
      },
      {
        url: "https://api.stripe.com/v1/subscriptions/sub_from_database",
        init: expect.objectContaining({
          method: "POST",
          body: expect.any(URLSearchParams),
        }),
      },
    ]);
    expect(
      new URLSearchParams(requests[0].init?.body as string).toString(),
    ).toBe("cancel_at_period_end=true");
    expect(
      new URLSearchParams(requests[1].init?.body as string).toString(),
    ).toBe("cancel_at_period_end=false");
  });

  it("accepts only a valid signed payload and extracts subscription state", async () => {
    const provider = createStripeBillingProvider({
      secretKey: "sk_test_only",
      webhookSecret,
      fetch: async () => new Response(),
    });

    await expect(
      provider.verifyWebhook(payload, signature(payload)),
    ).resolves.toEqual({
      id: "evt_1",
      type: "customer.subscription.created",
      createdAt: "2026-08-10T18:13:20.000Z",
      subscription: {
        id: "sub_1",
        customerId: "cus_1",
        teamId: "11111111-1111-4111-8111-111111111111",
        status: "active",
        cancelAtPeriodEnd: false,
        currentPeriodStart: "2026-08-10T18:13:20.000Z",
        currentPeriodEnd: "2026-09-10T18:00:00.000Z",
      },
    });
  });

  it("rejects an invalid webhook signature before parsing the payload", async () => {
    const provider = createStripeBillingProvider({
      secretKey: "sk_test_only",
      webhookSecret,
      fetch: async () => new Response(),
    });

    await expect(
      provider.verifyWebhook(payload, "t=1786385600,v1=invalid"),
    ).rejects.toThrow("Invalid Stripe webhook signature");
  });
});
