import { describe, expect, it } from "vitest";
import { hydrateCallupPlayers, resolveCallupLastUpdated } from "./data";

const roster = [
  {
    id: "player-a",
    first_name: "Ana",
    last_name: "Keeper",
    nickname: null,
    shirt_number: 1,
    position: "GK",
    status: "active",
  },
  {
    id: "player-b",
    first_name: "Bea",
    last_name: "Forward",
    nickname: null,
    shirt_number: 9,
    position: "FWD",
    status: "injured",
  },
] as const;

describe("call-up data hydration", () => {
  it("joins one batched call-up result onto the team roster", () => {
    const result = hydrateCallupPlayers(
      [...roster],
      [
        {
          player_id: "player-b",
          status: "confirmed",
          updated_at: "2026-07-30T12:00:00.000Z",
        },
      ],
    );

    expect(result).toEqual([
      expect.objectContaining({
        id: "player-a",
        selected: false,
        callup_status: null,
      }),
      expect.objectContaining({
        id: "player-b",
        selected: true,
        callup_status: "confirmed",
      }),
    ]);
  });

  it("derives last updated without fabricating a timestamp for an empty call-up", () => {
    expect(resolveCallupLastUpdated([])).toBeNull();
    expect(
      resolveCallupLastUpdated([
        { updated_at: "2026-07-29T10:00:00.000Z" },
        { updated_at: "2026-07-30T10:00:00.000Z" },
      ]),
    ).toBe("2026-07-30T10:00:00.000Z");
  });
});
