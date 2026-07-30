"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isMatchId } from "@/features/matches/model";
import { getTeamAccess } from "@/features/teams/access";
import type { AppLocale } from "@/i18n/routing";
import { isValidCallupSelection } from "./model";
import { callupInputFromFormData, callupSelectionSchema } from "./schemas";
import type { CallupActionState } from "./state";

type DatabaseError = { code?: string; message?: string };

export type CallupRpcClient = {
  rpc: (
    name: "replace_match_callup",
    args: {
      target_match_id: string;
      selected_player_ids: string[];
    },
  ) => PromiseLike<{ error: DatabaseError | null }>;
};

export async function replaceOwnedCallup(
  client: CallupRpcClient,
  matchId: string,
  playerIds: string[],
) {
  const result = await client.rpc("replace_match_callup", {
    target_match_id: matchId,
    selected_player_ids: playerIds,
  });
  if (result.error) throw result.error;
}

function refreshCallupViews(locale: AppLocale, matchId: string) {
  revalidatePath(`/${locale}/matches/${matchId}`);
  revalidatePath(`/${locale}/matches/${matchId}/call-up`);
  revalidatePath(`/${locale}/matches`);
  revalidatePath(`/${locale}/dashboard`);
}

async function errorState(
  locale: AppLocale,
  key:
    | "sessionExpired"
    | "invalidSelection"
    | "notFound"
    | "readOnly"
    | "unexpected",
): Promise<CallupActionState> {
  const t = await getTranslations({ locale, namespace: "Callups.errors" });
  return { status: "error", message: t(key) };
}

export async function saveCallupAction(
  locale: AppLocale,
  matchId: string,
  _previousState: CallupActionState,
  formData: FormData,
): Promise<CallupActionState> {
  void _previousState;
  if (!isMatchId(matchId)) return errorState(locale, "notFound");

  const parsed = callupSelectionSchema.safeParse(
    callupInputFromFormData(formData),
  );
  if (!parsed.success) return errorState(locale, "invalidSelection");

  const context = await getTeamAccess();
  if (!context.user || !context.team)
    return errorState(locale, "sessionExpired");

  const matchResult = await context.supabase
    .from("matches")
    .select("id, status")
    .eq("team_id", context.team.id)
    .eq("id", matchId)
    .maybeSingle();
  if (matchResult.error) return errorState(locale, "unexpected");
  if (!matchResult.data) return errorState(locale, "notFound");
  if (matchResult.data.status !== "scheduled") {
    return errorState(locale, "readOnly");
  }

  const [playersResult, existingResult] = await Promise.all([
    parsed.data.playerIds.length
      ? context.supabase
          .from("players")
          .select("id, status")
          .eq("team_id", context.team.id)
          .in("id", parsed.data.playerIds)
      : Promise.resolve({ data: [], error: null }),
    context.supabase
      .from("callups")
      .select("player_id")
      .eq("team_id", context.team.id)
      .eq("match_id", matchId),
  ]);
  if (playersResult.error || existingResult.error) {
    return errorState(locale, "unexpected");
  }

  if (
    !isValidCallupSelection(
      parsed.data.playerIds,
      playersResult.data,
      new Set(existingResult.data.map(({ player_id }) => player_id)),
    )
  ) {
    return errorState(locale, "invalidSelection");
  }

  try {
    await replaceOwnedCallup(
      context.supabase as unknown as CallupRpcClient,
      matchId,
      parsed.data.playerIds,
    );
  } catch (error) {
    const code = (error as DatabaseError).code;
    if (code === "P0002") return errorState(locale, "notFound");
    if (code === "55000") return errorState(locale, "readOnly");
    if (code === "22023" || code === "23503") {
      return errorState(locale, "invalidSelection");
    }
    return errorState(locale, "unexpected");
  }

  refreshCallupViews(locale, matchId);
  redirect(`/${locale}/matches/${matchId}/call-up?notice=saved`);
}
