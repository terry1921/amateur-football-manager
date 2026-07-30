import { describe, expect, it } from "vitest";
import {
  MAX_SEASON_NAME_LENGTH,
  seasonInputFromFormData,
  seasonSchema,
} from "./schemas";

describe("seasonSchema", () => {
  it("trims a valid season and preserves its ISO date range", () => {
    const result = seasonSchema.parse({
      name: "  Apertura 2026  ",
      startDate: "2026-01-10",
      endDate: "2026-06-30",
    });

    expect(result).toEqual({
      name: "Apertura 2026",
      startDate: "2026-01-10",
      endDate: "2026-06-30",
    });
  });

  it.each([
    [
      { name: "", startDate: "2026-01-10", endDate: "2026-06-30" },
      "name",
      "required",
    ],
    [
      {
        name: "A".repeat(MAX_SEASON_NAME_LENGTH + 1),
        startDate: "2026-01-10",
        endDate: "2026-06-30",
      },
      "name",
      "tooLong",
    ],
    [
      { name: "Apertura", startDate: "", endDate: "2026-06-30" },
      "startDate",
      "required",
    ],
    [
      { name: "Apertura", startDate: "2026-01-10", endDate: "" },
      "endDate",
      "required",
    ],
    [
      { name: "Apertura", startDate: "2026-07-01", endDate: "2026-06-30" },
      "endDate",
      "endBeforeStart",
    ],
  ])("rejects invalid season input %#", (input, field, message) => {
    const result = seasonSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: [field], message }),
      ]),
    );
  });
});

describe("seasonInputFromFormData", () => {
  it("accepts only editable season fields from the browser", () => {
    const formData = new FormData();
    formData.set("name", "Clausura 2026");
    formData.set("startDate", "2026-07-12");
    formData.set("endDate", "2026-12-20");
    formData.set("teamId", "forged-team");
    formData.set("status", "active");

    expect(seasonInputFromFormData(formData)).toEqual({
      name: "Clausura 2026",
      startDate: "2026-07-12",
      endDate: "2026-12-20",
    });
  });
});
