import type {
  Player,
  PlayerPosition,
  PlayerStatus,
} from "@/features/players/model";
import {
  getPlayerDisplayName,
  playerPositions,
} from "@/features/players/model";
import type { Tables } from "@/types/database";

export const callupStatuses = ["called_up", "confirmed", "declined"] as const;
export type CallupStatus = (typeof callupStatuses)[number];

export type CallupMatch = Pick<
  Tables<"matches">,
  | "id"
  | "opponent_name"
  | "kickoff_at"
  | "home_away"
  | "status"
  | "venue"
  | "season_id"
> & { season_name: string };

export type CallupPlayer = Pick<
  Player,
  | "id"
  | "first_name"
  | "last_name"
  | "nickname"
  | "shirt_number"
  | "position"
  | "status"
> & {
  selected: boolean;
  callup_status: CallupStatus | null;
};

export type CallupPositionFilter = PlayerPosition | "all";
export type CallupStatusFilter = PlayerStatus | "all";
export type CallupSelectionFilter = "all" | "selected" | "unselected";
export type CallupFilters = {
  search: string;
  position: CallupPositionFilter;
  status: CallupStatusFilter;
  selection: CallupSelectionFilter;
};

export function isValidCallupSelection(
  selectedIds: string[],
  ownedPlayers: Array<{ id: string; status: string }>,
  existingPlayerIds: Set<string>,
) {
  const players = new Map(ownedPlayers.map((player) => [player.id, player]));
  return selectedIds.every((id) => {
    const player = players.get(id);
    return Boolean(
      player &&
      (player.status === ("active" satisfies PlayerStatus) ||
        existingPlayerIds.has(id)),
    );
  });
}

const positionOrder = new Map(
  playerPositions.map((position, index) => [position, index]),
);

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function sortCallupPlayers(players: CallupPlayer[]) {
  return [...players].sort(
    (left, right) =>
      (positionOrder.get(left.position) ?? Number.MAX_SAFE_INTEGER) -
        (positionOrder.get(right.position) ?? Number.MAX_SAFE_INTEGER) ||
      (left.shirt_number ?? Number.MAX_SAFE_INTEGER) -
        (right.shirt_number ?? Number.MAX_SAFE_INTEGER) ||
      getPlayerDisplayName(left).localeCompare(
        getPlayerDisplayName(right),
        undefined,
        {
          sensitivity: "base",
        },
      ) ||
      left.id.localeCompare(right.id),
  );
}

export function filterCallupPlayers(
  players: CallupPlayer[],
  filters: CallupFilters,
) {
  const search = normalizeSearch(filters.search);
  return players.filter((player) => {
    const searchable = normalizeSearch(
      [
        getPlayerDisplayName(player),
        player.nickname,
        player.shirt_number?.toString(),
      ]
        .filter(Boolean)
        .join(" "),
    );
    return (
      (!search || searchable.includes(search)) &&
      (filters.position === "all" || player.position === filters.position) &&
      (filters.status === "all" || player.status === filters.status) &&
      (filters.selection === "all" ||
        (filters.selection === "selected" ? player.selected : !player.selected))
    );
  });
}

export function selectAllActivePlayers(players: CallupPlayer[]) {
  return new Set(
    players
      .filter((player) => player.status === "active" || player.selected)
      .map(({ id }) => id),
  );
}

export function clearCallupSelection() {
  return new Set<string>();
}

export function groupSelectedPlayers(players: CallupPlayer[]) {
  const selected = sortCallupPlayers(
    players.filter((player) => player.selected),
  );
  return playerPositions.flatMap((position) => {
    const positionPlayers = selected.filter(
      (player) => player.position === position,
    );
    return positionPlayers.length
      ? [{ position, players: positionPlayers }]
      : [];
  });
}

export function isCallupEditable(match: Pick<CallupMatch, "status">) {
  return match.status === "scheduled";
}
