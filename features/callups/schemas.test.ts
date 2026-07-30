import { describe, expect, it } from "vitest";
import { callupInputFromFormData, callupSelectionSchema } from "./schemas";

const playerA = "10000000-0000-4000-8000-000000000001";
const playerB = "10000000-0000-4000-8000-000000000002";

describe("call-up selection validation", () => {
  it("accepts an empty squad and a list of unique UUIDs", () => {
    expect(callupSelectionSchema.parse({ playerIds: [] })).toEqual({
      playerIds: [],
    });
    expect(
      callupSelectionSchema.parse({ playerIds: [playerA, playerB] }),
    ).toEqual({ playerIds: [playerA, playerB] });
  });

  it("rejects invalid and duplicate player IDs", () => {
    expect(
      callupSelectionSchema.safeParse({ playerIds: ["not-a-uuid"] }).success,
    ).toBe(false);
    expect(
      callupSelectionSchema.safeParse({ playerIds: [playerA, playerA] })
        .success,
    ).toBe(false);
  });

  it("reads repeated player IDs from form data", () => {
    const formData = new FormData();
    formData.append("playerIds", playerA);
    formData.append("playerIds", playerB);

    expect(callupInputFromFormData(formData)).toEqual({
      playerIds: [playerA, playerB],
    });
  });
});
