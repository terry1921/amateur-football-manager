import type { Tables } from "@/types/database";

export type CurrentSeason = Pick<
  Tables<"seasons">,
  "id" | "team_id" | "name" | "status" | "start_date" | "end_date"
>;

type QueryError = { message: string };

type CurrentSeasonQuery = {
  eq: (field: string, value: string) => CurrentSeasonQuery;
  limit: (count: number) => CurrentSeasonQuery;
  maybeSingle: () => PromiseLike<{
    data: CurrentSeason | null;
    error: QueryError | null;
  }>;
};

export type CurrentSeasonClient = {
  from: (table: "seasons") => {
    select: (columns: string) => CurrentSeasonQuery;
  };
};

export async function resolveCurrentSeason({
  supabase,
  teamId,
}: {
  supabase: CurrentSeasonClient;
  teamId: string;
}): Promise<CurrentSeason | null> {
  const { data, error } = await supabase
    .from("seasons")
    .select("id, team_id, name, status, start_date, end_date")
    .eq("team_id", teamId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
