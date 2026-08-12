import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertEntitlement } from "./entitlements";
import { getTeamSubscription } from "./data";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
  maybeSingle: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/errors/map-backend-error", () => ({
  mapBackendError: (error: unknown) => error,
}));

function setSubscriptionResult(data: unknown, error: unknown = null) {
  mocks.maybeSingle.mockResolvedValue({ data, error });
}

describe("team subscription resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ from: mocks.from });
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  });

  it("returns the default Free subscription when no row exists", async () => {
    setSubscriptionResult(null);

    const subscription = await getTeamSubscription("team-free");

    expect(subscription.plan).toBe("free");
    expect(subscription.source).toBe("default");
    expect(subscription.limits.maxPlayers).toBe(30);
    expect(mocks.eq).toHaveBeenCalledWith("team_id", "team-free");
  });

  it("resolves the stored Pro subscription without trusting client plan input", async () => {
    setSubscriptionResult({
      id: "subscription-pro",
      plan: "pro",
      status: "active",
      cancel_at_period_end: false,
      current_period_start: "2026-08-01T00:00:00.000Z",
      current_period_end: "2026-09-01T00:00:00.000Z",
    });

    const subscription = await getTeamSubscription("team-pro");

    expect(subscription.plan).toBe("pro");
    expect(subscription.source).toBe("subscription");
    expect(subscription.entitlements).toContain("advanced_statistics");
  });

  it("rejects a premium entitlement for a Free team on the server", async () => {
    setSubscriptionResult(null);

    await expect(
      assertEntitlement("team-free-gate", "full_leaderboards"),
    ).rejects.toMatchObject({
      code: "ENTITLEMENT_REQUIRED",
      category: "authorization",
    });
  });
});
