import { describe, expect, it } from "vitest";
import {
  createCheckoutForAuthenticatedTeam,
  type CheckoutStore,
} from "./checkout";

const teamId = "11111111-1111-4111-8111-111111111111";
const otherTeamId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";

function storeWithOwnedTeam(ownedTeamIds: string[]): CheckoutStore {
  return {
    isTeamOwnedByUser: async (candidateTeamId, candidateUserId) =>
      candidateUserId === userId && ownedTeamIds.includes(candidateTeamId),
  };
}

describe("checkout creation", () => {
  it("rejects a checkout request for another team's id", async () => {
    const result = await createCheckoutForAuthenticatedTeam({
      teamId: otherTeamId,
      userId,
      store: storeWithOwnedTeam([teamId]),
      provider: {
        createSubscriptionCheckout: async () => {
          throw new Error("provider must not be called for an unowned team");
        },
      },
      priceId: "price_server_pro",
      successUrl: "https://app.example/billing/success",
      cancelUrl: "https://app.example/billing/cancel",
    });

    expect(result).toEqual({ kind: "forbidden" });
  });

  it("uses the server-configured price and binds checkout to the owned team", async () => {
    const result = await createCheckoutForAuthenticatedTeam({
      teamId,
      userId,
      store: storeWithOwnedTeam([teamId]),
      // A caller could send arbitrary JSON fields, but this server boundary
      // intentionally accepts only teamId and never exposes a price parameter.
      provider: {
        createSubscriptionCheckout: async (input) => {
          expect(input).toEqual({
            teamId,
            priceId: "price_server_pro",
            successUrl: "https://app.example/billing/success",
            cancelUrl: "https://app.example/billing/cancel",
          });
          return { url: "https://checkout.provider.example/session" };
        },
      },
      priceId: "price_server_pro",
      successUrl: "https://app.example/billing/success",
      cancelUrl: "https://app.example/billing/cancel",
    });

    expect(result).toEqual({
      kind: "redirect",
      url: "https://checkout.provider.example/session",
    });
  });
});
