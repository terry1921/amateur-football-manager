import type { Tables } from "@/types/database";

export const playerPositions = ["GK", "DEF", "MID", "FWD"] as const;
export const playerStatuses = [
  "active",
  "injured",
  "suspended",
  "inactive",
] as const;

export type PlayerPosition = (typeof playerPositions)[number];
export type PlayerStatus = (typeof playerStatuses)[number];
export type Player = Omit<Tables<"players">, "position" | "status"> & {
  position: PlayerPosition;
  status: PlayerStatus;
};
export type PlayerPositionFilter = PlayerPosition | "all";
export type PlayerStatusFilter = PlayerStatus | "current" | "all";
export type PlayerFilters = {
  search: string;
  position: PlayerPositionFilter;
  status: PlayerStatusFilter;
};

const statusOrder: Record<PlayerStatus, number> = {
  active: 0,
  injured: 1,
  suspended: 2,
  inactive: 3,
};

const positionOrder: Record<PlayerPosition, number> = {
  GK: 0,
  DEF: 1,
  MID: 2,
  FWD: 3,
};

export function getPlayerDisplayName(
  player: Pick<Player, "first_name" | "last_name">,
) {
  return [player.first_name, player.last_name].filter(Boolean).join(" ").trim();
}

export function sortPlayers(players: Player[]) {
  return [...players].sort(
    (left, right) =>
      statusOrder[left.status] - statusOrder[right.status] ||
      positionOrder[left.position] - positionOrder[right.position] ||
      (left.shirt_number ?? Number.MAX_SAFE_INTEGER) -
        (right.shirt_number ?? Number.MAX_SAFE_INTEGER) ||
      getPlayerDisplayName(left).localeCompare(
        getPlayerDisplayName(right),
        undefined,
        { sensitivity: "base" },
      ),
  );
}

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function filterPlayers(players: Player[], filters: PlayerFilters) {
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
    const matchesSearch = !search || searchable.includes(search);
    const matchesPosition =
      filters.position === "all" || player.position === filters.position;
    const matchesStatus =
      filters.status === "all" ||
      (filters.status === "current"
        ? player.status !== "inactive"
        : player.status === filters.status);
    return matchesSearch && matchesPosition && matchesStatus;
  });
}

export function getSquadSummary(players: Player[]) {
  const available = players.filter(({ status }) => status === "active").length;
  return {
    total: players.length,
    available,
    unavailable: players.length - available,
  };
}
