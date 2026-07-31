import { describe, expect, it } from "vitest";
import { replaceOwnedCallup, type CallupRpcClient } from "./actions";
import { isValidCallupSelection } from "./model";

const active = "10000000-0000-4000-8000-000000000001";
const injuredExisting = "10000000-0000-4000-8000-000000000002";
const injuredNew = "10000000-0000-4000-8000-000000000003";
const foreign = "10000000-0000-4000-8000-000000000004";

describe("call-up mutation boundary", () => {
  it("accepts active players and retained unavailable selections", () => {
    expect(
      isValidCallupSelection(
        [active, injuredExisting],
        [
          { id: active, status: "active" },
          { id: injuredExisting, status: "injured" },
        ],
        new Set([injuredExisting]),
      ),
    ).toBe(true);
  });

  it("rejects newly unavailable, missing, and foreign player IDs", () => {
    const ownedPlayers = [
      { id: active, status: "active" },
      { id: injuredNew, status: "injured" },
    ];

    expect(isValidCallupSelection([injuredNew], ownedPlayers, new Set())).toBe(
      false,
    );
    expect(isValidCallupSelection([foreign], ownedPlayers, new Set())).toBe(
      false,
    );
  });

  it("passes only the match and validated player IDs to the atomic RPC", async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const client = {
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        return { error: null };
      },
    } as unknown as CallupRpcClient;

    await replaceOwnedCallup(client, "match-a", [active, injuredExisting]);

    expect(calls).toEqual([
      {
        name: "replace_match_callup",
        args: {
          target_match_id: "match-a",
          selected_player_ids: [active, injuredExisting],
        },
      },
    ]);
  });
});
