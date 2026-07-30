import { describe, expect, it } from "vitest";
import { slugCandidate, slugifyTeamName } from "./slug";

describe("team slug generation", () => {
  it("normalizes names into URL-safe slugs", () => {
    expect(slugifyTeamName("  Lóros F.C.  ")).toBe("loros-f-c");
  });

  it("falls back when the name has no Latin slug characters", () => {
    expect(slugifyTeamName("⚽⚽")).toBe("team");
  });

  it("adds deterministic collision suffixes", () => {
    expect(slugCandidate("loros-fc", 1)).toBe("loros-fc");
    expect(slugCandidate("loros-fc", 2)).toBe("loros-fc-2");
    expect(slugCandidate("loros-fc", 3)).toBe("loros-fc-3");
  });
});
