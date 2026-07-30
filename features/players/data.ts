import { getTeamAccess } from "@/features/teams/access";
import { sortPlayers, type Player } from "./model";

async function requirePlayerTeam() {
  const context = await getTeamAccess();
  const team = context.team;
  if (!team) throw new Error("player_team_not_found");
  return { ...context, team };
}

const playerColumns =
  "id, team_id, first_name, last_name, nickname, shirt_number, position, photo_url, status, created_at, updated_at";

export async function getPlayersData() {
  const { supabase, team } = await requirePlayerTeam();
  const result = await supabase
    .from("players")
    .select(playerColumns)
    .eq("team_id", team.id);

  if (result.error) throw result.error;
  return { team, players: sortPlayers(result.data as Player[]) };
}

export async function getPlayerDetails(playerId: string) {
  const { supabase, team } = await requirePlayerTeam();
  const result = await supabase
    .from("players")
    .select(playerColumns)
    .eq("team_id", team.id)
    .eq("id", playerId)
    .maybeSingle();

  if (result.error) throw result.error;
  return result.data as Player | null;
}
