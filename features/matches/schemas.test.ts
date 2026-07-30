import { describe, expect, it } from "vitest";
import {
  MAX_MATCH_NOTES_LENGTH,
  MAX_OPPONENT_NAME_LENGTH,
  MAX_VENUE_LENGTH,
  matchSchema,
} from "./schemas";

const validInput = {
  seasonId: "10000000-0000-4000-8000-000000000001",
  opponentName: "Verona FC",
  date: "2026-08-10",
  time: "19:30",
  timeZone: "America/Mexico_City",
  location: "home",
  venue: "",
  notes: "",
};

describe("matchSchema", () => {
  it.each(["", "   "])("rejects an empty opponent name", (opponentName) => {
    expect(matchSchema.safeParse({ ...validInput, opponentName }).success).toBe(
      false,
    );
  });

  it("rejects opponent, venue, and notes values beyond their limits", () => {
    expect(
      matchSchema.safeParse({
        ...validInput,
        opponentName: "a".repeat(MAX_OPPONENT_NAME_LENGTH + 1),
      }).success,
    ).toBe(false);
    expect(
      matchSchema.safeParse({
        ...validInput,
        venue: "a".repeat(MAX_VENUE_LENGTH + 1),
      }).success,
    ).toBe(false);
    expect(
      matchSchema.safeParse({
        ...validInput,
        notes: "a".repeat(MAX_MATCH_NOTES_LENGTH + 1),
      }).success,
    ).toBe(false);
  });

  it.each([
    ["seasonId", ""],
    ["seasonId", "not-a-uuid"],
    ["date", "2026-02-30"],
    ["date", ""],
    ["time", "24:00"],
    ["time", ""],
    ["timeZone", "Mars/Olympus"],
    ["location", "postponed"],
  ])("rejects an invalid %s", (field, value) => {
    expect(
      matchSchema.safeParse({ ...validInput, [field]: value }).success,
    ).toBe(false);
  });

  it("trims text, normalizes optional values, and allows past dates", () => {
    const result = matchSchema.parse({
      ...validInput,
      opponentName: "  Verona FC  ",
      date: "2024-01-10",
      venue: "  Campo Central  ",
      notes: "  Bring alternate shirts.  ",
    });

    expect(result).toMatchObject({
      opponentName: "Verona FC",
      venue: "Campo Central",
      notes: "Bring alternate shirts.",
      date: "2024-01-10",
    });
  });

  it("normalizes omitted optional venue and notes to null", () => {
    const result = matchSchema.parse(validInput);
    expect(result.venue).toBeNull();
    expect(result.notes).toBeNull();
  });
});
