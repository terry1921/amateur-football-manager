import { describe, expect, it, vi } from "vitest";
import { completeOwnedMatch, type ResultMutationClient } from "./actions";

function mutationClient(
  data: {
    match_id: string;
    status: "completed";
    team_score: number;
    opponent_score: number;
    event_count: number;
  } | null,
): {
  client: ResultMutationClient;
  calls: Array<{ name: string; args: Record<string, unknown> }>;
} {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  return {
    client: {
      rpc: vi.fn(async (name, args) => {
        calls.push({ name, args });
        return { data, error: null };
      }),
    },
    calls,
  };
}

describe("completeOwnedMatch", () => {
  it("sends scores and normalized events through one transaction RPC", async () => {
    const setup = mutationClient({
      match_id: "match-a",
      status: "completed",
      team_score: 2,
      opponent_score: 1,
      event_count: 3,
    });

    await expect(
      completeOwnedMatch(
        setup.client,
        "match-a",
        { teamScore: 2, opponentScore: 1 },
        [
          { type: "goal", playerId: "player-a", minute: 12 },
          { type: "goal", playerId: "player-b", minute: 78 },
          { type: "yellow_card", playerId: "player-a", minute: 80 },
        ],
      ),
    ).resolves.toEqual({
      match_id: "match-a",
      status: "completed",
      team_score: 2,
      opponent_score: 1,
      event_count: 3,
    });

    expect(setup.calls).toEqual([
      {
        name: "complete_match_with_events",
        args: {
          target_match_id: "match-a",
          final_team_score: 2,
          final_opponent_score: 1,
          event_rows: [
            { type: "goal", player_id: "player-a", minute: 12 },
            { type: "goal", player_id: "player-b", minute: 78 },
            { type: "yellow_card", player_id: "player-a", minute: 80 },
          ],
        },
      },
    ]);
  });

  it("returns no completion when the transaction returns no row", async () => {
    const setup = mutationClient(null);
    await expect(
      completeOwnedMatch(
        setup.client,
        "match-a",
        { teamScore: 0, opponentScore: 0 },
        [],
      ),
    ).resolves.toBeNull();
  });
});
