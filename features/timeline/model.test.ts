import { describe, expect, it } from "vitest";
import {
  filterTimelineEvents,
  formatFootballMinute,
  getGroupedEvents,
  getTimelineSummary,
  sortEvents,
  type TimelineEvent,
} from "./model";

function event(overrides: Partial<TimelineEvent>): TimelineEvent {
  return {
    id: "event-a",
    playerId: "player-a",
    type: "goal",
    minute: 45,
    stoppageTime: 0,
    createdAt: "2026-08-01T12:00:00.000Z",
    playerName: "Marco Guerrero",
    playerShirtNumber: 9,
    ...overrides,
  };
}

describe("match timeline model", () => {
  it("formats football minutes with added time", () => {
    expect(formatFootballMinute(45)).toBe("45'");
    expect(formatFootballMinute(45, 2)).toBe("45+2'");
    expect(formatFootballMinute(90, 5)).toBe("90+5'");
  });

  it("sorts by minute, added time, then creation order", () => {
    const events = [
      event({ id: "late", minute: 90, stoppageTime: 5 }),
      event({ id: "first", minute: 45, createdAt: "2026-08-01T12:00:01.000Z" }),
      event({ id: "second", minute: 45, stoppageTime: 2 }),
      event({ id: "early", minute: 45, createdAt: "2026-08-01T11:59:59.000Z" }),
    ];

    expect(sortEvents(events).map(({ id }) => id)).toEqual([
      "early",
      "first",
      "second",
      "late",
    ]);
  });

  it("groups, filters, and summarizes without changing event order", () => {
    const events = [
      event({
        id: "yellow",
        type: "yellow_card",
        playerId: "player-b",
        playerName: "Luis Soto",
        minute: 20,
      }),
      event({
        id: "goal-2",
        playerId: "player-a",
        playerName: "Marco Guerrero",
        minute: 70,
      }),
      event({
        id: "goal-1",
        playerId: "player-a",
        playerName: "Marco Guerrero",
        minute: 10,
      }),
      event({
        id: "red",
        type: "red_card",
        playerId: "player-b",
        playerName: "Luis Soto",
        minute: 80,
      }),
    ];

    const groups = getGroupedEvents(events);
    expect(groups.goals.map(({ id }) => id)).toEqual(["goal-1", "goal-2"]);
    expect(
      filterTimelineEvents(events, "goal", "marco").map(({ id }) => id),
    ).toEqual(["goal-1", "goal-2"]);
    expect(getTimelineSummary(events)).toMatchObject({
      goals: 2,
      yellowCards: 1,
      redCards: 1,
    });
    expect(getTimelineSummary(events).goalsByPlayer).toEqual([
      { playerId: "player-a", playerName: "Marco Guerrero", count: 2 },
    ]);
  });
});
