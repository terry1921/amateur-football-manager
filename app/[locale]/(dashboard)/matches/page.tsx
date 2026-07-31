import { getMatchesData } from "@/features/matches/data";
import { MatchManagement } from "@/features/matches/match-management";
import {
  matchGroupIds,
  matchLocations,
  matchStatuses,
  type MatchFilters,
} from "@/features/matches/model";

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ matches, seasons, truncated }, query] = await Promise.all([
    getMatchesData(),
    searchParams,
  ]);
  const status = value(query.status);
  const location = value(query.location);
  const group = value(query.group);
  const requestedSeason = value(query.season);
  const notice = value(query.notice);
  const initialFilters: MatchFilters = {
    search: value(query.search)?.trim() ?? "",
    season:
      requestedSeason && seasons.some(({ id }) => id === requestedSeason)
        ? requestedSeason
        : "all",
    status: matchStatuses.includes(status as (typeof matchStatuses)[number])
      ? (status as (typeof matchStatuses)[number])
      : "all",
    location: matchLocations.includes(
      location as (typeof matchLocations)[number],
    )
      ? (location as (typeof matchLocations)[number])
      : "all",
    group: matchGroupIds.includes(group as (typeof matchGroupIds)[number])
      ? (group as (typeof matchGroupIds)[number])
      : "all",
  };
  const safeNotice =
    notice === "created" ||
    notice === "updated" ||
    notice === "cancelled" ||
    notice === "deleted"
      ? notice
      : undefined;

  return (
    <MatchManagement
      matches={matches}
      seasons={seasons}
      initialFilters={initialFilters}
      notice={safeNotice}
      truncated={truncated}
    />
  );
}
