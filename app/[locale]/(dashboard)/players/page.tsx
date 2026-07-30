import { getPlayersData } from "@/features/players/data";
import { PlayerManagement } from "@/features/players/player-management";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ players }, query] = await Promise.all([
    getPlayersData(),
    searchParams,
  ]);
  const notice =
    query.notice === "created" ||
    query.notice === "updated" ||
    query.notice === "deactivated" ||
    query.notice === "reactivated"
      ? query.notice
      : undefined;
  return <PlayerManagement players={players} notice={notice} />;
}
