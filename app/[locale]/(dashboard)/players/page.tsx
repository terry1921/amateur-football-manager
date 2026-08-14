import { getBillingConfig } from "@/features/billing/config";
import { getPlayersData } from "@/features/players/data";
import { PlayerManagement } from "@/features/players/player-management";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ team, players, playerLimit }, query] = await Promise.all([
    getPlayersData(),
    searchParams,
  ]);
  let checkoutAvailable = false;
  try {
    getBillingConfig();
    checkoutAvailable = true;
  } catch {
    checkoutAvailable = false;
  }
  const notice =
    query.notice === "created" ||
    query.notice === "updated" ||
    query.notice === "deactivated" ||
    query.notice === "reactivated"
      ? query.notice
      : undefined;
  return (
    <PlayerManagement
      players={players}
      notice={notice}
      playerLimit={playerLimit}
      teamId={team.id}
      checkoutAvailable={checkoutAvailable}
    />
  );
}
