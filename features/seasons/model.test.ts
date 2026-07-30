import { describe, expect, it } from "vitest";
import { canEditSeason, sortSeasons } from "./model";

const season = (
  id: string,
  status: "draft" | "active" | "completed",
  createdAt: string,
) => ({
  id,
  team_id: "team-a",
  name: id,
  start_date: "2026-01-01",
  end_date: "2026-06-30",
  status,
  created_at: createdAt,
  updated_at: createdAt,
});

describe("sortSeasons", () => {
  it("orders active, draft, and completed groups with newest records first", () => {
    const result = sortSeasons([
      season("completed-old", "completed", "2025-01-01T00:00:00Z"),
      season("draft-old", "draft", "2026-01-01T00:00:00Z"),
      season("active", "active", "2026-02-01T00:00:00Z"),
      season("completed-new", "completed", "2026-03-01T00:00:00Z"),
      season("draft-new", "draft", "2026-04-01T00:00:00Z"),
    ]);

    expect(result.map(({ id }) => id)).toEqual([
      "active",
      "draft-new",
      "draft-old",
      "completed-new",
      "completed-old",
    ]);
  });
});

describe("canEditSeason", () => {
  it("allows draft and unused active seasons but protects match history", () => {
    expect(canEditSeason("draft", 0)).toBe(true);
    expect(canEditSeason("active", 0)).toBe(true);
    expect(canEditSeason("active", 1)).toBe(false);
    expect(canEditSeason("completed", 0)).toBe(false);
  });
});
