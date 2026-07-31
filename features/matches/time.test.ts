import { describe, expect, it } from "vitest";
import { utcToFormValues, wallTimeToUtc } from "./time";

describe("match timezone conversion", () => {
  it("interprets a wall-clock kickoff in the submitted IANA timezone", () => {
    expect(
      wallTimeToUtc({
        date: "2026-08-10",
        time: "19:30",
        timeZone: "America/Mexico_City",
      }),
    ).toBe("2026-08-11T01:30:00.000Z");
  });

  it("accounts for daylight-saving changes in zones that observe them", () => {
    expect(
      wallTimeToUtc({
        date: "2026-01-15",
        time: "19:30",
        timeZone: "America/New_York",
      }),
    ).toBe("2026-01-16T00:30:00.000Z");
    expect(
      wallTimeToUtc({
        date: "2026-07-15",
        time: "19:30",
        timeZone: "America/New_York",
      }),
    ).toBe("2026-07-15T23:30:00.000Z");
  });

  it("rejects a nonexistent local time during the spring DST transition", () => {
    expect(
      wallTimeToUtc({
        date: "2026-03-08",
        time: "02:30",
        timeZone: "America/New_York",
      }),
    ).toBeNull();
  });

  it("round-trips stored UTC into local edit fields", () => {
    expect(
      utcToFormValues("2026-08-11T01:30:00.000Z", "America/Mexico_City"),
    ).toEqual({ date: "2026-08-10", time: "19:30" });
  });

  it("rejects invalid dates, times, and timezone identifiers", () => {
    expect(
      wallTimeToUtc({
        date: "2026-02-30",
        time: "19:30",
        timeZone: "America/Mexico_City",
      }),
    ).toBeNull();
    expect(
      wallTimeToUtc({
        date: "2026-08-10",
        time: "25:30",
        timeZone: "America/Mexico_City",
      }),
    ).toBeNull();
    expect(
      wallTimeToUtc({
        date: "2026-08-10",
        time: "19:30",
        timeZone: "Mars/Olympus",
      }),
    ).toBeNull();
  });
});
