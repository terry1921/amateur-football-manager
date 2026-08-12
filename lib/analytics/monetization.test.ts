import { describe, expect, it } from "vitest";
import {
  createClientMonetizationAnalytics,
  createServerMonetizationAnalytics,
  normalizeMonetizationEvent,
} from "./monetization";

const occurredAt = new Date("2026-08-12T12:00:00.000Z");

describe("monetization analytics", () => {
  it.each([
    "premium_intent",
    "pricing_view",
    "upgrade_click",
    "checkout_started",
    "checkout_completed",
    "pro_activated",
    "cancellation",
  ])("accepts the allowlisted %s event", (name) => {
    expect(normalizeMonetizationEvent({ name }, occurredAt)).toEqual({
      name,
      occurredAt: "2026-08-12T12:00:00.000Z",
      properties: {},
    });
  });

  it("drops sensitive and unknown checkout fields while normalizing safe values", () => {
    expect(
      normalizeMonetizationEvent(
        {
          name: "checkout_completed",
          properties: {
            plan: " PRO ",
            interval: "ANNUAL",
            providerPayload: { card: "4111 1111 1111 1111" },
            customerId: "cus_123",
            subscriptionId: "sub_123",
            email: "owner@example.com",
            secret: "provider-secret",
            coupon: "private-code",
          },
        },
        occurredAt,
      ),
    ).toEqual({
      name: "checkout_completed",
      occurredAt: "2026-08-12T12:00:00.000Z",
      properties: { plan: "pro", interval: "annual" },
    });
  });

  it("rejects unknown events before they reach an analytics sink", () => {
    expect(
      normalizeMonetizationEvent(
        { name: "payment_provider_payload" },
        occurredAt,
      ),
    ).toBeNull();
  });

  it("exposes separate client and server trackers with safe event boundaries", () => {
    const captured: unknown[] = [];
    const sink = {
      capture: (event: unknown) => {
        captured.push(event);
      },
    };
    const client = createClientMonetizationAnalytics(sink, () => occurredAt);
    const server = createServerMonetizationAnalytics(sink, () => occurredAt);

    client.track({
      name: "pricing_view",
      properties: { surface: "in_app" },
    });
    server.track({ name: "pro_activated", properties: { plan: "pro" } });
    client.track({ name: "pro_activated" } as never);

    expect(captured).toEqual([
      {
        name: "pricing_view",
        occurredAt: "2026-08-12T12:00:00.000Z",
        properties: { surface: "in_app" },
      },
      {
        name: "pro_activated",
        occurredAt: "2026-08-12T12:00:00.000Z",
        properties: { plan: "pro" },
      },
    ]);
  });
});
