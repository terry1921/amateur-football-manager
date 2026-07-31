import { describe, expect, it } from "vitest";
import { orientResultScore } from "./model";

describe("result score orientation", () => {
  it("keeps home entries team-first for home and neutral fixtures", () => {
    expect(orientResultScore({ homeScore: 2, awayScore: 0 }, "home")).toEqual({
      homeScore: 2,
      awayScore: 0,
      teamScore: 2,
      opponentScore: 0,
    });
    expect(
      orientResultScore({ homeScore: 2, awayScore: 0 }, "neutral"),
    ).toEqual({
      homeScore: 2,
      awayScore: 0,
      teamScore: 2,
      opponentScore: 0,
    });
  });

  it("reverses the stored scores for an away fixture", () => {
    expect(orientResultScore({ homeScore: 2, awayScore: 0 }, "away")).toEqual({
      homeScore: 2,
      awayScore: 0,
      teamScore: 0,
      opponentScore: 2,
    });
  });
});
