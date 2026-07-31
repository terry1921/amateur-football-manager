import { describe, expect, it } from "vitest";
import {
  clearCallupSelection,
  filterCallupPlayers,
  groupSelectedPlayers,
  selectAllActivePlayers,
  sortCallupPlayers,
  type CallupPlayer,
} from "./model";

function player(
  id: string,
  overrides: Partial<CallupPlayer> = {},
): CallupPlayer {
  return {
    id,
    first_name: id,
    last_name: null,
    nickname: null,
    shirt_number: null,
    position: "MID",
    status: "active",
    selected: false,
    callup_status: null,
    ...overrides,
  };
}

const squad = [
  player("mid-10", { first_name: "Álvaro", shirt_number: 10 }),
  player("gk-13", { first_name: "Bruno", position: "GK", shirt_number: 13 }),
  player("def-2", { first_name: "Carlos", position: "DEF", shirt_number: 2 }),
  player("fwd-9", { first_name: "Diego", position: "FWD", shirt_number: 9 }),
  player("mid-7", { first_name: "Esteban", shirt_number: 7 }),
  player("mid-none", { first_name: "Aaron", shirt_number: null }),
];

describe("call-up player domain", () => {
  it("sorts by position, shirt number, then name", () => {
    expect(sortCallupPlayers(squad).map(({ id }) => id)).toEqual([
      "gk-13",
      "def-2",
      "mid-7",
      "mid-10",
      "mid-none",
      "fwd-9",
    ]);
  });

  it("searches accent-insensitive names and exact shirt-number text", () => {
    expect(
      filterCallupPlayers(squad, {
        search: "alvaro",
        position: "all",
        status: "all",
        selection: "all",
      }).map(({ id }) => id),
    ).toEqual(["mid-10"]);
    expect(
      filterCallupPlayers(squad, {
        search: "13",
        position: "all",
        status: "all",
        selection: "all",
      }).map(({ id }) => id),
    ).toEqual(["gk-13"]);
  });

  it("composes position, availability, and selection filters", () => {
    const players = [
      player("selected-active", { position: "DEF", selected: true }),
      player("unselected-active", { position: "DEF" }),
      player("selected-injured", {
        position: "DEF",
        status: "injured",
        selected: true,
      }),
    ];

    expect(
      filterCallupPlayers(players, {
        search: "",
        position: "DEF",
        status: "active",
        selection: "selected",
      }).map(({ id }) => id),
    ).toEqual(["selected-active"]);
  });

  it("selects every active player while retaining historical unavailable selections", () => {
    const selected = selectAllActivePlayers([
      player("active"),
      player("injured-selected", { status: "injured", selected: true }),
      player("inactive", { status: "inactive" }),
    ]);

    expect([...selected].sort()).toEqual(["active", "injured-selected"]);
  });

  it("clears all selections, including unavailable historical selections", () => {
    expect(clearCallupSelection().size).toBe(0);
  });

  it("groups selected players in football position order", () => {
    const grouped = groupSelectedPlayers([
      player("forward", { position: "FWD", selected: true }),
      player("keeper", { position: "GK", selected: true }),
      player("not-selected", { position: "DEF" }),
    ]);

    expect(
      grouped.map(({ position, players }) => [position, players[0].id]),
    ).toEqual([
      ["GK", "keeper"],
      ["FWD", "forward"],
    ]);
  });
});
