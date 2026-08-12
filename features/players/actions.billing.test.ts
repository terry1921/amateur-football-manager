import { beforeEach, describe, expect, it, vi } from "vitest";
import { appError } from "@/lib/errors/error-codes";
import { createPlayerAction } from "./actions";

const mocks = vi.hoisted(() => ({
  assertCanCreatePlayer: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
  getTeamAccess: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn() }));
vi.mock("@/features/teams/access", () => ({
  getTeamAccess: mocks.getTeamAccess,
}));
vi.mock("@/features/billing/entitlements", () => ({
  assertCanCreatePlayer: mocks.assertCanCreatePlayer,
}));

describe("createPlayerAction billing enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTeamAccess.mockResolvedValue({
      user: { id: "user-a" },
      team: { id: "team-a" },
      supabase: { from: mocks.from },
    });
    mocks.from.mockReturnValue({ select: mocks.select, insert: mocks.insert });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockResolvedValue({ count: 30, error: null });
    mocks.assertCanCreatePlayer.mockRejectedValue(
      appError({ code: "PLAN_LIMIT_REACHED", category: "authorization" }),
    );
  });

  it("does not insert player 31 when the server-side Free limit is reached", async () => {
    const formData = new FormData();
    formData.set("firstName", "Player");
    formData.set("position", "MID");
    formData.set("status", "active");

    await expect(
      createPlayerAction("en", { status: "idle" }, formData),
    ).resolves.toMatchObject({ status: "error" });

    expect(mocks.assertCanCreatePlayer).toHaveBeenCalledWith("team-a", 30);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
