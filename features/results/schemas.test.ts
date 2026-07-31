import { describe, expect, it } from "vitest";
import { resultSchema, resultSubmissionSchema } from "./schemas";

describe("resultSchema", () => {
  it("accepts non-negative integer scores and returns numbers", () => {
    expect(resultSchema.parse({ homeScore: "2", awayScore: "0" })).toEqual({
      homeScore: 2,
      awayScore: 0,
    });
  });

  it.each(["", "-1", "1.5", "1e2", "abc", "2147483648"])(
    "rejects invalid score %s",
    (score) => {
      expect(
        resultSchema.safeParse({ homeScore: score, awayScore: "0" }).success,
      ).toBe(false);
    },
  );

  it("accepts normalized goal and card payloads with timeline metadata", () => {
    expect(
      resultSubmissionSchema.parse({
        homeScore: "2",
        awayScore: "1",
        events: JSON.stringify([
          {
            type: "goal",
            playerId: "10000000-0000-4000-8000-000000000001",
            minute: 12,
            stoppageTime: 2,
            notes: "Header",
          },
          {
            type: "yellow_card",
            playerId: "10000000-0000-4000-8000-000000000002",
            minute: 80,
          },
        ]),
      }).events,
    ).toHaveLength(2);
  });

  it("rejects missing minutes", () => {
    expect(
      resultSubmissionSchema.safeParse({
        homeScore: "1",
        awayScore: "0",
        events: JSON.stringify([
          {
            type: "goal",
            playerId: "10000000-0000-4000-8000-000000000001",
          },
        ]),
      }).success,
    ).toBe(false);
  });
});
