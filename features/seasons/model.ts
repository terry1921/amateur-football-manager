import type { Tables } from "@/types/database";

export type SeasonStatus = "draft" | "active" | "completed";
export type Season = Omit<Tables<"seasons">, "status"> & {
  status: SeasonStatus;
};

const statusOrder: Record<SeasonStatus, number> = {
  active: 0,
  draft: 1,
  completed: 2,
};

export function sortSeasons(seasons: Season[]) {
  return [...seasons].sort(
    (left, right) =>
      statusOrder[left.status] - statusOrder[right.status] ||
      right.created_at.localeCompare(left.created_at),
  );
}

export function canEditSeason(status: SeasonStatus, matchCount: number) {
  return status !== "completed" && matchCount === 0;
}
