import { describe, expect, it } from "vitest";
import {
  filterPlayers,
  getPlayerDisplayName,
  getSquadSummary,
  sortPlayers,
  type Player,
} from "./model";

const player = (
  id: string,
  firstName: string,
  position: Player["position"],
  status: Player["status"],
  shirtNumber: number | null = null,
  lastName: string | null = null,
): Player => ({
  id,
  team_id: "team-a",
  first_name: firstName,
  last_name: lastName,
  nickname: null,
  shirt_number: shirtNumber,
  position,
  photo_url: null,
  status,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
});

const squad = [
  player("inactive", "Zoe", "GK", "inactive", 1),
  player("forward", "Andres", "FWD", "active", 11, "Vega"),
  player("mid", "Luis", "MID", "suspended", 8, "Ortega"),
  player("keeper", "Diego", "GK", "active", 1, "Ramirez"),
  player("defender", "Marco", "DEF", "injured", 4, "Silva"),
];

describe("player presentation", () => {
  it("builds a trimmed display name without inventing a last name", () => {
    expect(getPlayerDisplayName(squad[1])).toBe("Andres Vega");
    expect(getPlayerDisplayName(squad[0])).toBe("Zoe");
  });

  it("orders availability, position, shirt number, then name", () => {
    expect(sortPlayers(squad).map(({ id }) => id)).toEqual([
      "keeper",
      "forward",
      "defender",
      "mid",
      "inactive",
    ]);
  });

  it("searches case-insensitively by name, nickname, and exact shirt text", () => {
    expect(
      filterPlayers(squad, {
        search: "  RAMÍREZ ",
        position: "all",
        status: "all",
      }).map(({ id }) => id),
    ).toEqual(["keeper"]);
    expect(
      filterPlayers(squad, {
        search: "11",
        position: "all",
        status: "all",
      }).map(({ id }) => id),
    ).toEqual(["forward"]);
  });

  it("defaults current squad to every non-inactive status and composes filters", () => {
    expect(
      filterPlayers(squad, { search: "", position: "all", status: "current" }),
    ).toHaveLength(4);
    expect(
      filterPlayers(squad, {
        search: "",
        position: "DEF",
        status: "injured",
      }).map(({ id }) => id),
    ).toEqual(["defender"]);
  });

  it("summarizes active and unavailable players without losing inactive history", () => {
    expect(getSquadSummary(squad)).toEqual({
      total: 5,
      available: 2,
      unavailable: 3,
    });
  });
});
