import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStatisticsData } from "./data";

const mocks = vi.hoisted(() => ({
  assertEntitlement: vi.fn(),
  assertHistoricalSeasonAccess: vi.fn(),
  getTeamAccess: vi.fn(),
}));

vi.mock("@/features/billing/entitlements", () => ({
  assertEntitlement: mocks.assertEntitlement,
  assertHistoricalSeasonAccess: mocks.assertHistoricalSeasonAccess,
}));

vi.mock("@/features/teams/access", () => ({
  getTeamAccess: mocks.getTeamAccess,
}));

function createSupabase() {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    rpc: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockResolvedValue({
    data: [
      {
        id: "season-current",
        name: "Current",
        status: "active",
        start_date: null,
        end_date: null,
      },
    ],
    error: null,
  });
  query.rpc.mockResolvedValue({
    data: { has_completed_matches: false, team: {}, players: [] },
    error: null,
  });
  return { from: vi.fn(() => query), ...query };
}

describe("statistics server data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertEntitlement.mockResolvedValue({});
    mocks.assertHistoricalSeasonAccess.mockResolvedValue({});
    mocks.getTeamAccess.mockResolvedValue({
      team: { id: "team-1", name: "Loros" },
      supabase: createSupabase(),
    });
  });

  it("requires the advanced-statistics entitlement before loading statistics", async () => {
    await getStatisticsData("current", { requireAdvancedStatistics: true });

    expect(mocks.assertEntitlement).toHaveBeenCalledWith(
      "team-1",
      "advanced_statistics",
    );
  });
});
